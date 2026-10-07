import { useEffect, useRef, useState } from "react";
import { 
    Search, 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    Share2, 
    Plus, 
    X, 
    Check, 
    Trash2, 
    Layers, 
    ExternalLink 
} from "lucide-react";
import api from "../services/api";
import { showToast } from "./Toast";

// Palette de couleurs pour les catégories
const CATEGORY_COLORS = {
    "Général": "#6366f1",
    "Architecture": "#ec4899",
    "Frontend": "#3b82f6",
    "Backend": "#10b981",
    "Base de données": "#f59e0b",
    "IA & Data": "#8b5cf6",
    "Cours": "#06b6d4",
    "Projet": "#14b8a6"
};

export default function KnowledgeGraph({ onSelectNote, onNewNote }) {
    const canvasRef = useRef(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedNode, setSelectedNode] = useState(null);

    // Modal pour ajouter un lien entre deux notes
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkSource, setLinkSource] = useState("");
    const [linkTarget, setLinkTarget] = useState("");

    // États de la vue Canvas (pan, zoom, simulation)
    const transformRef = useRef({ x: 0, y: 0, scale: 1 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const draggedNodeRef = useRef(null);
    const simulationNodesRef = useRef([]);

    // Chargement des données du graphe
    const loadGraph = async () => {
        setLoading(true);
        try {
            const data = await api.getGraphData();
            setGraphData(data);
            initSimulation(data.nodes, data.links);
        } catch (error) {
            showToast("Erreur lors du chargement du graphe", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGraph();
    }, []);

    // Initialisation des positions physiques des nœuds (Force layout)
    const initSimulation = (nodes, links) => {
        const width = 800;
        const height = 600;
        const radius = Math.min(width, height) * 0.35;

        // Positionnement initial en cercle avec dispersion
        const simNodes = nodes.map((node, i) => {
            const angle = (i / Math.max(1, nodes.length)) * 2 * Math.PI;
            const dist = radius * (0.5 + Math.random() * 0.5);
            return {
                ...node,
                x: width / 2 + Math.cos(angle) * dist,
                y: height / 2 + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                radius: 12 + Math.min(18, (node.val || 1) * 3),
                color: CATEGORY_COLORS[node.category] || "#6366f1"
            };
        });

        simulationNodesRef.current = simNodes;
    };

    // Moteur physique et boucle de rendu Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;

        // Adaptation de la taille du canvas
        const resizeCanvas = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Boucle de rendu
        const render = () => {
            const width = canvas.width;
            const height = canvas.height;
            const nodes = simulationNodesRef.current;
            const links = graphData.links;

            // Forces de répulsion et d'attraction (Force-Directed Graph)
            const kRepulsion = 1800;
            const kCenter = 0.005;

            // Répulsion entre nœuds
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[j].x - nodes[i].x;
                    const dy = nodes[j].y - nodes[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 350) {
                        const force = kRepulsion / (dist * dist);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        nodes[i].vx -= fx;
                        nodes[i].vy -= fy;
                        nodes[j].vx += fx;
                        nodes[j].vy += fy;
                    }
                }
            }

            // Attraction le long des liens
            links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (source && target) {
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (dist - 120) * 0.03;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    source.vx += fx;
                    source.vy += fy;
                    target.vx -= fx;
                    target.vy -= fy;
                }
            });

            // Gravité vers le centre et amortissement
            const centerX = width / 2;
            const centerY = height / 2;
            nodes.forEach(node => {
                if (node !== draggedNodeRef.current) {
                    node.vx += (centerX - node.x) * kCenter;
                    node.vy += (centerY - node.y) * kCenter;
                    node.x += node.vx;
                    node.y += node.vy;
                    node.vx *= 0.85; // Amortissement
                    node.vy *= 0.85;
                }
            });

            // Effacement et fond
            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.translate(transformRef.current.x, transformRef.current.y);
            ctx.scale(transformRef.current.scale, transformRef.current.scale);

            // Dessin des arêtes (liens)
            links.forEach(link => {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                if (source && target) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
                    ctx.lineWidth = 1.8;
                    ctx.stroke();

                    // Petite flèche ou marqueur au milieu
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;
                    ctx.beginPath();
                    ctx.arc(midX, midY, 2.5, 0, 2 * Math.PI);
                    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
                    ctx.fill();
                }
            });

            // Dessin des nœuds (notes)
            nodes.forEach(node => {
                const isMatchSearch = !search || node.title.toLowerCase().includes(search.toLowerCase());
                const isMatchCat = !selectedCategory || node.category === selectedCategory;
                const isDimmed = !isMatchSearch || !isMatchCat;

                ctx.save();
                ctx.globalAlpha = isDimmed ? 0.25 : 1;

                // Halo de lueur pour le nœud sélectionné
                if (selectedNode && selectedNode.id === node.id) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.radius + 8, 0, 2 * Math.PI);
                    ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
                    ctx.fill();
                    ctx.strokeStyle = "#6366f1";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Disque du nœud
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
                ctx.fillStyle = node.color;
                ctx.shadowColor = node.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Bordure
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Libellé texte du nœud
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 11px system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Affichage tronqué du titre sous le nœud
                const labelY = node.y + node.radius + 14;
                ctx.fillStyle = isDimmed ? "#64748b" : "#e2e8f0";
                ctx.font = "500 12px system-ui, sans-serif";
                const displayTitle = node.title.length > 20 ? `${node.title.slice(0, 18)}...` : node.title;
                ctx.fillText(displayTitle, node.x, labelY);

                ctx.restore();
            });

            ctx.restore();
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [graphData, search, selectedCategory, selectedNode]);

    // Gestion des événements souris pour le Pan, Zoom et Drag des nœuds
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const { x, y, scale } = transformRef.current;
        return {
            x: (clientX - x) / scale,
            y: (clientY - y) / scale,
            screenX: clientX,
            screenY: clientY
        };
    };

    const handleMouseDown = (e) => {
        const coords = getCanvasCoords(e);
        const nodes = simulationNodesRef.current;

        // Vérifier si un nœud a été cliqué
        const clickedNode = nodes.find(node => {
            const dx = node.x - coords.x;
            const dy = node.y - coords.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius + 4;
        });

        if (clickedNode) {
            draggedNodeRef.current = clickedNode;
            setSelectedNode(clickedNode);
        } else {
            isDraggingRef.current = true;
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            setSelectedNode(null);
        }
    };

    const handleMouseMove = (e) => {
        if (draggedNodeRef.current) {
            const coords = getCanvasCoords(e);
            draggedNodeRef.current.x = coords.x;
            draggedNodeRef.current.y = coords.y;
            draggedNodeRef.current.vx = 0;
            draggedNodeRef.current.vy = 0;
        } else if (isDraggingRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            transformRef.current.x += dx;
            transformRef.current.y += dy;
            dragStartRef.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        draggedNodeRef.current = null;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(2.5, Math.max(0.4, transformRef.current.scale * zoomFactor));
        transformRef.current.scale = newScale;
    };

    const handleResetView = () => {
        transformRef.current = { x: 0, y: 0, scale: 1 };
        setSelectedNode(null);
    };

    // Création d'un nouveau lien
    const handleCreateLink = async (e) => {
        e.preventDefault();
        if (!linkSource || !linkTarget) {
            showToast("Veuillez sélectionner deux notes", "error");
            return;
        }
        if (linkSource === linkTarget) {
            showToast("Impossible de relier une note à elle-même", "error");
            return;
        }

        try {
            await api.createLink(linkSource, linkTarget);
            showToast("Liaison créée avec succès !", "success");
            setShowLinkModal(false);
            setLinkSource("");
            setLinkTarget("");
            loadGraph();
        } catch (error) {
            showToast("Erreur lors de la création du lien", "error");
        }
    };

    // Suppression d'un lien
    const handleDeleteLink = async (sourceId, targetId) => {
        try {
            await api.deleteLink(sourceId, targetId);
            showToast("Lien supprimé", "success");
            loadGraph();
        } catch (error) {
            showToast("Erreur lors de la suppression du lien", "error");
        }
    };

    const categories = Array.from(new Set(graphData.nodes.map(n => n.category))).filter(Boolean);

    return (
        <div className="knowledge-graph-view">
            {/* Barre de contrôle supérieure */}
            <div className="graph-toolbar">
                <div className="graph-search-group">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Filtrer un concept dans le graphe..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="graph-search-input"
                    />
                </div>

                <div className="graph-category-filter">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="graph-select"
                    >
                        <option value="">Toutes les thématiques</option>
                        {categories.map((c, i) => (
                            <option key={i} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="graph-actions-group">
                    <button 
                        type="button" 
                        className="btn-graph-action" 
                        onClick={() => {
                            transformRef.current.scale = Math.min(2.5, transformRef.current.scale * 1.2);
                        }}
                        title="Zoom avant"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button 
                        type="button" 
                        className="btn-graph-action" 
                        onClick={() => {
                            transformRef.current.scale = Math.max(0.4, transformRef.current.scale * 0.8);
                        }}
                        title="Zoom arrière"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button 
                        type="button" 
                        className="btn-graph-action" 
                        onClick={handleResetView}
                        title="Recentrer la vue"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button 
                        type="button" 
                        className="btn-primary" 
                        onClick={() => setShowLinkModal(true)}
                    >
                        <Plus size={15} />
                        <span>Créer un lien</span>
                    </button>
                </div>
            </div>

            {/* Conteneur du Canvas */}
            <div className="graph-canvas-container">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                    className="graph-canvas"
                />

                {/* Légende flottante */}
                <div className="graph-legend-card">
                    <span className="legend-title">Légende thématique</span>
                    <div className="legend-items">
                        {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([cat, col]) => (
                            <div key={cat} className="legend-row">
                                <span className="legend-dot" style={{ backgroundColor: col }} />
                                <span className="legend-name">{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Carte de détails du nœud sélectionné */}
                {selectedNode && (
                    <div className="node-detail-floating-card">
                        <div className="floating-card-header">
                            <span 
                                className="floating-badge-cat" 
                                style={{ backgroundColor: `${selectedNode.color}25`, color: selectedNode.color }}
                            >
                                {selectedNode.category}
                            </span>
                            <button type="button" onClick={() => setSelectedNode(null)} className="btn-close-float">
                                <X size={14} />
                            </button>
                        </div>

                        <h4 className="floating-node-title">{selectedNode.title}</h4>

                        {selectedNode.tags && selectedNode.tags.length > 0 && (
                            <div className="floating-node-tags">
                                {selectedNode.tags.map((t, idx) => (
                                    <span key={idx} className="floating-tag">#{t}</span>
                                ))}
                            </div>
                        )}

                        <div className="floating-actions">
                            <button 
                                type="button" 
                                className="btn-primary btn-full"
                                onClick={() => onSelectNote(selectedNode.id)}
                            >
                                <ExternalLink size={14} />
                                <span>Ouvrir la note</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de création de lien */}
            {showLinkModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <Share2 size={18} className="text-purple" />
                                <h3>Relier deux notes entre elles</h3>
                            </div>
                            <button type="button" onClick={() => setShowLinkModal(false)} className="btn-modal-close">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLink} className="modal-form">
                            <div className="form-group">
                                <label>Note source :</label>
                                <select 
                                    value={linkSource} 
                                    onChange={(e) => setLinkSource(e.target.value)}
                                    className="modal-select"
                                    required
                                >
                                    <option value="">Sélectionnez la première note...</option>
                                    {graphData.nodes.map(n => (
                                        <option key={n.id} value={n.id}>{n.title} ({n.category})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Note cible à connecter :</label>
                                <select 
                                    value={linkTarget} 
                                    onChange={(e) => setLinkTarget(e.target.value)}
                                    className="modal-select"
                                    required
                                >
                                    <option value="">Sélectionnez la seconde note...</option>
                                    {graphData.nodes.filter(n => String(n.id) !== String(linkSource)).map(n => (
                                        <option key={n.id} value={n.id}>{n.title} ({n.category})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowLinkModal(false)}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    Créer la connexion
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
