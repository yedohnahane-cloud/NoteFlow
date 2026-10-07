import { 
    FileText, 
    Star, 
    Tag, 
    Share2, 
    Plus, 
    Sparkles, 
    Maximize2, 
    ArrowUpRight, 
    Clock, 
    Folder,
    BookOpen
} from "lucide-react";

export default function Dashboard({ 
    user, 
    stats, 
    notes = [], 
    onSelectNote, 
    onNewNote, 
    onNavigate, 
    onEnterFocus 
}) {
    const activeNotes = notes.filter(n => !n.is_archived);
    const pinnedNotes = activeNotes.filter(n => n.is_pinned);
    const recentNotes = [...activeNotes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="dashboard-view">
            {/* Header d'accueil */}
            <div className="view-header">
                <div>
                    <h2 className="view-title">Bonjour, {user?.name || "Cher utilisateur"} 👋</h2>
                    <p className="view-subtitle">Voici l'état de votre second cerveau aujourd'hui.</p>
                </div>
                <div className="header-actions">
                    <button type="button" className="btn-primary" onClick={onNewNote}>
                        <Plus size={16} />
                        <span>Créer une note</span>
                    </button>
                </div>
            </div>

            {/* Statistiques clés */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => onNavigate("notes")}>
                    <div className="stat-icon-wrapper stat-blue">
                        <FileText size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Notes actives</span>
                        <span className="stat-value">{stats?.totalNotes ?? activeNotes.length}</span>
                    </div>
                </div>

                <div className="stat-card" onClick={() => onNavigate("favorites")}>
                    <div className="stat-icon-wrapper stat-amber">
                        <Star size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Favoris</span>
                        <span className="stat-value">{stats?.totalFavorites ?? 0}</span>
                    </div>
                </div>

                <div className="stat-card" onClick={() => onNavigate("notes")}>
                    <div className="stat-icon-wrapper stat-emerald">
                        <Tag size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Tags créés</span>
                        <span className="stat-value">{stats?.totalTags ?? 0}</span>
                    </div>
                </div>

                <div className="stat-card" onClick={() => onNavigate("graph")}>
                    <div className="stat-icon-wrapper stat-purple">
                        <Share2 size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Connexions Graphe</span>
                        <span className="stat-value">{stats?.totalLinks ?? 0}</span>
                    </div>
                </div>
            </div>

            {/* Raccourcis d'action rapide */}
            <div className="quick-actions-section">
                <h3 className="section-title">Accès rapide</h3>
                <div className="quick-actions-grid">
                    <div className="quick-action-card" onClick={onNewNote}>
                        <div className="quick-action-icon bg-indigo-soft">
                            <Plus size={20} />
                        </div>
                        <div className="quick-action-details">
                            <h4>Nouvelle note</h4>
                            <p>Capturez une nouvelle idée instantanément</p>
                        </div>
                        <ArrowUpRight size={16} className="quick-action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => onNavigate("graph")}>
                        <div className="quick-action-icon bg-purple-soft">
                            <Share2 size={20} />
                        </div>
                        <div className="quick-action-details">
                            <h4>Knowledge Graph</h4>
                            <p>Visualisez les relations entre vos concepts</p>
                        </div>
                        <ArrowUpRight size={16} className="quick-action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => onNavigate("ai")}>
                        <div className="quick-action-icon bg-pink-soft">
                            <Sparkles size={20} />
                        </div>
                        <div className="quick-action-details">
                            <h4>Smart Notes & IA</h4>
                            <p>Résumés, quiz de révision et connexions auto</p>
                        </div>
                        <ArrowUpRight size={16} className="quick-action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => onEnterFocus(recentNotes[0] || null)}>
                        <div className="quick-action-icon bg-cyan-soft">
                            <Maximize2 size={20} />
                        </div>
                        <div className="quick-action-details">
                            <h4>Mode Focus</h4>
                            <p>Rédigez sans distraction en plein écran</p>
                        </div>
                        <ArrowUpRight size={16} className="quick-action-arrow" />
                    </div>
                </div>
            </div>

            <div className="dashboard-content-split">
                {/* Notes épinglées ou récentes */}
                <div className="dashboard-left">
                    <div className="split-header">
                        <h3 className="section-title">
                            {pinnedNotes.length > 0 ? "Notes épinglées" : "Dernières notes modifiées"}
                        </h3>
                        <button type="button" className="btn-link" onClick={() => onNavigate("notes")}>
                            Voir tout
                        </button>
                    </div>

                    {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).length === 0 ? (
                        <div className="empty-state-card">
                            <BookOpen size={36} className="empty-state-icon" />
                            <p className="empty-title">Aucune note pour le moment</p>
                            <p className="empty-description">Commencez par créer votre première note pour alimenter votre graphe.</p>
                            <button type="button" className="btn-primary" onClick={onNewNote}>
                                <Plus size={15} />
                                <span>Créer ma première note</span>
                            </button>
                        </div>
                    ) : (
                        <div className="recent-notes-list">
                            {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).map(note => (
                                <div 
                                    key={note.id} 
                                    className="recent-note-item"
                                    onClick={() => onSelectNote(note.id)}
                                >
                                    <div className="recent-note-main">
                                        <div className="recent-note-header">
                                            {note.is_pinned && <span className="pinned-badge">Épinglé</span>}
                                            <span className="category-tag">{note.category}</span>
                                            <span className="note-date">
                                                <Clock size={12} />
                                                {formatDate(note.updated_at)}
                                            </span>
                                        </div>
                                        <h4 className="recent-note-title">{note.title}</h4>
                                        <p className="recent-note-preview">
                                            {note.content ? note.content.substring(0, 120).replace(/^[#*>\-\s]+/, "") : "Note vide..."}
                                        </p>
                                    </div>
                                    {note.tags && note.tags.length > 0 && (
                                        <div className="recent-note-tags">
                                            {note.tags.map(t => (
                                                <span 
                                                    key={t.id} 
                                                    className="pill-tag"
                                                    style={{ borderLeftColor: t.color }}
                                                >
                                                    {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Catégories et répartition */}
                <div className="dashboard-right">
                    <h3 className="section-title">Thématiques & Catégories</h3>
                    <div className="categories-card">
                        {stats?.categories && stats.categories.length > 0 ? (
                            <div className="categories-list">
                                {stats.categories.map((cat, idx) => (
                                    <div key={idx} className="category-row">
                                        <div className="category-info">
                                            <Folder size={15} className="folder-icon" />
                                            <span className="category-name">{cat.category}</span>
                                        </div>
                                        <span className="category-count">{cat.count} note{cat.count > 1 ? "s" : ""}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">Aucune catégorie pour l'instant.</p>
                        )}
                    </div>

                    <div className="ai-tip-card">
                        <div className="ai-tip-header">
                            <Sparkles size={16} className="text-indigo" />
                            <h4>Astuce NoteFlow</h4>
                        </div>
                        <p>
                            Reliez vos notes entre elles en utilisant le sélecteur de connexions dans l'éditeur. Vos idées apparaîtront automatiquement connectées dans le Knowledge Graph !
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}