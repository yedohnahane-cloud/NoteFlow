const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/database");
const { authMiddleware, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Inscription
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Tous les champs (nom, email, mot de passe) sont obligatoires."
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({
                message: "Format d'adresse email invalide."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Le mot de passe doit comporter au moins 6 caractères."
            });
        }

        const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(trimmedEmail);
        if (existingUser) {
            return res.status(409).json({
                message: "Cette adresse email est déjà associée à un compte."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `).run(name.trim(), trimmedEmail, hashedPassword);

        const newUser = {
            id: Number(result.lastInsertRowid),
            name: name.trim(),
            email: trimmedEmail
        };

        const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: "7d" });

        // Création de tags par défaut pour démarrer agréablement
        const defaultTags = [
            { name: "Projet", color: "#6366f1" },
            { name: "Idées", color: "#ec4899" },
            { name: "Révision", color: "#10b981" },
            { name: "Personnel", color: "#f59e0b" }
        ];
        const insertTag = db.prepare("INSERT OR IGNORE INTO tags (user_id, name, color) VALUES (?, ?, ?)");
        defaultTags.forEach(t => insertTag.run(newUser.id, t.name, t.color));

        // Création d'une note de bienvenue
        const welcomeContent = `# Bienvenue sur NoteFlow ! 🚀\n\nNoteFlow est votre second cerveau pour gérer vos notes, structurer vos idées et explorer vos connaissances.\n\n### 💡 Fonctionnalités clés :\n- **Organisation intelligente** : Tags, catégories et favoris.\n- **Knowledge Graph** : Reliez vos notes entre elles pour visualiser vos réseaux d'idées.\n- **Smart Notes / IA** : Résumez, générez des quiz et obtenez des suggestions automatiques.\n- **Focus Mode** : Travaillez sans distraction.\n- **Historique** : Chaque modification conserve une trace de vos versions précédentes.`;
        db.prepare(`
            INSERT INTO notes (user_id, title, content, category, is_pinned)
            VALUES (?, ?, ?, ?, 1)
        `).run(newUser.id, "Bienvenue sur NoteFlow 🌟", welcomeContent, "Guide");

        return res.status(201).json({
            message: "Compte créé avec succès.",
            token,
            user: newUser
        });
    } catch (error) {
        console.error("Erreur register:", error);
        return res.status(500).json({
            message: "Une erreur interne est survenue lors de l'inscription."
        });
    }
});

// Connexion
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email et mot de passe obligatoires."
            });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(trimmedEmail);

        if (!user) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect."
            });
        }

        const passwordCorrect = await bcrypt.compare(password, user.password);
        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect."
            });
        }

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: "7d" });

        return res.json({
            message: "Connexion réussie.",
            token,
            user: safeUser
        });
    } catch (error) {
        console.error("Erreur login:", error);
        return res.status(500).json({
            message: "Une erreur interne est survenue lors de la connexion."
        });
    }
});

// Profil connecté / Vérification de session
router.get("/me", authMiddleware, (req, res) => {
    const user = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?").get(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    return res.json({ user });
});

module.exports = router;