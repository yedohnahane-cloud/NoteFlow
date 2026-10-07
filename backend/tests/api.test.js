const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../server");
const db = require("../database/database");

let server;
let baseUrl;
let testToken = "";
let testUserId = null;
let testNoteId = null;
let testTagId = null;

const uniqueEmail = `test_${Date.now()}@noteflow.test`;

function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const reqOptions = {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        };

        const req = http.request(url, reqOptions, (res) => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    json = data;
                }
                resolve({ status: res.statusCode, body: json });
            });
        });

        req.on("error", reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

describe("NoteFlow Backend Test Suite", () => {
    before((t, done) => {
        // Démarre le serveur sur un port aléatoire
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            done();
        });
    });

    after((t, done) => {
        // Nettoyage de l'utilisateur de test
        if (testUserId) {
            try {
                db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
            } catch (e) {}
        }
        server.close(done);
    });

    test("1. GET /api/health doit renvoyer un statut 200 et ok", async () => {
        const res = await makeRequest("/api/health");
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "ok");
    });

    test("2. Inscription avec mot de passe court (< 6 chars) doit renvoyer 400", async () => {
        const res = await makeRequest("/api/auth/register", {
            method: "POST",
            body: { name: "Test User", email: uniqueEmail, password: "123" }
        });
        assert.strictEqual(res.status, 400);
    });

    test("3. Inscription valide doit créer l'utilisateur et renvoyer un token JWT", async () => {
        const res = await makeRequest("/api/auth/register", {
            method: "POST",
            body: { name: "Ingénieur Test", email: uniqueEmail, password: "secretPassword123" }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.body.token);
        assert.strictEqual(res.body.user.email, uniqueEmail);
        testToken = res.body.token;
        testUserId = res.body.user.id;
    });

    test("4. Inscription avec le même email doit renvoyer 409 Conflict", async () => {
        const res = await makeRequest("/api/auth/register", {
            method: "POST",
            body: { name: "Autre", email: uniqueEmail, password: "anotherPassword" }
        });
        assert.strictEqual(res.status, 409);
    });

    test("5. Connexion avec mot de passe erroné doit renvoyer 401", async () => {
        const res = await makeRequest("/api/auth/login", {
            method: "POST",
            body: { email: uniqueEmail, password: "wrongpassword" }
        });
        assert.strictEqual(res.status, 401);
    });

    test("6. Connexion valide doit renvoyer 200 et un nouveau token", async () => {
        const res = await makeRequest("/api/auth/login", {
            method: "POST",
            body: { email: uniqueEmail, password: "secretPassword123" }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.token);
    });

    test("7. GET /api/notes sans token doit renvoyer 401 Unauthorized", async () => {
        const res = await makeRequest("/api/notes");
        assert.strictEqual(res.status, 401);
    });

    test("8. Création d'une note avec token valide", async () => {
        const res = await makeRequest("/api/notes", {
            method: "POST",
            headers: { Authorization: `Bearer ${testToken}` },
            body: {
                title: "Introduction aux Microservices",
                content: "Les microservices permettent une architecture distribuée, modulaire et hautement disponible.",
                category: "Architecture"
            }
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.body.id);
        testNoteId = res.body.id;
    });

    test("9. Modification d'une note et vérification de la sauvegarde d'historique", async () => {
        const res = await makeRequest(`/api/notes/${testNoteId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${testToken}` },
            body: {
                title: "Architecture Microservices Avancée",
                content: "Version modifiée avec détails sur Docker, Kubernetes et API Gateways.",
                category: "Architecture"
            }
        });
        assert.strictEqual(res.status, 200);

        // Vérification de la création d'une version
        const versionsRes = await makeRequest(`/api/notes/${testNoteId}/versions`, {
            headers: { Authorization: `Bearer ${testToken}` }
        });
        assert.strictEqual(versionsRes.status, 200);
        assert.ok(versionsRes.body.length >= 1);
        assert.strictEqual(versionsRes.body[0].title, "Introduction aux Microservices");
    });

    test("10. Ajout d'un tag et association à la note", async () => {
        const tagRes = await makeRequest("/api/tags", {
            method: "POST",
            headers: { Authorization: `Bearer ${testToken}` },
            body: { name: "Docker", color: "#3b82f6" }
        });
        assert.strictEqual(tagRes.status, 201);
        testTagId = tagRes.body.tag.id;

        const updateRes = await makeRequest(`/api/notes/${testNoteId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${testToken}` },
            body: {
                tags: [testTagId]
            }
        });
        assert.strictEqual(updateRes.status, 200);
    });

    test("11. Recherche de notes par mot-clé", async () => {
        const res = await makeRequest("/api/notes?search=Kubernetes", {
            headers: { Authorization: `Bearer ${testToken}` }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.length >= 1);
    });

    test("12. Knowledge Graph API renvoie les nœuds correctement", async () => {
        const res = await makeRequest("/api/graph", {
            headers: { Authorization: `Bearer ${testToken}` }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.nodes));
        assert.ok(Array.isArray(res.body.links));
    });

    test("13. AI Service génère un résumé et un quiz de révision", async () => {
        const sumRes = await makeRequest("/api/ai/summarize", {
            method: "POST",
            headers: { Authorization: `Bearer ${testToken}` },
            body: {
                title: "Architecture Microservices",
                content: "Les microservices découpent une application monolithique en services indépendants. Chaque service communique via des API REST ou gRPC."
            }
        });
        assert.strictEqual(sumRes.status, 200);
        assert.ok(sumRes.body.summary);

        const quizRes = await makeRequest("/api/ai/quiz", {
            method: "POST",
            headers: { Authorization: `Bearer ${testToken}` },
            body: {
                title: "Architecture Microservices",
                content: "Les microservices découpent une application monolithique en services indépendants."
            }
        });
        assert.strictEqual(quizRes.status, 200);
        assert.ok(quizRes.body.questions.length > 0);
    });

    test("14. Suppression de la note", async () => {
        const res = await makeRequest(`/api/notes/${testNoteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${testToken}` }
        });
        assert.strictEqual(res.status, 200);
    });
});
