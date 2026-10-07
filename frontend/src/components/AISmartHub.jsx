import { useState } from "react";
import { 
    Sparkles, 
    BookOpen, 
    Brain, 
    CheckCircle, 
    HelpCircle, 
    Layers, 
    FileText, 
    ArrowRight, 
    Loader2, 
    Send,
    Eye,
    EyeOff
} from "lucide-react";
import api from "../services/api";
import { showToast } from "./Toast";

export default function AISmartHub({ notes = [], onSelectNote }) {
    const [selectedNoteId, setSelectedNoteId] = useState(notes[0]?.id || "");
    const [activeAiTab, setActiveAiTab] = useState("quiz"); // 'quiz' | 'sheet' | 'concepts' | 'ask'
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [revealedAnswers, setRevealedAnswers] = useState({});
    const [userQuestion, setUserQuestion] = useState("");
    const [qaHistory, setQaHistory] = useState([]);

    const selectedNote = notes.find(n => Number(n.id) === Number(selectedNoteId));

    const toggleReveal = (idx) => {
        setRevealedAnswers(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const runAnalysis = async (type) => {
        if (!selectedNote) {
            showToast("Veuillez sélectionner une note à analyser", "info");
            return;
        }

        setLoading(true);
        setResultData(null);
        setRevealedAnswers({});

        try {
            if (type === "quiz") {
                const data = await api.aiQuiz(selectedNote.title, selectedNote.content);
                setResultData(data);
            } else if (type === "sheet") {
                const data = await api.aiStudySheet(selectedNote.title, selectedNote.content);
                setResultData(data);
            } else if (type === "concepts") {
                const data = await api.aiConcepts(selectedNote.title, selectedNote.content);
                setResultData(data);
            }
        } catch (error) {
            showToast("Erreur lors de l'analyse IA", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAskQuestion = async (e) => {
        e.preventDefault();
        if (!userQuestion.trim() || !selectedNote) return;

        setLoading(true);
        try {
            const res = await api.aiAskQuestion(userQuestion, selectedNote.content);
            setQaHistory(prev => [res, ...prev]);
            setUserQuestion("");
        } catch (error) {
            showToast("Erreur lors de la réponse IA", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-smart-hub-view">
            {/* Header */}
            <div className="view-header">
                <div>
                    <h2 className="view-title">Assistant IA & Smart Notes 🧠</h2>
                    <p className="view-subtitle">Exploitez l'analyse sémantique pour réviser, synthétiser et approfondir vos connaissances.</p>
                </div>
            </div>

            {/* Sélecteur de note & Onglets d'analyse */}
            <div className="ai-hub-controls">
                <div className="note-selector-wrap">
                    <label>Sélectionner la note à analyser :</label>
                    <select
                        value={selectedNoteId}
                        onChange={(e) => {
                            setSelectedNoteId(e.target.value);
                            setResultData(null);
                        }}
                        className="ai-note-select"
                    >
                        {notes.map(n => (
                            <option key={n.id} value={n.id}>
                                {n.title} ({n.category})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="ai-tab-buttons">
                    <button
                        type="button"
                        className={`ai-tab-btn ${activeAiTab === "quiz" ? "active" : ""}`}
                        onClick={() => {
                            setActiveAiTab("quiz");
                            runAnalysis("quiz");
                        }}
                    >
                        🎯 Quiz de Révision
                    </button>

                    <button
                        type="button"
                        className={`ai-tab-btn ${activeAiTab === "sheet" ? "active" : ""}`}
                        onClick={() => {
                            setActiveAiTab("sheet");
                            runAnalysis("sheet");
                        }}
                    >
                        📋 Fiche de Synthèse
                    </button>

                    <button
                        type="button"
                        className={`ai-tab-btn ${activeAiTab === "concepts" ? "active" : ""}`}
                        onClick={() => {
                            setActiveAiTab("concepts");
                            runAnalysis("concepts");
                        }}
                    >
                        🧩 Concepts Clés
                    </button>

                    <button
                        type="button"
                        className={`ai-tab-btn ${activeAiTab === "ask" ? "active" : ""}`}
                        onClick={() => setActiveAiTab("ask")}
                    >
                        💬 Poser une Question
                    </button>
                </div>
            </div>

            {/* Zone principale de résultats */}
            <div className="ai-hub-content-card">
                {loading && (
                    <div className="ai-loading-state">
                        <Loader2 size={36} className="spin-loader text-pink" />
                        <h3>Analyse cognitive en cours...</h3>
                        <p>Extraction des patterns sémantiques et structuration des connaissances.</p>
                    </div>
                )}

                {/* --- QUIZ --- */}
                {activeAiTab === "quiz" && !loading && (
                    <div className="quiz-container">
                        {!resultData ? (
                            <div className="ai-cta-box">
                                <Brain size={42} className="ai-hero-icon" />
                                <h3>Testez vos connaissances sur cette note</h3>
                                <p>L'assistant va générer automatiquement des questions interactives adaptées à votre contenu.</p>
                                <button type="button" className="btn-primary" onClick={() => runAnalysis("quiz")}>
                                    Générer le Quiz maintenant
                                </button>
                            </div>
                        ) : (
                            <div className="quiz-results">
                                <div className="quiz-header-bar">
                                    <h3>{resultData.title}</h3>
                                    <span className="quiz-badge">{resultData.totalQuestions} questions</span>
                                </div>

                                <div className="quiz-cards-grid">
                                    {resultData.questions.map((q, idx) => (
                                        <div key={idx} className="quiz-card">
                                            <div className="quiz-card-top">
                                                <span className="q-number">Question {idx + 1}</span>
                                                <span className={`difficulty-badge diff-${q.difficulty.toLowerCase()}`}>
                                                    {q.difficulty}
                                                </span>
                                            </div>
                                            <p className="quiz-question-text">{q.question}</p>

                                            <div className="quiz-answer-zone">
                                                <button
                                                    type="button"
                                                    className="btn-toggle-answer"
                                                    onClick={() => toggleReveal(idx)}
                                                >
                                                    {revealedAnswers[idx] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    <span>{revealedAnswers[idx] ? "Masquer la réponse" : "Révéler la réponse"}</span>
                                                </button>

                                                {revealedAnswers[idx] && (
                                                    <div className="revealed-answer-box">
                                                        <p><strong>Réponse :</strong> {q.suggestedAnswer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- FICHE DE SYNTHÈSE --- */}
                {activeAiTab === "sheet" && !loading && (
                    <div className="sheet-container">
                        {!resultData ? (
                            <div className="ai-cta-box">
                                <BookOpen size={42} className="ai-hero-icon" />
                                <h3>Générez une fiche de synthèse prête pour un entretien</h3>
                                <p>Obtenez un condensé structuré avec points clés, concepts et temps de lecture.</p>
                                <button type="button" className="btn-primary" onClick={() => runAnalysis("sheet")}>
                                    Créer la fiche de synthèse
                                </button>
                            </div>
                        ) : (
                            <div className="sheet-result-card">
                                <h3>{resultData.title}</h3>
                                <div className="sheet-meta">
                                    <span>Temps de lecture : {resultData.estimatedReadingTime}</span>
                                    <span>Généré le : {new Date(resultData.dateGenerated).toLocaleDateString("fr-FR")}</span>
                                </div>

                                <div className="sheet-section">
                                    <h4>Vue d'ensemble</h4>
                                    <p className="sheet-overview">{resultData.overview}</p>
                                </div>

                                {resultData.keyPoints && resultData.keyPoints.length > 0 && (
                                    <div className="sheet-section">
                                        <h4>Points clés à retenir</h4>
                                        <ul className="sheet-bullets">
                                            {resultData.keyPoints.map((kp, i) => (
                                                <li key={i}>{kp}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {resultData.concepts && resultData.concepts.length > 0 && (
                                    <div className="sheet-section">
                                        <h4>Notions centrales</h4>
                                        <div className="sheet-concepts-pills">
                                            {resultData.concepts.map((c, i) => (
                                                <span key={i} className="concept-pill">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- CONCEPTS CLÉS --- */}
                {activeAiTab === "concepts" && !loading && (
                    <div className="concepts-container">
                        {!resultData ? (
                            <div className="ai-cta-box">
                                <Layers size={42} className="ai-hero-icon" />
                                <h3>Cartographiez les notions fondamentales</h3>
                                <p>Identifiez les concepts récurrents et les sections maîtresses de votre note.</p>
                                <button type="button" className="btn-primary" onClick={() => runAnalysis("concepts")}>
                                    Extraire les concepts
                                </button>
                            </div>
                        ) : (
                            <div className="concepts-grid">
                                {resultData.concepts.map((item, idx) => (
                                    <div key={idx} className="concept-card">
                                        <span className="concept-type-tag">{item.type}</span>
                                        <h4>{item.term}</h4>
                                        <p>{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- POSER UNE QUESTION --- */}
                {activeAiTab === "ask" && (
                    <div className="ask-container">
                        <form onSubmit={handleAskQuestion} className="ask-form">
                            <input
                                type="text"
                                placeholder={`Ex: Quel est le principe clé de ${selectedNote?.title || 'la note'} ?`}
                                value={userQuestion}
                                onChange={(e) => setUserQuestion(e.target.value)}
                                className="ask-input"
                            />
                            <button type="submit" className="btn-primary" disabled={loading}>
                                <Send size={15} />
                                <span>Interroger</span>
                            </button>
                        </form>

                        <div className="qa-history-list">
                            {qaHistory.map((item, idx) => (
                                <div key={idx} className="qa-history-card">
                                    <div className="qa-question">
                                        <HelpCircle size={16} className="text-pink" />
                                        <strong>{item.question}</strong>
                                    </div>
                                    <p className="qa-answer">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
