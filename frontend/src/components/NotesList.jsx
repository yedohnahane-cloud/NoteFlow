import { useState } from "react";
import { 
    Search, 
    Plus, 
    Star, 
    Archive, 
    Trash2, 
    Pin, 
    Share2, 
    History, 
    Folder, 
    SlidersHorizontal,
    X,
    LayoutGrid,
    List,
    Clock,
    FileText
} from "lucide-react";

export default function NotesList({ 
    notes = [], 
    tags = [], 
    categories = [],
    selectedTag, 
    setSelectedTag,
    onSelectNote, 
    onNewNote,
    onToggleFavorite,
    onToggleArchive,
    onTogglePin,
    onDeleteNote,
    isArchiveView = false,
    isFavoriteView = false
}) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

    // Filtrage côté client pour une réactivité instantanée à 60 FPS
    const filteredNotes = notes.filter(note => {
        // Filtre vue archive vs normale vs favoris
        if (isArchiveView) {
            if (!note.is_archived) return false;
        } else if (isFavoriteView) {
            if (!note.is_favorite || note.is_archived) return false;
        } else {
            if (note.is_archived) return false;
        }

        // Filtre recherche textuelle
        if (search.trim()) {
            const query = search.toLowerCase();
            const inTitle = note.title.toLowerCase().includes(query);
            const inContent = note.content.toLowerCase().includes(query);
            const inTags = (note.tags || []).some(t => t.name.toLowerCase().includes(query));
            if (!inTitle && !inContent && !inTags) return false;
        }

        // Filtre catégorie
        if (selectedCategory && note.category !== selectedCategory) {
            return false;
        }

        // Filtre tag
        if (selectedTag && !(note.tags || []).some(t => t.name === selectedTag)) {
            return false;
        }

        return true;
    });

    // Tri
    const sortedNotes = [...filteredNotes].sort((a, b) => {
        // Toujours garder les épinglés en tête pour la vue active
        if (!isArchiveView && a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
        }

        if (sortBy === "oldest") {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        if (sortBy === "title_asc") {
            return a.title.localeCompare(b.title);
        }
        if (sortBy === "title_desc") {
            return b.title.localeCompare(a.title);
        }
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short"
        });
    };

    return (
        <div className="notes-list-view">
            {/* Header de la vue */}
            <div className="view-header">
                <div>
                    <h2 className="view-title">
                        {isArchiveView ? "Notes Archivées" : isFavoriteView ? "Notes Favorites" : "Toutes les Notes"}
                    </h2>
                    <p className="view-subtitle">
                        {sortedNotes.length} note{sortedNotes.length > 1 ? "s" : ""} trouvée{sortedNotes.length > 1 ? "s" : ""}
                        {selectedTag && ` • Tag: #${selectedTag}`}
                        {selectedCategory && ` • Catégorie: ${selectedCategory}`}
                    </p>
                </div>

                {!isArchiveView && (
                    <div className="header-actions">
                        <button type="button" className="btn-primary" onClick={onNewNote}>
                            <Plus size={16} />
                            <span>Nouvelle note</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Barre de recherche et contrôles de filtres */}
            <div className="search-filters-bar">
                <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par titre, contenu, ou tag..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                    {search && (
                        <button type="button" className="btn-clear-search" onClick={() => setSearch("")}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="filters-group">
                    {/* Sélecteur de Catégorie */}
                    <div className="select-wrapper">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Toutes les catégories</option>
                            {categories.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sélecteur de Tri */}
                    <div className="select-wrapper">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="recent">Plus récentes</option>
                            <option value="oldest">Plus anciennes</option>
                            <option value="title_asc">Titre (A - Z)</option>
                            <option value="title_desc">Titre (Z - A)</option>
                        </select>
                    </div>

                    {/* Bascule Mode Grille / Liste */}
                    <div className="view-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                            title="Vue en grille"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                            title="Vue en liste"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Barre des tags actifs */}
            {selectedTag && (
                <div className="active-filter-badge">
                    <span>Filtre tag : <strong>#{selectedTag}</strong></span>
                    <button type="button" onClick={() => setSelectedTag(null)}>
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* Liste / Grille des notes */}
            {sortedNotes.length === 0 ? (
                <div className="empty-results-card">
                    <FileText size={42} className="empty-icon" />
                    <h3>Aucune note ne correspond à votre recherche</h3>
                    <p>Essayez de modifier vos filtres ou de créer une nouvelle note.</p>
                    {search || selectedTag || selectedCategory ? (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setSearch("");
                                setSelectedTag(null);
                                setSelectedCategory("");
                            }}
                        >
                            Réinitialiser les filtres
                        </button>
                    ) : (
                        <button type="button" className="btn-primary" onClick={onNewNote}>
                            <Plus size={15} />
                            <span>Créer une note</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className={`notes-container notes-${viewMode}`}>
                    {sortedNotes.map(note => (
                        <article 
                            key={note.id} 
                            className={`note-card ${note.is_pinned ? "is-pinned" : ""}`}
                            onClick={() => onSelectNote(note.id)}
                        >
                            <div className="note-card-header">
                                <div className="note-badges">
                                    {note.is_pinned && (
                                        <span className="badge-pinned" title="Épinglée">
                                            <Pin size={12} /> Épinglé
                                        </span>
                                    )}
                                    <span className="badge-category">{note.category}</span>
                                </div>

                                <div className="note-quick-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className={`icon-action ${note.is_favorite ? "favorite-active" : ""}`}
                                        onClick={() => onToggleFavorite(note.id)}
                                        title={note.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                                    >
                                        <Star size={15} />
                                    </button>

                                    {!isArchiveView && (
                                        <button
                                            type="button"
                                            className={`icon-action ${note.is_pinned ? "pin-active" : ""}`}
                                            onClick={() => onTogglePin(note.id)}
                                            title={note.is_pinned ? "Désépingler" : "Épingler en haut"}
                                        >
                                            <Pin size={15} />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="icon-action"
                                        onClick={() => onToggleArchive(note.id)}
                                        title={note.is_archived ? "Désarchiver" : "Archiver la note"}
                                    >
                                        <Archive size={15} />
                                    </button>

                                    <button
                                        type="button"
                                        className="icon-action action-delete"
                                        onClick={() => {
                                            if (window.confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
                                                onDeleteNote(note.id);
                                            }
                                        }}
                                        title="Supprimer la note"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="note-card-title">{note.title}</h3>

                            <p className="note-card-excerpt">
                                {note.content ? note.content.substring(0, 150).replace(/^[#*>\-\s]+/, "") : "Note vide..."}
                            </p>

                            {/* Tags de la note */}
                            {note.tags && note.tags.length > 0 && (
                                <div className="note-card-tags">
                                    {note.tags.map(t => (
                                        <span 
                                            key={t.id} 
                                            className="tag-chip"
                                            style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}40` }}
                                        >
                                            #{t.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Footer de la carte */}
                            <div className="note-card-footer">
                                <span className="footer-date">
                                    <Clock size={12} />
                                    {formatDate(note.updated_at)}
                                </span>

                                <div className="footer-indicators">
                                    {note.links_count > 0 && (
                                        <span className="indicator-item" title={`${note.links_count} liaison(s) dans le graphe`}>
                                            <Share2 size={12} /> {note.links_count}
                                        </span>
                                    )}
                                    {note.versions_count > 0 && (
                                        <span className="indicator-item" title={`${note.versions_count} version(s) d'historique`}>
                                            <History size={12} /> {note.versions_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
