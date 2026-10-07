require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const tagsRoutes = require("./routes/tags");
const graphRoutes = require("./routes/graph");
const aiRoutes = require("./routes/ai");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité et parsing
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Routes de l'API REST NoteFlow
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/ai", aiRoutes);

// Healthcheck & Accueil API
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "NoteFlow Backend",
        timestamp: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API NoteFlow ! Système opérationnel.");
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({ message: "Route API introuvable." });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    console.error("Erreur non gérée:", err);
    res.status(500).json({
        message: "Une erreur interne est survenue sur le serveur.",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// Démarrage du serveur si exécuté directement (pas lors des tests)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`NoteFlow Backend lancé avec succès sur le port ${PORT}`);
    });
}

module.exports = app;