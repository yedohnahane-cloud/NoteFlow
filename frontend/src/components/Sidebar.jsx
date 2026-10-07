import { 
    LayoutDashboard, 
    FileText, 
    Star, 
    Share2, 
    Sparkles, 
    Maximize2, 
    Archive, 
    Plus, 
    LogOut, 
    Tag,
    ChevronRight,
    Moon,
    Sun
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ 
    activeTab, 
    setActiveTab, 
    onNewNote, 
    tags = [], 
    selectedTag, 
    setSelectedTag,
    theme,
    toggleTheme,
    stats
}) {
    const { user, logout } = useAuth();

    const navItems = [
        { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { id: "notes", label: "Toutes les notes", icon: FileText, badge: stats?.totalNotes },
        { id: "favorites", label: "Favoris", icon: Star, badge: stats?.totalFavorites },
        { id: "graph", label: "Knowledge Graph", icon: Share2, badge: stats?.totalLinks },
        { id: "ai", label: "Assistant IA", icon: Sparkles },
        { id: "archive", label: "Archives", icon: Archive, badge: stats?.totalArchived }
    ];

    return (
        <aside className="app-sidebar">
            <div className="sidebar-header">
                <div className="logo-brand">
                    <div className="logo-icon-wrapper">
                        <Sparkles size={20} className="logo-sparkle" />
                    </div>
                    <div>
                        <h1 className="logo-title">NoteFlow</h1>
                        <span className="logo-subtitle">Second Brain OS</span>
                    </div>
                </div>

                <button 
                    type="button" 
                    className="btn-new-note"
                    onClick={onNewNote}
                >
                    <Plus size={16} />
                    <span>Nouvelle note</span>
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Espace de travail</div>
                <ul className="nav-list">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    className={`nav-button ${isActive ? "active" : ""}`}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setSelectedTag(null);
                                    }}
                                >
                                    <Icon size={18} className="nav-icon" />
                                    <span className="nav-label">{item.label}</span>
                                    {typeof item.badge === "number" && item.badge > 0 && (
                                        <span className="nav-badge">{item.badge}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {tags.length > 0 && (
                    <div className="tags-section">
                        <div className="nav-section-label">
                            <Tag size={13} />
                            <span>Tags & Thématiques</span>
                        </div>
                        <ul className="tags-list">
                            {tags.slice(0, 8).map(tag => (
                                <li key={tag.id}>
                                    <button
                                        type="button"
                                        className={`tag-button ${selectedTag === tag.name ? "active" : ""}`}
                                        onClick={() => {
                                            setActiveTab("notes");
                                            setSelectedTag(selectedTag === tag.name ? null : tag.name);
                                        }}
                                    >
                                        <span 
                                            className="tag-dot" 
                                            style={{ backgroundColor: tag.color || '#6366f1' }}
                                        />
                                        <span className="tag-name">{tag.name}</span>
                                        <span className="tag-count">{tag.notes_count || 0}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.name}</div>
                        <div className="user-email">{user?.email}</div>
                    </div>
                </div>

                <div className="footer-actions">
                    <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={toggleTheme}
                        title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                    >
                        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                    <button 
                        type="button" 
                        className="btn-icon btn-logout" 
                        onClick={logout}
                        title="Se déconnecter"
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
