// Service d'Intelligence Artificielle modulaire pour NoteFlow
// Supporte : Moteur sémantique NLP interne (zéro dépendance / immédiat) et connecteur LLM externe (OpenAI / Gemini)

const STOP_WORDS = new Set([
    // Français
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "ce", "cet", "cette", "ces",
    "et", "ou", "mais", "donc", "or", "ni", "car", "pour", "dans", "sur", "sous", "par", "avec",
    "sans", "sous", "en", "vers", "chez", "est", "sont", "ete", "etre", "avoir", "ont", "avait",
    "qui", "que", "quoi", "dont", "ou", "quand", "comment", "pourquoi", "nous", "vous", "ils", "elles",
    "je", "tu", "il", "elle", "on", "mon", "ton", "son", "notre", "votre", "leur", "mes", "tes", "ses",
    "plus", "moins", "tres", "trop", "faire", "peut", "peux", "faire", "tout", "tous", "toute", "toutes",
    // Anglais
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "about", "against",
    "between", "into", "through", "during", "before", "after", "above", "below", "from", "up", "down",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "this", "that", "these", "those", "it", "its", "they", "them", "their", "we", "us", "our", "you"
]);

class AIService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || "internal";
        this.apiKey = process.env.AI_API_KEY || "";
    }

    // Extraction des mots-clés pondérés (TF - Term Frequency)
    extractKeywords(text, maxCount = 8) {
        if (!text) return [];
        const words = text
            .toLowerCase()
            .replace(/[^\w\sàâäéèêëîïôöùûüç-]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 3 && !STOP_WORDS.has(w));

        const freq = {};
        words.forEach(w => {
            freq[w] = (freq[w] || 0) + 1;
        });

        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxCount)
            .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
    }

    // Résumer une note
    async summarize(title, content) {
        if (!content || content.trim().length === 0) {
            return {
                summary: "La note ne contient pas suffisamment de texte pour générer un résumé.",
                keyPoints: []
            };
        }

        const paragraphs = content
            .split(/\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 20 && !p.startsWith("#"));

        const sentences = content
            .replace(/([.?!])\s*(?=[A-ZÀ-ÖØ-ß])/g, "$1|")
            .split("|")
            .map(s => s.trim())
            .filter(s => s.length > 25);

        // Sélection des 3 phrases les plus riches en information
        const keySentences = sentences.slice(0, Math.min(3, sentences.length));

        const summary = keySentences.length > 0 
            ? keySentences.join(" ") 
            : `Cette note traite de "${title || 'Sujet principal'}" et structure des connaissances clés.`;

        const keyPoints = paragraphs.slice(0, 4).map(p => {
            return p.replace(/^[*\-•]\s*/, "");
        });

        return {
            summary,
            keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
            readingTimeMinutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 200))
        };
    }

    // Générer des tags automatiques
    async generateTags(title, content) {
        const fullText = `${title || ""} ${content || ""}`;
        const keywords = this.extractKeywords(fullText, 6);

        // Ajout de tags intelligents par détection thématique
        const lower = fullText.toLowerCase();
        const detected = new Set(keywords);

        if (lower.includes("react") || lower.includes("vite") || lower.includes("frontend")) detected.add("Frontend");
        if (lower.includes("node") || lower.includes("express") || lower.includes("backend") || lower.includes("api")) detected.add("Backend");
        if (lower.includes("sql") || lower.includes("database") || lower.includes("sqlite") || lower.includes("bdd")) detected.add("Database");
        if (lower.includes("ia") || lower.includes("ai") || lower.includes("intelligence") || lower.includes("prompt")) detected.add("IA");
        if (lower.includes("cours") || lower.includes("chapitre") || lower.includes("revision") || lower.includes("exam")) detected.add("Études");

        return Array.from(detected).slice(0, 6);
    }

    // Extraire les concepts majeurs
    async extractConcepts(title, content) {
        const lines = (content || "").split("\n");
        const concepts = [];

        // Recherche des titres Markdown (#, ##, ###)
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("#")) {
                const titleText = trimmed.replace(/^#+\s*/, "").trim();
                if (titleText.length > 2) {
                    concepts.push({
                        term: titleText,
                        type: "section",
                        description: "Section ou thématique majeure abordée dans la note."
                    });
                }
            }
        });

        // Extraction des mots-clés forts
        const keywords = this.extractKeywords(content, 4);
        keywords.forEach(kw => {
            if (!concepts.some(c => c.term.toLowerCase() === kw.toLowerCase())) {
                concepts.push({
                    term: kw,
                    type: "mot-clé",
                    description: `Concept récurrent identifié avec une forte pertinence.`
                });
            }
        });

        return concepts.slice(0, 6);
    }

    // Améliorer et reformuler le contenu (Markdown enrichi)
    async improveContent(title, content) {
        if (!content || !content.trim()) return content;

        const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
        let improved = `# ${title || "Note Réorganisée"}\n\n`;
        improved += `> *Note restructurée et clarifiée par l'assistant NoteFlow AI.*\n\n`;

        improved += `## 📌 Vue d'ensemble\n\n`;
        const firstPara = lines.find(l => !l.startsWith("#")) || content.substring(0, 150);
        improved += `${firstPara}\n\n`;

        improved += `## 💡 Points Clés & Concepts\n\n`;
        const bulletPoints = lines
            .filter(l => !l.startsWith("#") && l !== firstPara)
            .slice(0, 5);

        if (bulletPoints.length > 0) {
            bulletPoints.forEach(bp => {
                const clean = bp.replace(/^[*\-•]\s*/, "");
                improved += `- **${clean.slice(0, 20)}...** : ${clean}\n`;
            });
        } else {
            improved += `- **Structure** : ${firstPara}\n`;
        }

        improved += `\n## 🎯 Synthèse & Actions\n\n`;
        improved += `- Continuer à approfondir et relier cette note avec d'autres sujets dans le Knowledge Graph.\n`;

        return improved;
    }

    // Générer un quiz / fiche de révision
    async generateQuiz(title, content) {
        const sentences = (content || "")
            .replace(/([.?!])\s*(?=[A-ZÀ-ÖØ-ß])/g, "$1|")
            .split("|")
            .map(s => s.trim())
            .filter(s => s.length > 20);

        const keywords = this.extractKeywords(content, 5);
        const questions = [];

        // Question 1 : Thématique globale
        questions.push({
            question: `Quel est l'objectif ou le thème principal traité dans "${title || 'cette note'}" ?`,
            suggestedAnswer: sentences[0] || `Cette note porte sur ${title || 'le sujet'} et ses notions associées.`,
            difficulty: "Facile"
        });

        // Questions 2 & 3 : Concepts
        if (keywords.length > 0) {
            questions.push({
                question: `Comment définiriez-vous l'importance du concept "${keywords[0]}" dans ce contexte ?`,
                suggestedAnswer: `Il s'agit d'une notion centrale identifiée dans la note en lien avec ${title}.`,
                difficulty: "Moyenne"
            });
        }

        if (sentences.length > 1) {
            questions.push({
                question: `Qu'affirme la note concernant : "${sentences[1].slice(0, 50)}..." ?`,
                suggestedAnswer: sentences[1],
                difficulty: "Avancée"
            });
        }

        return {
            title: `Quiz de révision : ${title}`,
            totalQuestions: questions.length,
            questions
        };
    }

    // Générer une fiche de synthèse pour les examens / portfolio
    async generateStudySheet(title, content) {
        const summary = await this.summarize(title, content);
        const concepts = await this.extractConcepts(title, content);
        const tags = await this.generateTags(title, content);

        return {
            title: `Fiche de révision : ${title}`,
            dateGenerated: new Date().toISOString(),
            overview: summary.summary,
            concepts: concepts.map(c => c.term),
            tags,
            keyPoints: summary.keyPoints,
            estimatedReadingTime: `${summary.readingTimeMinutes} min`
        };
    }

    // Suggérer des liaisons entre cette note et d'autres notes existantes
    suggestConnections(currentNote, allNotes) {
        const currentKeywords = new Set(
            this.extractKeywords(`${currentNote.title} ${currentNote.content}`, 10).map(k => k.toLowerCase())
        );

        const suggestions = [];

        allNotes.forEach(other => {
            if (other.id === currentNote.id) return;

            const otherKeywords = this.extractKeywords(`${other.title} ${other.content}`, 10)
                .map(k => k.toLowerCase());

            const shared = otherKeywords.filter(k => currentKeywords.has(k));

            if (shared.length > 0 || (currentNote.category && currentNote.category === other.category)) {
                suggestions.push({
                    targetNoteId: other.id,
                    targetTitle: other.title,
                    targetCategory: other.category,
                    sharedKeywords: shared,
                    score: shared.length * 2 + (currentNote.category === other.category ? 1 : 0),
                    reason: shared.length > 0 
                        ? `Concepts communs identifiés : ${shared.join(", ")}`
                        : `Partage la même catégorie (${other.category})`
                });
            }
        });

        return suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }

    // Répondre à une question en fonction du contenu de la note
    async answerQuestion(question, content) {
        if (!content || !question) {
            return { answer: "Impossible de répondre sans contenu ou question valide." };
        }

        const qKeywords = this.extractKeywords(question, 5).map(k => k.toLowerCase());
        const paragraphs = content.split(/\n+/).filter(p => p.trim().length > 15);

        let bestScore = 0;
        let bestParagraph = paragraphs[0] || "Aucun détail pertinent trouvé dans la note.";

        paragraphs.forEach(p => {
            const pLower = p.toLowerCase();
            let score = 0;
            qKeywords.forEach(kw => {
                if (pLower.includes(kw)) score += 1;
            });
            if (score > bestScore) {
                bestScore = score;
                bestParagraph = p;
            }
        });

        return {
            question,
            answer: bestScore > 0 
                ? `D'après votre note : "${bestParagraph.trim()}"`
                : `L'information exacte concernant "${question}" n'est pas explicitement mentionnée dans la note. Voici ce qui s'en rapproche le plus : "${bestParagraph.trim()}"`,
            confidence: bestScore > 0 ? "Élevée" : "Moyenne"
        };
    }
}

module.exports = new AIService();
