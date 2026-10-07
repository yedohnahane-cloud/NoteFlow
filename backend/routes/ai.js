const express = require("express");
const db = require("../database/database");
const aiService = require("../services/aiService");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// Résumé automatique
router.post("/summarize", async (req, res) => {
    try {
        const { title, content } = req.body;
        const result = await aiService.summarize(title, content);
        return res.json(result);
    } catch (error) {
        console.error("Erreur AI /summarize:", error);
        return res.status(500).json({ message: "Erreur lors de la génération du résumé." });
    }
});

// Suggestions automatiques de tags
router.post("/tags", async (req, res) => {
    try {
        const { title, content } = req.body;
        const tags = await aiService.generateTags(title, content);
        return res.json({ tags });
    } catch (error) {
        console.error("Erreur AI /tags:", error);
        return res.status(500).json({ message: "Erreur lors de la suggestion de tags." });
    }
});

// Reformulation et amélioration en Markdown structuré
router.post("/improve", async (req, res) => {
    try {
        const { title, content } = req.body;
        const improved = await aiService.improveContent(title, content);
        return res.json({ improvedContent: improved });
    } catch (error) {
        console.error("Erreur AI /improve:", error);
        return res.status(500).json({ message: "Erreur lors de l'amélioration de la note." });
    }
});

// Génération de quiz de révision
router.post("/quiz", async (req, res) => {
    try {
        const { title, content } = req.body;
        const quiz = await aiService.generateQuiz(title, content);
        return res.json(quiz);
    } catch (error) {
        console.error("Erreur AI /quiz:", error);
        return res.status(500).json({ message: "Erreur lors de la génération du quiz." });
    }
});

// Fiche de révision
router.post("/study-sheet", async (req, res) => {
    try {
        const { title, content } = req.body;
        const sheet = await aiService.generateStudySheet(title, content);
        return res.json(sheet);
    } catch (error) {
        console.error("Erreur AI /study-sheet:", error);
        return res.status(500).json({ message: "Erreur lors de la génération de la fiche." });
    }
});

// Extraction de concepts
router.post("/concepts", async (req, res) => {
    try {
        const { title, content } = req.body;
        const concepts = await aiService.extractConcepts(title, content);
        return res.json({ concepts });
    } catch (error) {
        console.error("Erreur AI /concepts:", error);
        return res.status(500).json({ message: "Erreur lors de l'extraction des concepts." });
    }
});

// Suggérer des connexions intelligentes avec d'autres notes existantes
router.post("/suggest-links", async (req, res) => {
    try {
        const userId = req.user.id;
        const { noteId } = req.body;

        const currentNote = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").get(noteId, userId);
        if (!currentNote) {
            return res.status(404).json({ message: "Note introuvable." });
        }

        const allNotes = db.prepare("SELECT id, title, content, category FROM notes WHERE user_id = ? AND is_archived = 0").all(userId);
        const suggestions = aiService.suggestConnections(currentNote, allNotes);

        return res.json({ suggestions });
    } catch (error) {
        console.error("Erreur AI /suggest-links:", error);
        return res.status(500).json({ message: "Erreur lors de la suggestion de liaisons." });
    }
});

// Poser une question sur la note
router.post("/ask", async (req, res) => {
    try {
        const { question, content } = req.body;
        if (!question) {
            return res.status(400).json({ message: "Une question est requise." });
        }

        const answer = await aiService.answerQuestion(question, content);
        return res.json(answer);
    } catch (error) {
        console.error("Erreur AI /ask:", error);
        return res.status(500).json({ message: "Erreur lors de la réponse à la question." });
    }
});

module.exports = router;
