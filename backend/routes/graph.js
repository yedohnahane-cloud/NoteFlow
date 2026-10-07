const express = require("express");
const db = require("../database/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// Récupérer le graphe de connaissances complet de l'utilisateur
router.get("/", (req, res) => {
    try {
        const userId = req.user.id;

        // Récupération des notes comme nœuds
        const notes = db.prepare(`
            SELECT 
                n.id, 
                n.title, 
                n.category, 
                n.is_pinned,
                (
                    SELECT GROUP_CONCAT(t.name, ', ')
                    FROM note_tags nt
                    JOIN tags t ON t.id = nt.tag_id
                    WHERE nt.note_id = n.id
                ) as tags
            FROM notes n
            WHERE n.user_id = ? AND n.is_archived = 0
            ORDER BY n.id ASC
        `).all(userId);

        // Récupération des arêtes (liens explicites)
        const explicitLinks = db.prepare(`
            SELECT 
                nl.id, 
                nl.source_note_id AS source, 
                nl.target_note_id AS target, 
                'explicit' AS type
            FROM note_links nl
            JOIN notes n1 ON n1.id = nl.source_note_id AND n1.is_archived = 0
            JOIN notes n2 ON n2.id = nl.target_note_id AND n2.is_archived = 0
            WHERE nl.user_id = ?
        `).all(userId);

        // Calcul des degrés (nombre de connexions par nœud)
        const connectionCounts = {};
        explicitLinks.forEach(l => {
            connectionCounts[l.source] = (connectionCounts[l.source] || 0) + 1;
            connectionCounts[l.target] = (connectionCounts[l.target] || 0) + 1;
        });

        const nodes = notes.map(n => ({
            id: n.id,
            title: n.title,
            category: n.category || "Général",
            tags: n.tags ? n.tags.split(", ") : [],
            is_pinned: Boolean(n.is_pinned),
            val: 1 + (connectionCounts[n.id] || 0) * 1.5 // Taille du nœud proportionnelle à sa centralité
        }));

        return res.json({
            nodes,
            links: explicitLinks
        });
    } catch (error) {
        console.error("Erreur GET /graph:", error);
        return res.status(500).json({ message: "Erreur lors de la génération du graphe." });
    }
});

// Créer un lien entre deux notes
router.post("/links", (req, res) => {
    try {
        const userId = req.user.id;
        const { source_note_id, target_note_id } = req.body;

        if (!source_note_id || !target_note_id) {
            return res.status(400).json({ message: "Les deux identifiants de notes sont requis." });
        }

        if (Number(source_note_id) === Number(target_note_id)) {
            return res.status(400).json({ message: "Une note ne peut pas être reliée à elle-même." });
        }

        // Vérification d'appartenance des deux notes
        const n1 = db.prepare("SELECT id FROM notes WHERE id = ? AND user_id = ?").get(source_note_id, userId);
        const n2 = db.prepare("SELECT id FROM notes WHERE id = ? AND user_id = ?").get(target_note_id, userId);

        if (!n1 || !n2) {
            return res.status(404).json({ message: "Une des notes spécifiées est introuvable." });
        }

        const result = db.prepare(`
            INSERT OR IGNORE INTO note_links (user_id, source_note_id, target_note_id)
            VALUES (?, ?, ?)
        `).run(userId, source_note_id, target_note_id);

        return res.status(201).json({
            message: "Lien créé avec succès.",
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error("Erreur POST /graph/links:", error);
        return res.status(500).json({ message: "Erreur lors de la création du lien." });
    }
});

// Supprimer un lien entre deux notes
router.delete("/links", (req, res) => {
    try {
        const userId = req.user.id;
        const { source_note_id, target_note_id } = req.body;

        const result = db.prepare(`
            DELETE FROM note_links 
            WHERE user_id = ? 
              AND ((source_note_id = ? AND target_note_id = ?) OR (source_note_id = ? AND target_note_id = ?))
        `).run(userId, source_note_id, target_note_id, target_note_id, source_note_id);

        return res.json({ message: "Lien supprimé avec succès.", changes: result.changes });
    } catch (error) {
        console.error("Erreur DELETE /graph/links:", error);
        return res.status(500).json({ message: "Erreur lors de la suppression du lien." });
    }
});

module.exports = router;
