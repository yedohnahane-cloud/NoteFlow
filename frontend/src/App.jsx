import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import NotesList from "./components/NotesList";
import NoteEditor from "./components/NoteEditor";
import KnowledgeGraph from "./components/KnowledgeGraph";
import AISmartHub from "./components/AISmartHub";
import FocusMode from "./components/FocusMode";
import Login from "./components/Login";
import Register from "./components/Register";
import { ToastContainer, showToast } from "./components/Toast";
import { Loader2, Sparkles } from "lucide-react";
import "./App.css";

function MainApp() {
    const { user, loading } = useAuth();
    const [authPage, setAuthPage] = useState("login"); // 'login' | 'register'

    // Vue active dans l'application
    const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'notes' | 'favorites' | 'graph' | 'ai' | 'archive'
    const [selectedTag, setSelectedTag] = useState(null);

    // Données de l'utilisateur
    const [notes, setNotes] = useState([]);
    const [tags, setTags] = useState([]);
    const [stats, setStats] = useState(null);
    const [loadingData, setLoadingData] = useState(false);

    // Éditeur & Focus
    const [editingNoteId, setEditingNoteId] = useState(null); // null = pas d'éditeur, 'new' = nouvelle note, number = id
    const [focusNote, setFocusNote] = useState(null);

    // Thème (Dark / Light)
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("noteflow_theme") || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("noteflow_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === "dark" ? "light" : "dark"));
    };

    // Chargement de l'ensemble des données
    const loadAllData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [notesData, tagsData, statsData] = await Promise.all([
                api.getNotes(),
                api.getTags(),
                api.getStats()
            ]);
            setNotes(notesData);
            setTags(tagsData);
            setStats(statsData);
        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadAllData();
        }
    }, [user]);

    // Actions rapides sur les notes
    const handleToggleFavorite = async (noteId) => {
        try {
            const res = await api.toggleFavorite(noteId);
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_favorite: res.is_favorite } : n));
            showToast(res.message, "success");
            loadAllData();
        } catch (error) {
            showToast("Erreur favori", "error");
        }
    };

    const handleToggleArchive = async (noteId) => {
        try {
            const res = await api.toggleArchive(noteId);
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_archived: res.is_archived } : n));
            showToast(res.message, "success");
            loadAllData();
        } catch (error) {
            showToast("Erreur archivage", "error");
        }
    };

    const handleTogglePin = async (noteId) => {
        try {
            const res = await api.togglePin(noteId);
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_pinned: res.is_pinned } : n));
            showToast(res.message, "success");
            loadAllData();
        } catch (error) {
            showToast("Erreur épingle", "error");
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await api.deleteNote(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            showToast("Note supprimée", "success");
            loadAllData();
        } catch (error) {
            showToast("Erreur suppression", "error");
        }
    };

    // Écran de chargement initial
    if (loading) {
        return (
            <div className="app-splash-screen">
                <div className="splash-logo">
                    <Sparkles size={36} className="sparkle-anim text-pink" />
                    <h2>NoteFlow</h2>
                </div>
                <Loader2 size={24} className="spin-loader text-muted" />
            </div>
        );
    }

    // Écran de connexion / inscription
    if (!user) {
        return (
            <div className="auth-root-container">
                <ToastContainer />
                {authPage === "login" ? (
                    <Login onGoRegister={() => setAuthPage("register")} />
                ) : (
                    <Register onGoLogin={() => setAuthPage("login")} />
                )}
            </div>
        );
    }

    const categories = Array.from(new Set(notes.map(n => n.category))).filter(Boolean);

    return (
        <div className="app-layout">
            <ToastContainer />

            {/* Mode Focus immersif */}
            {focusNote && (
                <FocusMode
                    note={focusNote}
                    onExit={() => setFocusNote(null)}
                    onSaveUpdate={() => loadAllData()}
                />
            )}

            {/* Sidebar de navigation */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setEditingNoteId(null);
                }}
                onNewNote={() => setEditingNoteId("new")}
                tags={tags}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                theme={theme}
                toggleTheme={toggleTheme}
                stats={stats}
            />

            {/* Zone de contenu principale */}
            <main className="app-main-content">
                {editingNoteId !== null ? (
                    <NoteEditor
                        noteId={editingNoteId === "new" ? null : editingNoteId}
                        allNotes={notes}
                        allTags={tags}
                        onSaveSuccess={(savedId) => {
                            setEditingNoteId(null);
                            loadAllData();
                        }}
                        onClose={() => setEditingNoteId(null)}
                        onEnterFocus={(n) => setFocusNote(n)}
                        onRefreshTags={() => loadAllData()}
                    />
                ) : (
                    <>
                        {activeTab === "dashboard" && (
                            <Dashboard
                                user={user}
                                stats={stats}
                                notes={notes}
                                onSelectNote={(id) => setEditingNoteId(id)}
                                onNewNote={() => setEditingNoteId("new")}
                                onNavigate={(tab) => setActiveTab(tab)}
                                onEnterFocus={(n) => setFocusNote(n)}
                            />
                        )}

                        {activeTab === "notes" && (
                            <NotesList
                                notes={notes}
                                tags={tags}
                                categories={categories}
                                selectedTag={selectedTag}
                                setSelectedTag={setSelectedTag}
                                onSelectNote={(id) => setEditingNoteId(id)}
                                onNewNote={() => setEditingNoteId("new")}
                                onToggleFavorite={handleToggleFavorite}
                                onToggleArchive={handleToggleArchive}
                                onTogglePin={handleTogglePin}
                                onDeleteNote={handleDeleteNote}
                            />
                        )}

                        {activeTab === "favorites" && (
                            <NotesList
                                notes={notes}
                                tags={tags}
                                categories={categories}
                                selectedTag={selectedTag}
                                setSelectedTag={setSelectedTag}
                                onSelectNote={(id) => setEditingNoteId(id)}
                                onNewNote={() => setEditingNoteId("new")}
                                onToggleFavorite={handleToggleFavorite}
                                onToggleArchive={handleToggleArchive}
                                onTogglePin={handleTogglePin}
                                onDeleteNote={handleDeleteNote}
                                isFavoriteView={true}
                            />
                        )}

                        {activeTab === "archive" && (
                            <NotesList
                                notes={notes}
                                tags={tags}
                                categories={categories}
                                selectedTag={selectedTag}
                                setSelectedTag={setSelectedTag}
                                onSelectNote={(id) => setEditingNoteId(id)}
                                onNewNote={() => setEditingNoteId("new")}
                                onToggleFavorite={handleToggleFavorite}
                                onToggleArchive={handleToggleArchive}
                                onTogglePin={handleTogglePin}
                                onDeleteNote={handleDeleteNote}
                                isArchiveView={true}
                            />
                        )}

                        {activeTab === "graph" && (
                            <KnowledgeGraph
                                onSelectNote={(id) => setEditingNoteId(id)}
                                onNewNote={() => setEditingNoteId("new")}
                            />
                        )}

                        {activeTab === "ai" && (
                            <AISmartHub
                                notes={notes}
                                onSelectNote={(id) => setEditingNoteId(id)}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}