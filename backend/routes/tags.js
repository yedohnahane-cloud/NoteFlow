const express = require("express");
const db = require("../database/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// Récupérer tous les tags de l'utilisateur avec le nombre de notes associées
router.get("/", (req, res) => {
    try {
        const userId = req.user.id;
        const tags = db.prepare(`
            SELECT 
                t.id, 
                t.name, 
                t.color, 
                t.created_at,
                COUNT(nt.note_id) as notes_count
            FROM tags t
            LEFT JOIN note_tags nt ON nt.tag_id = t.id
            LEFT JOIN notes n ON n.id = nt.note_id AND n.is_archived = 0
            WHERE t.user_id = ?
            GROUP BY t.id
            ORDER BY notes_count DESC, t.name ASC
        `).all(userId);

        return res.json(tags);
    } catch (error) {
        console.error("Erreur GET /tags:", error);
        return res.status(500).json({ message: "Erreur lors de la récupération des tags." });
    }
});

// Créer un tag
router.post("/", (req, res) => {
    try {
        const userId = req.user.id;
        const { name, color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Le nom du tag est obligatoire." });
        }

        const trimmedName = name.trim();
        const tagColor = color || "#6366f1";

        const existing = db.prepare("SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)").get(userId, trimmedName);
        if (existing) {
            return res.status(409).json({ message: "Ce tag existe déjà.", tag: existing });
        }

        const result = db.prepare("INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)").run(userId, trimmedName, tagColor);

        return res.status(201).json({
            message: "Tag créé avec succès.",
            tag: {
                id: Number(result.lastInsertRowid),
                name: trimmedName,
                color: tagColor,
                notes_count: 0
            }
        });
    } catch (error) {
        console.error("Erreur POST /tags:", error);
        return res.status(500).json({ message: "Erreur lors de la création du tag." });
    }
});

// Modifier un tag
router.put("/:id", (req, res) => {
    try {
        const userId = req.user.id;
        const tagId = req.params.id;
        const { name, color } = req.body;

        const tag = db.prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?").get(tagId, userId);
        if (!tag) {
            return res.status(404).json({ message: "Tag non trouvé." });
        }

        db.prepare(`
            UPDATE tags 
            SET name = COALESCE(?, name), color = COALESCE(?, color) 
            WHERE id = ? AND user_id = ?
        `).run(name ? name.trim() : null, color || null, tagId, userId);

        return res.json({ message: "Tag mis à jour." });
    } catch (error) {
        console.error("Erreur PUT /tags/:id:", error);
        return res.status(500).json({ message: "Erreur lors de la mise à jour du tag." });
    }
});

// Supprimer un tag
router.delete("/:id", (req, res) => {
    try {
        const userId = req.user.id;
        const tagId = req.params.id;

        const result = db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?").run(tagId, userId);
        if (result.changes === 0) {
            return res.status(404).json({ message: "Tag non trouvé." });
        }

        return res.json({ message: "Tag supprimé avec succès." });
    } catch (error) {
        console.error("Erreur DELETE /tags/:id:", error);
        return res.status(500).json({ message: "Erreur lors de la suppression du tag." });
    }
});

module.exports = router;
