import { useState, useEffect } from "react";
import { Minimize2, Save, Check, Clock, Eye, Moon, Sun } from "lucide-react";
import api from "../services/api";
import { showToast } from "./Toast";

export default function FocusMode({ note, onExit, onSaveUpdate }) {
    const [title, setTitle] = useState(note?.title || "");
    const [content, setContent] = useState(note?.content || "");
    const [isSaving, setIsSaving] = useState(false);
    const [savedStatus, setSavedStatus] = useState("Enregistré");
    const [focusTheme, setFocusTheme] = useState("dark"); // 'dark' | 'light' | 'sepia'

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const handleSave = async () => {
        if (!note?.id) return;
        setIsSaving(true);
        setSavedStatus("Enregistrement...");
        try {
            await api.updateNote(note.id, {
                title,
                content,
                category: note.category || "Général"
            });
            setSavedStatus("Enregistré");
            if (onSaveUpdate) onSaveUpdate();
        } catch (error) {
            setSavedStatus("Erreur");
            showToast("Erreur lors de la sauvegarde automatique", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Raccourci Ctrl+S pour sauvegarder
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
            if (e.key === "Escape") {
                onExit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [title, content, note?.id]);

    return (
        <div className={`focus-mode-overlay focus-theme-${focusTheme}`}>
            {/* Barre de contrôle minimale */}
            <div className="focus-header">
                <div className="focus-left">
                    <button 
                        type="button" 
                        className="btn-exit-focus"
                        onClick={onExit}
                        title="Quitter le Mode Focus (Échap)"
                    >
                        <Minimize2 size={16} />
                        <span>Quitter (Échap)</span>
                    </button>
                    <span className="focus-save-status">
                        <Check size={13} className="text-emerald" /> {savedStatus}
                    </span>
                </div>

                <div className="focus-center">
                    <span className="focus-stat-pill">
                        {wordCount} mots • ~{readingTime} min de lecture
                    </span>
                </div>

                <div className="focus-right">
                    <div className="theme-selector">
                        <button 
                            type="button" 
                            className={`theme-dot dot-dark ${focusTheme === "dark" ? "active" : ""}`}
                            onClick={() => setFocusTheme("dark")}
                            title="Thème Sombre"
                        />
                        <button 
                            type="button" 
                            className={`theme-dot dot-light ${focusTheme === "light" ? "active" : ""}`}
                            onClick={() => setFocusTheme("light")}
                            title="Thème Clair"
                        />
                        <button 
                            type="button" 
                            className={`theme-dot dot-sepia ${focusTheme === "sepia" ? "active" : ""}`}
                            onClick={() => setFocusTheme("sepia")}
                            title="Thème Sépia"
                        />
                    </div>

                    <button 
                        type="button" 
                        className="btn-focus-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={15} />
                        <span>Enregistrer</span>
                    </button>
                </div>
            </div>

            {/* Zone d'écriture zen et épurée */}
            <div className="focus-content-container">
                <input
                    type="text"
                    placeholder="Titre de votre réflexion..."
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setSavedStatus("Non enregistré");
                    }}
                    className="focus-title-input"
                />

                <textarea
                    placeholder="Écrivez librement sans aucune distraction..."
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        setSavedStatus("Non enregistré");
                    }}
                    className="focus-textarea"
                    autoFocus
                />
            </div>
        </div>
    );
}
