const express = require("express");
const db = require("../database/database");

const router = express.Router();

router.get("/", (req, res) => {
    const notes = db.prepare("SELECT * FROM notes").all();

    res.json(notes);
});

router.post("/", (req, res) => {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
        return res.status(400).json({
            message: "Tous les champs sont obligatoires"
        });
    }

    const statement = db.prepare(`
        INSERT INTO notes (user_id, title, content)
        VALUES (?, ?, ?)
    `);

    const result = statement.run(user_id, title, content);

    res.status(201).json({
        message: "Note créée",
        id: result.lastInsertRowid
    });
});

router.put("/:id", (req, res) => {
    const { title, content } = req.body;
    const { id } = req.params;

    db.prepare(`
        UPDATE notes
        SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(title, content, id);

    res.json({
        message: "Note modifiée"
    });
});

router.delete("/:id", (req, res) => {
    const { id } = req.params;

    db.prepare("DELETE FROM notes WHERE id = ?").run(id);

    res.json({
        message: "Note supprimée"
    });
});

module.exports = router;