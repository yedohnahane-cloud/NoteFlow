const express = require("express");
const db = require("../database/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Toutes les routes de notes nécessitent d'être authentifié
router.use(authMiddleware);

// Statistiques globales de l'utilisateur (pour le dashboard)
router.get("/stats/overview", (req, res) => {
    try {
        const userId = req.user.id;

        const totalNotes = db.prepare("SELECT COUNT(*) AS count FROM notes WHERE user_id = ? AND is_archived = 0").get(userId).count;
        const totalArchived = db.prepare("SELECT COUNT(*) AS count FROM notes WHERE user_id = ? AND is_archived = 1").get(userId).count;
        const totalFavorites = db.prepare("SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?").get(userId).count;
        const totalTags = db.prepare("SELECT COUNT(*) AS count FROM tags WHERE user_id = ?").get(userId).count;
        const totalLinks = db.prepare("SELECT COUNT(*) AS count FROM note_links WHERE user_id = ?").get(userId).count;

        const categories = db.prepare(`
            SELECT category, COUNT(*) as count 
            FROM notes 
            WHERE user_id = ? AND is_archived = 0 
            GROUP BY category
        `).all(userId);

        const recentNotes = db.prepare(`
            SELECT id, title, updated_at 
            FROM notes 
            WHERE user_id = ? AND is_archived = 0 
            ORDER BY updated_at DESC LIMIT 5
        `).all(userId);

        return res.json({
            totalNotes,
            totalArchived,
            totalFavorites,
            totalTags,
            totalLinks,
            categories,
            recentNotes
        });
    } catch (error) {
        console.error("Erreur stats:", error);
        return res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
    }
});

// Récupérer toutes les notes de l'utilisateur avec filtres et recherche
router.get("/", (req, res) => {
    try {
        const userId = req.user.id;
        const { search, tag, category, favorite, archived, sort } = req.query;

        let query = `
            SELECT 
                n.id, 
                n.user_id, 
                n.title, 
                n.content, 
                n.category, 
                n.is_pinned, 
                n.is_archived, 
                n.created_at, 
                n.updated_at,
                CASE WHEN f.note_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite,
                (SELECT COUNT(*) FROM note_versions WHERE note_id = n.id) AS versions_count,
                (
                    SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ';')
                    FROM note_tags nt
                    JOIN tags t ON t.id = nt.tag_id
                    WHERE nt.note_id = n.id
                ) AS tags_data,
                (
                    SELECT COUNT(*) 
                    FROM note_links 
                    WHERE user_id = n.user_id AND (source_note_id = n.id OR target_note_id = n.id)
                ) AS links_count
            FROM notes n
            LEFT JOIN favorites f ON f.note_id = n.id AND f.user_id = n.user_id
            WHERE n.user_id = ?
        `;

        const params = [userId];

        // Filtre archive (par défaut : non archivé sauf si demandé)
        if (archived === "true") {
            query += " AND n.is_archived = 1";
        } else {
            query += " AND n.is_archived = 0";
        }

        // Filtre favoris
        if (favorite === "true") {
            query += " AND f.note_id IS NOT NULL";
        }

        // Filtre catégorie
        if (category && category.trim() !== "") {
            query += " AND LOWER(n.category) = LOWER(?)";
            params.push(category.trim());
        }

        // Filtre tag
        if (tag && tag.trim() !== "") {
            query += `
                AND n.id IN (
                    SELECT nt.note_id 
                    FROM note_tags nt 
                    JOIN tags t ON t.id = nt.tag_id 
                    WHERE (t.name = ? OR t.id = ?)
                )
            `;
            params.push(tag.trim(), tag.trim());
        }

        // Recherche textuelle multi-champs (titre, contenu)
        if (search && search.trim() !== "") {
            const searchTerm = `%${search.trim()}%`;
            query += " AND (n.title LIKE ? OR n.content LIKE ?)";
            params.push(searchTerm, searchTerm);
        }

        // Tri
        if (sort === "oldest") {
            query += " ORDER BY n.is_pinned DESC, n.created_at ASC";
        } else if (sort === "title_asc") {
            query += " ORDER BY n.is_pinned DESC, LOWER(n.title) ASC";
        } else if (sort === "title_desc") {
            query += " ORDER BY n.is_pinned DESC, LOWER(n.title) DESC";
        } else {
            // Par défaut: épinglés d'abord, puis dernièrement modifiés
            query += " ORDER BY n.is_pinned DESC, n.updated_at DESC";
        }

        const rawNotes = db.prepare(query).all(...params);

        // Mise en forme des tags
        const notes = rawNotes.map(n => {
            let tags = [];
            if (n.tags_data) {
                tags = n.tags_data.split(";").map(str => {
                    const [id, name, color] = str.split(":");
                    return { id: Number(id), name, color };
                });
            }
            return {
                ...n,
                is_pinned: Boolean(n.is_pinned),
                is_archived: Boolean(n.is_archived),
                is_favorite: Boolean(n.is_favorite),
                tags
            };
        });

        return res.json(notes);
    } catch (error) {
        console.error("Erreur GET /notes:", error);
        return res.status(500).json({ message: "Erreur lors de la récupération des notes." });
    }
});

// Récupérer une note par son identifiant
router.get("/:id", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const note = db.prepare(`
            SELECT 
                n.*,
                CASE WHEN f.note_id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
            FROM notes n
            LEFT JOIN favorites f ON f.note_id = n.id AND f.user_id = n.user_id
            WHERE n.id = ? AND n.user_id = ?
        `).get(noteId, userId);

        if (!note) {
            return res.status(404).json({ message: "Note non trouvée ou accès non autorisé." });
        }

        // Récupération des tags
        const tags = db.prepare(`
            SELECT t.id, t.name, t.color
            FROM note_tags nt
            JOIN tags t ON t.id = nt.tag_id
            WHERE nt.note_id = ?
        `).all(noteId);

        // Récupération des liens vers d'autres notes
        const connectedNotes = db.prepare(`
            SELECT n.id, n.title
            FROM note_links nl
            JOIN notes n ON (n.id = nl.target_note_id OR n.id = nl.source_note_id)
            WHERE (nl.source_note_id = ? OR nl.target_note_id = ?) 
              AND n.id != ?
              AND nl.user_id = ?
        `).all(noteId, noteId, noteId, userId);

        return res.json({
            ...note,
            is_pinned: Boolean(note.is_pinned),
            is_archived: Boolean(note.is_archived),
            is_favorite: Boolean(note.is_favorite),
            tags,
            connectedNotes
        });
    } catch (error) {
        console.error("Erreur GET /notes/:id:", error);
        return res.status(500).json({ message: "Erreur lors de la récupération de la note." });
    }
});

// Créer une nouvelle note
router.post("/", (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, category, is_pinned, tags, linked_note_ids } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Le titre de la note est obligatoire." });
        }

        const insertStatement = db.prepare(`
            INSERT INTO notes (user_id, title, content, category, is_pinned)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = insertStatement.run(
            userId,
            title.trim(),
            content || "",
            category && category.trim() ? category.trim() : "Général",
            is_pinned ? 1 : 0
        );

        const newNoteId = Number(result.lastInsertRowid);

        // Enregistrement des tags associés
        if (Array.isArray(tags) && tags.length > 0) {
            const insertTagRel = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");
            for (const tagId of tags) {
                insertTagRel.run(newNoteId, tagId);
            }
        }

        // Liens avec d'autres notes
        if (Array.isArray(linked_note_ids) && linked_note_ids.length > 0) {
            const insertLink = db.prepare("INSERT OR IGNORE INTO note_links (user_id, source_note_id, target_note_id) VALUES (?, ?, ?)");
            for (const targetId of linked_note_ids) {
                if (Number(targetId) !== newNoteId) {
                    insertLink.run(userId, newNoteId, Number(targetId));
                }
            }
        }

        return res.status(201).json({
            message: "Note créée avec succès.",
            id: newNoteId
        });
    } catch (error) {
        console.error("Erreur POST /notes:", error);
        return res.status(500).json({ message: "Erreur lors de la création de la note." });
    }
});

// Mettre à jour une note (avec création automatique d'une version d'historique)
router.put("/:id", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { title, content, category, is_pinned, tags, linked_note_ids } = req.body;

        const existingNote = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!existingNote) {
            return res.status(404).json({ message: "Note non trouvée ou accès non autorisé." });
        }

        // Création d'une version d'historique si le contenu ou le titre a changé
        if (existingNote.title !== title || existingNote.content !== content) {
            db.prepare(`
                INSERT INTO note_versions (note_id, user_id, title, content)
                VALUES (?, ?, ?, ?)
            `).run(noteId, userId, existingNote.title, existingNote.content);
        }

        db.prepare(`
            UPDATE notes
            SET 
                title = ?, 
                content = ?, 
                category = ?, 
                is_pinned = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(
            title !== undefined ? title.trim() : existingNote.title,
            content !== undefined ? content : existingNote.content,
            category !== undefined ? category.trim() : existingNote.category,
            is_pinned !== undefined ? (is_pinned ? 1 : 0) : existingNote.is_pinned,
            noteId,
            userId
        );

        // Mise à jour des tags si fournis
        if (Array.isArray(tags)) {
            db.prepare("DELETE FROM note_tags WHERE note_id = ?").run(noteId);
            const insertTagRel = db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)");
            for (const tagId of tags) {
                insertTagRel.run(noteId, tagId);
            }
        }

        // Mise à jour des liens si fournis
        if (Array.isArray(linked_note_ids)) {
            db.prepare("DELETE FROM note_links WHERE user_id = ? AND (source_note_id = ? OR target_note_id = ?)").run(userId, noteId, noteId);
            const insertLink = db.prepare("INSERT OR IGNORE INTO note_links (user_id, source_note_id, target_note_id) VALUES (?, ?, ?)");
            for (const targetId of linked_note_ids) {
                if (Number(targetId) !== Number(noteId)) {
                    insertLink.run(userId, Number(noteId), Number(targetId));
                }
            }
        }

        return res.json({ message: "Note mise à jour avec succès." });
    } catch (error) {
        console.error("Erreur PUT /notes/:id:", error);
        return res.status(500).json({ message: "Erreur lors de la modification de la note." });
    }
});

// Supprimer une note
router.delete("/:id", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const result = db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(noteId, userId);

        if (result.changes === 0) {
            return res.status(404).json({ message: "Note non trouvée ou accès non autorisé." });
        }

        return res.json({ message: "Note supprimée avec succès." });
    } catch (error) {
        console.error("Erreur DELETE /notes/:id:", error);
        return res.status(500).json({ message: "Erreur lors de la suppression de la note." });
    }
});

// Basculer le statut favori
router.post("/:id/toggle-favorite", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const note = db.prepare("SELECT id FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!note) {
            return res.status(404).json({ message: "Note introuvable." });
        }

        const fav = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND note_id = ?").get(userId, noteId);

        if (fav) {
            db.prepare("DELETE FROM favorites WHERE user_id = ? AND note_id = ?").run(userId, noteId);
            return res.json({ is_favorite: false, message: "Retiré des favoris." });
        } else {
            db.prepare("INSERT INTO favorites (user_id, note_id) VALUES (?, ?)").run(userId, noteId);
            return res.json({ is_favorite: true, message: "Ajouté aux favoris." });
        }
    } catch (error) {
        console.error("Erreur toggle-favorite:", error);
        return res.status(500).json({ message: "Erreur lors de la mise à jour des favoris." });
    }
});

// Basculer l'archivage
router.post("/:id/toggle-archive", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const note = db.prepare("SELECT is_archived FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!note) {
            return res.status(404).json({ message: "Note introuvable." });
        }

        const newStatus = note.is_archived ? 0 : 1;
        db.prepare("UPDATE notes SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
          .run(newStatus, noteId, userId);

        return res.json({
            is_archived: Boolean(newStatus),
            message: newStatus ? "Note archivée." : "Note restaurée des archives."
        });
    } catch (error) {
        console.error("Erreur toggle-archive:", error);
        return res.status(500).json({ message: "Erreur lors de l'archivage." });
    }
});

// Basculer l'épingle (pin)
router.post("/:id/toggle-pin", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const note = db.prepare("SELECT is_pinned FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!note) {
            return res.status(404).json({ message: "Note introuvable." });
        }

        const newStatus = note.is_pinned ? 0 : 1;
        db.prepare("UPDATE notes SET is_pinned = ? WHERE id = ? AND user_id = ?")
          .run(newStatus, noteId, userId);

        return res.json({
            is_pinned: Boolean(newStatus),
            message: newStatus ? "Note épinglée." : "Note désépinglée."
        });
    } catch (error) {
        console.error("Erreur toggle-pin:", error);
        return res.status(500).json({ message: "Erreur lors du changement de statut épinglé." });
    }
});

// Historique des versions
router.get("/:id/versions", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;

        const versions = db.prepare(`
            SELECT id, title, content, created_at
            FROM note_versions
            WHERE note_id = ? AND user_id = ?
            ORDER BY created_at DESC
        `).all(noteId, userId);

        return res.json(versions);
    } catch (error) {
        console.error("Erreur GET versions:", error);
        return res.status(500).json({ message: "Erreur lors de la récupération de l'historique." });
    }
});

// Restaurer une ancienne version
router.post("/:id/versions/:versionId/restore", (req, res) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const versionId = req.params.versionId;

        const version = db.prepare("SELECT * FROM note_versions WHERE id = ? AND note_id = ? AND user_id = ?")
            .get(versionId, noteId, userId);

        if (!version) {
            return res.status(404).json({ message: "Version introuvable." });
        }

        const currentNote = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!currentNote) {
            return res.status(404).json({ message: "Note introuvable." });
        }

        // On sauvegarde l'état actuel avant restauration
        db.prepare(`
            INSERT INTO note_versions (note_id, user_id, title, content)
            VALUES (?, ?, ?, ?)
        `).run(noteId, userId, currentNote.title, currentNote.content);

        // On restaure l'ancienne version
        db.prepare(`
            UPDATE notes
            SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `).run(version.title, version.content, noteId, userId);

        return res.json({ message: "Version restaurée avec succès." });
    } catch (error) {
        console.error("Erreur restore version:", error);
        return res.status(500).json({ message: "Erreur lors de la restauration de la version." });
    }
});

module.exports = router;