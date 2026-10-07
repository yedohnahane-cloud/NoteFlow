import { useState, useEffect } from "react";
import { 
    Save, 
    ArrowLeft, 
    Sparkles, 
    History, 
    Share2, 
    Tag, 
    Maximize2, 
    Star, 
    Archive, 
    Trash2, 
    Plus, 
    Check, 
    RotateCcw, 
    HelpCircle, 
    FileText, 
    Layers, 
    Send,
    FolderPlus,
    X,
    Loader2
} from "lucide-react";
import api from "../services/api";
import { showToast } from "./Toast";

export default function NoteEditor({ 
    noteId, 
    allNotes = [], 
    allTags = [], 
    onSaveSuccess, 
    onClose, 
    onEnterFocus,
    onRefreshTags
}) {
    const isNew = !noteId;

    // État principal du formulaire
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("Général");
    const [isPinned, setIsPinned] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [linkedNoteIds, setLinkedNoteIds] = useState([]);

    // Panneaux latéraux ('none' | 'ai' | 'history' | 'links')
    const [activePanel, setActivePanel] = useState("none");

    // Création de nouveau tag en ligne
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState("#6366f1");
    const [showNewTagInput, setShowNewTagInput] = useState(false);

    // États IA
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiAction, setAiAction] = useState("");
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiAnswer, setAiAnswer] = useState(null);

    // États Historique
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    // Chargement de la note si existante
    useEffect(() => {
        if (!isNew && noteId) {
            loadNoteData(noteId);
        } else {
            setTitle("");
            setContent("");
            setCategory("Général");
            setIsPinned(false);
            setIsFavorite(false);
            setSelectedTagIds([]);
            setLinkedNoteIds([]);
        }
    }, [noteId, isNew]);

    const loadNoteData = async (id) => {
        try {
            const data = await api.getNote(id);
            setTitle(data.title || "");
            setContent(data.content || "");
            setCategory(data.category || "Général");
            setIsPinned(Boolean(data.is_pinned));
            setIsFavorite(Boolean(data.is_favorite));
            setSelectedTagIds((data.tags || []).map(t => t.id));
            setLinkedNoteIds((data.connectedNotes || []).map(cn => cn.id));
        } catch (error) {
            showToast("Erreur lors du chargement de la note", "error");
        }
    };

    // Chargement de l'historique
    const loadVersions = async () => {
        if (!noteId) return;
        setLoadingVersions(true);
        try {
            const data = await api.getNoteVersions(noteId);
            setVersions(data);
        } catch (error) {
            showToast("Erreur lors de la récupération de l'historique", "error");
        } finally {
            setLoadingVersions(false);
        }
    };

    // Sauvegarde de la note
    const handleSave = async () => {
        if (!title.trim()) {
            showToast("Le titre de la note est obligatoire", "error");
            return;
        }

        const payload = {
            title: title.trim(),
            content,
            category: category.trim() || "Général",
            is_pinned: isPinned,
            tags: selectedTagIds,
            linked_note_ids: linkedNoteIds
        };

        try {
            if (isNew) {
                const res = await api.createNote(payload);
                showToast("Note créée avec succès !", "success");
                onSaveSuccess(res.id);
            } else {
                await api.updateNote(noteId, payload);
                showToast("Note mise à jour avec succès !", "success");
                onSaveSuccess(noteId);
            }
        } catch (error) {
            showToast(error.message || "Erreur lors de l'enregistrement", "error");
        }
    };

    // Restauration d'une version
    const handleRestoreVersion = async (versionId) => {
        if (!window.confirm("Restaurer cette version remplacera le contenu actuel (l'état actuel sera conservé dans l'historique). Continuer ?")) {
            return;
        }

        try {
            await api.restoreNoteVersion(noteId, versionId);
            showToast("Version restaurée avec succès !", "success");
            await loadNoteData(noteId);
            await loadVersions();
        } catch (error) {
            showToast("Erreur lors de la restauration", "error");
        }
    };

    // Création d'un tag rapide
    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            const res = await api.createTag({ name: newTagName.trim(), color: newTagColor });
            setSelectedTagIds(prev => [...prev, res.tag.id]);
            setNewTagName("");
            setShowNewTagInput(false);
            if (onRefreshTags) onRefreshTags();
            showToast(`Tag #${res.tag.name} créé !`, "success");
        } catch (error) {
            showToast("Ce tag existe peut-être déjà", "error");
        }
    };

    // Toggle Tag sélectionné
    const toggleTag = (tagId) => {
        setSelectedTagIds(prev => 
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    // Toggle Lien de note
    const toggleNoteLink = (targetId) => {
        setLinkedNoteIds(prev =>
            prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
        );
    };

    // --- ACTIONS IA ---
    const runAiAction = async (actionType) => {
        if (!content.trim() && !title.trim()) {
            showToast("Rédigez du contenu avant de solliciter l'IA", "info");
            return;
        }

        setAiLoading(true);
        setAiAction(actionType);
        setAiResult(null);
        setActivePanel("ai");

        try {
            if (actionType === "summarize") {
                const res = await api.aiSummarize(title, content);
                setAiResult(res);
            } else if (actionType === "tags") {
                const res = await api.aiGenerateTags(title, content);
                setAiResult(res);
            } else if (actionType === "improve") {
                const res = await api.aiImprove(title, content);
                setAiResult(res);
            } else if (actionType === "quiz") {
                const res = await api.aiQuiz(title, content);
                setAiResult(res);
            } else if (actionType === "study-sheet") {
                const res = await api.aiStudySheet(title, content);
                setAiResult(res);
            } else if (actionType === "suggest-links") {
                if (isNew) {
                    showToast("Enregistrez d'abord la note pour suggérer des liaisons", "info");
                    setAiLoading(false);
                    return;
                }
                const res = await api.aiSuggestLinks(noteId);
                setAiResult(res);
            }
        } catch (error) {
            showToast("Erreur lors de l'appel à l'assistant IA", "error");
        } finally {
            setAiLoading(false);
        }
    };

    // Question IA posée sur la note
    const handleAskAi = async (e) => {
        e.preventDefault();
        if (!aiQuestion.trim()) return;

        setAiLoading(true);
        try {
            const res = await api.aiAskQuestion(aiQuestion, content);
            setAiAnswer(res);
        } catch (error) {
            showToast("Erreur lors de la réponse IA", "error");
        } finally {
            setAiLoading(false);
        }
    };

    // Insertion d'éléments Markdown
    const insertMarkdown = (prefix, suffix = "") => {
        const textarea = document.getElementById("note-content-area");
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        const replacement = `${prefix}${selected || "texte"}${suffix}`;
        const newText = text.substring(0, start) + replacement + text.substring(end);

        setContent(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
        }, 0);
    };

    return (
        <div className="note-editor-view">
            {/* Barre d'outils supérieure */}
            <div className="editor-top-bar">
                <div className="top-left">
                    <button type="button" className="btn-back" onClick={onClose}>
                        <ArrowLeft size={16} />
                        <span>Retour</span>
                    </button>
                    <span className="editor-badge-status">
                        {isNew ? "Nouvelle note" : "Modification"}
                    </span>
                </div>

                <div className="top-right">
                    <button 
                        type="button" 
                        className={`btn-toolbar ${isFavorite ? "favorite-active" : ""}`}
                        onClick={() => setIsFavorite(!isFavorite)}
                        title="Favori"
                    >
                        <Star size={16} />
                    </button>

                    <button 
                        type="button" 
                        className="btn-toolbar"
                        onClick={() => onEnterFocus({ title, content, category, id: noteId })}
                        title="Entrer en Mode Focus (Plein écran sans distraction)"
                    >
                        <Maximize2 size={16} />
                        <span>Mode Focus</span>
                    </button>

                    <button 
                        type="button" 
                        className={`btn-toolbar ${activePanel === "ai" ? "panel-active" : ""}`}
                        onClick={() => setActivePanel(activePanel === "ai" ? "none" : "ai")}
                        title="Assistant IA & Smart Notes"
                    >
                        <Sparkles size={16} />
                        <span>Assistant IA</span>
                    </button>

                    {!isNew && (
                        <button 
                            type="button" 
                            className={`btn-toolbar ${activePanel === "history" ? "panel-active" : ""}`}
                            onClick={() => {
                                const next = activePanel === "history" ? "none" : "history";
                                setActivePanel(next);
                                if (next === "history") loadVersions();
                            }}
                            title="Historique des versions"
                        >
                            <History size={16} />
                            <span>Historique</span>
                        </button>
                    )}

                    <button 
                        type="button" 
                        className={`btn-toolbar ${activePanel === "links" ? "panel-active" : ""}`}
                        onClick={() => setActivePanel(activePanel === "links" ? "none" : "links")}
                        title="Connexions Knowledge Graph"
                    >
                        <Share2 size={16} />
                        <span>Liaisons ({linkedNoteIds.length})</span>
                    </button>

                    <button type="button" className="btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        <span>Enregistrer</span>
                    </button>
                </div>
            </div>

            {/* Corps de l'éditeur */}
            <div className="editor-main-layout">
                <div className="editor-content-area">
                    {/* Titre */}
                    <input
                        type="text"
                        placeholder="Titre de la note..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="editor-title-input"
                    />

                    {/* Métadonnées : Catégorie & Tags */}
                    <div className="editor-meta-bar">
                        <div className="meta-category-group">
                            <label>Catégorie :</label>
                            <input
                                type="text"
                                list="categories-list"
                                placeholder="ex: Général, Architecture, Cours..."
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="category-input"
                            />
                            <datalist id="categories-list">
                                <option value="Général" />
                                <option value="Architecture" />
                                <option value="Frontend" />
                                <option value="Backend" />
                                <option value="Base de données" />
                                <option value="IA & Data" />
                                <option value="Projet" />
                            </datalist>
                        </div>

                        {/* Tags associés */}
                        <div className="meta-tags-group">
                            <span className="tags-label">Tags :</span>
                            <div className="tags-chips-wrap">
                                {allTags.map(tag => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`meta-tag-chip ${isSelected ? "selected" : ""}`}
                                            onClick={() => toggleTag(tag.id)}
                                            style={isSelected ? { borderColor: tag.color, backgroundColor: `${tag.color}25` } : {}}
                                        >
                                            <span className="chip-dot" style={{ backgroundColor: tag.color }} />
                                            #{tag.name}
                                        </button>
                                    );
                                })}

                                {showNewTagInput ? (
                                    <div className="new-tag-inline">
                                        <input
                                            type="text"
                                            placeholder="Nouveau tag"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            className="tag-name-input"
                                        />
                                        <input
                                            type="color"
                                            value={newTagColor}
                                            onChange={(e) => setNewTagColor(e.target.value)}
                                            className="tag-color-input"
                                        />
                                        <button type="button" className="btn-confirm-tag" onClick={handleCreateTag}>
                                            <Check size={13} />
                                        </button>
                                        <button type="button" className="btn-cancel-tag" onClick={() => setShowNewTagInput(false)}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="btn-add-tag-chip"
                                        onClick={() => setShowNewTagInput(true)}
                                    >
                                        <Plus size={13} /> Tag
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Barre d'outils Markdown */}
                    <div className="editor-markdown-tools">
                        <button type="button" onClick={() => insertMarkdown("**", "**")} title="Gras"><strong>B</strong></button>
                        <button type="button" onClick={() => insertMarkdown("*", "*")} title="Italique"><em>I</em></button>
                        <button type="button" onClick={() => insertMarkdown("## ")} title="Titre 2">H2</button>
                        <button type="button" onClick={() => insertMarkdown("### ")} title="Titre 3">H3</button>
                        <button type="button" onClick={() => insertMarkdown("- ")} title="Liste à puces">• Liste</button>
                        <button type="button" onClick={() => insertMarkdown("> ")} title="Citation">” Citation</button>
                        <button type="button" onClick={() => insertMarkdown("```\n", "\n```")} title="Bloc de code">&lt;/&gt;</button>
                        <span className="tools-spacer" />
                        <span className="char-count">
                            {content.length} caractères • {content.split(/\s+/).filter(Boolean).length} mots
                        </span>
                    </div>

                    {/* Zone de texte principale */}
                    <textarea
                        id="note-content-area"
                        placeholder="Rédigez vos notes ici en Markdown... (supporte les titres #, listes, code et liens)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="editor-textarea"
                    />
                </div>

                {/* --- PANNEAU LATÉRAL : ASSISTANT IA --- */}
                {activePanel === "ai" && (
                    <aside className="editor-side-panel">
                        <div className="side-panel-header">
                            <div className="panel-title">
                                <Sparkles size={18} className="text-pink" />
                                <h3>Smart Notes / IA</h3>
                            </div>
                            <button type="button" className="btn-close-panel" onClick={() => setActivePanel("none")}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="side-panel-body">
                            <div className="ai-actions-menu">
                                <button 
                                    type="button" 
                                    className="ai-menu-btn" 
                                    onClick={() => runAiAction("summarize")}
                                    disabled={aiLoading}
                                >
                                    ✨ Résumer la note
                                </button>
                                <button 
                                    type="button" 
                                    className="ai-menu-btn" 
                                    onClick={() => runAiAction("tags")}
                                    disabled={aiLoading}
                                >
                                    🏷️ Suggérer des tags automatiques
                                </button>
                                <button 
                                    type="button" 
                                    className="ai-menu-btn" 
                                    onClick={() => runAiAction("improve")}
                                    disabled={aiLoading}
                                >
                                    ✍️ Améliorer la structure & clarté
                                </button>
                                <button 
                                    type="button" 
                                    className="ai-menu-btn" 
                                    onClick={() => runAiAction("quiz")}
                                    disabled={aiLoading}
                                >
                                    🎯 Quiz & Flashcards de révision
                                </button>
                                <button 
                                    type="button" 
                                    className="ai-menu-btn" 
                                    onClick={() => runAiAction("study-sheet")}
                                    disabled={aiLoading}
                                >
                                    📋 Fiche de synthèse (Exam/Portfolio)
                                </button>
                                {!isNew && (
                                    <button 
                                        type="button" 
                                        className="ai-menu-btn" 
                                        onClick={() => runAiAction("suggest-links")}
                                        disabled={aiLoading}
                                    >
                                        🔗 Découvrir des connexions
                                    </button>
                                )}
                            </div>

                            {/* Question libre à l'IA sur la note */}
                            <form className="ai-ask-form" onSubmit={handleAskAi}>
                                <input
                                    type="text"
                                    placeholder="Poser une question sur cette note..."
                                    value={aiQuestion}
                                    onChange={(e) => setAiQuestion(e.target.value)}
                                    className="ai-ask-input"
                                />
                                <button type="submit" className="ai-ask-btn" disabled={aiLoading}>
                                    <Send size={14} />
                                </button>
                            </form>

                            {aiLoading && (
                                <div className="ai-loading-box">
                                    <Loader2 size={24} className="spin-loader" />
                                    <span>Analyse sémantique en cours...</span>
                                </div>
                            )}

                            {/* Réponses IA */}
                            {aiAnswer && (
                                <div className="ai-result-card">
                                    <h4>Réponse de l'assistant :</h4>
                                    <p>{aiAnswer.answer}</p>
                                    <span className="confidence-tag">Indice de confiance : {aiAnswer.confidence}</span>
                                </div>
                            )}

                            {aiResult && !aiLoading && (
                                <div className="ai-result-card">
                                    {aiAction === "summarize" && (
                                        <>
                                            <h4>Résumé généré :</h4>
                                            <p className="summary-text">{aiResult.summary}</p>
                                            {aiResult.keyPoints && aiResult.keyPoints.length > 0 && (
                                                <ul className="keypoints-list">
                                                    {aiResult.keyPoints.map((kp, idx) => (
                                                        <li key={idx}>{kp}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <button 
                                                type="button" 
                                                className="btn-apply-ai"
                                                onClick={() => setContent(prev => `> **Résumé IA :** ${aiResult.summary}\n\n${prev}`)}
                                            >
                                                Insérer le résumé au début de la note
                                            </button>
                                        </>
                                    )}

                                    {aiAction === "tags" && (
                                        <>
                                            <h4>Tags suggérés :</h4>
                                            <div className="suggested-tags-wrap">
                                                {aiResult.tags.map((tName, i) => (
                                                    <span key={i} className="suggested-tag-pill">
                                                        #{tName}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {aiAction === "improve" && (
                                        <>
                                            <h4>Texte restructuré :</h4>
                                            <pre className="improved-preview">{aiResult.improvedContent}</pre>
                                            <button 
                                                type="button" 
                                                className="btn-apply-ai"
                                                onClick={() => setContent(aiResult.improvedContent)}
                                            >
                                                Appliquer ce contenu amélioré
                                            </button>
                                        </>
                                    )}

                                    {aiAction === "quiz" && (
                                        <>
                                            <h4>{aiResult.title}</h4>
                                            <div className="quiz-questions-list">
                                                {aiResult.questions.map((q, i) => (
                                                    <div key={i} className="quiz-item">
                                                        <p className="q-title"><strong>Q{i+1} :</strong> {q.question}</p>
                                                        <p className="q-answer"><em>Réponse suggérée :</em> {q.suggestedAnswer}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {aiAction === "study-sheet" && (
                                        <>
                                            <h4>{aiResult.title}</h4>
                                            <p><strong>Synthèse :</strong> {aiResult.overview}</p>
                                            <p><strong>Temps de lecture estimé :</strong> {aiResult.estimatedReadingTime}</p>
                                            <button 
                                                type="button" 
                                                className="btn-apply-ai"
                                                onClick={() => setContent(prev => `${prev}\n\n---\n## 📋 Fiche de Révision\n- **Synthèse** : ${aiResult.overview}\n- **Concepts** : ${(aiResult.concepts || []).join(", ")}`)}
                                            >
                                                Ajouter la fiche à la fin de la note
                                            </button>
                                        </>
                                    )}

                                    {aiAction === "suggest-links" && (
                                        <>
                                            <h4>Suggestions de liaisons du graphe :</h4>
                                            {aiResult.suggestions.length === 0 ? (
                                                <p className="text-muted">Aucune note similaire trouvée.</p>
                                            ) : (
                                                <div className="suggested-links-list">
                                                    {aiResult.suggestions.map((sug, i) => (
                                                        <div key={i} className="suggested-link-row">
                                                            <div>
                                                                <strong>{sug.targetTitle}</strong>
                                                                <p className="sug-reason">{sug.reason}</p>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                className="btn-connect-sm"
                                                                onClick={() => {
                                                                    if (!linkedNoteIds.includes(sug.targetNoteId)) {
                                                                        setLinkedNoteIds(prev => [...prev, sug.targetNoteId]);
                                                                        showToast(`Lié à "${sug.targetTitle}" !`, "success");
                                                                    }
                                                                }}
                                                            >
                                                                Relier
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
                )}

                {/* --- PANNEAU LATÉRAL : HISTORIQUE DES VERSIONS --- */}
                {activePanel === "history" && (
                    <aside className="editor-side-panel">
                        <div className="side-panel-header">
                            <div className="panel-title">
                                <History size={18} className="text-amber" />
                                <h3>Historique des versions</h3>
                            </div>
                            <button type="button" className="btn-close-panel" onClick={() => setActivePanel("none")}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="side-panel-body">
                            {loadingVersions ? (
                                <div className="panel-loading">Chargement des versions...</div>
                            ) : versions.length === 0 ? (
                                <p className="text-muted">Aucune modification précédente enregistrée pour le moment. Chaque sauvegarde ultérieure créera une copie de sécurité.</p>
                            ) : (
                                <div className="versions-timeline">
                                    {versions.map(v => (
                                        <div key={v.id} className="version-card">
                                            <div className="version-header">
                                                <span className="version-date">
                                                    {new Date(v.created_at).toLocaleDateString("fr-FR", {
                                                        day: "numeric",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                                <button 
                                                    type="button" 
                                                    className="btn-restore-version"
                                                    onClick={() => handleRestoreVersion(v.id)}
                                                    title="Restaurer cette version"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Restaurer</span>
                                                </button>
                                            </div>
                                            <div className="version-title">{v.title}</div>
                                            <div className="version-snippet">
                                                {v.content ? v.content.substring(0, 100) : "Contenu vide"}...
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                )}

                {/* --- PANNEAU LATÉRAL : LIAISONS DU KNOWLEDGE GRAPH --- */}
                {activePanel === "links" && (
                    <aside className="editor-side-panel">
                        <div className="side-panel-header">
                            <div className="panel-title">
                                <Share2 size={18} className="text-purple" />
                                <h3>Connexions Knowledge Graph</h3>
                            </div>
                            <button type="button" className="btn-close-panel" onClick={() => setActivePanel("none")}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="side-panel-body">
                            <p className="panel-hint">
                                Reliez cette note à d'autres connaissances pour tracer des connexions visibles dans le Knowledge Graph.
                            </p>

                            <div className="available-notes-links">
                                {allNotes
                                    .filter(n => Number(n.id) !== Number(noteId))
                                    .map(otherNote => {
                                        const isLinked = linkedNoteIds.includes(otherNote.id);
                                        return (
                                            <div 
                                                key={otherNote.id} 
                                                className={`note-link-select-item ${isLinked ? "linked" : ""}`}
                                                onClick={() => toggleNoteLink(otherNote.id)}
                                            >
                                                <div className="note-link-info">
                                                    <span className="link-note-title">{otherNote.title}</span>
                                                    <span className="link-note-cat">{otherNote.category}</span>
                                                </div>
                                                <button type="button" className="btn-toggle-link">
                                                    {isLinked ? <Check size={14} /> : <Plus size={14} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
