import { useState } from "react";
import { Sparkles, ArrowRight, Lock, Mail, User, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { showToast } from "./Toast";

export default function Register({ onGoLogin }) {
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (!name.trim() || !email.trim() || !password) {
            setError("Tous les champs sont obligatoires.");
            return;
        }

        if (password.length < 6) {
            setError("Le mot de passe doit comporter au moins 6 caractères.");
            return;
        }

        setLoading(true);
        try {
            await register(name.trim(), email.trim(), password);
            showToast("Compte créé avec succès ! Bienvenue sur NoteFlow.", "success");
        } catch (err) {
            setError(err.message || "Erreur lors de la création du compte.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo-badge">
                        <Sparkles size={24} className="sparkle-anim" />
                    </div>
                    <h2>Créer un compte NoteFlow</h2>
                    <p>Démarrez la gestion intelligente de vos connaissances</p>
                </div>

                {error && (
                    <div className="auth-error-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} className="auth-form">
                    <div className="form-field">
                        <label>Nom complet</label>
                        <div className="input-with-icon">
                            <User size={16} className="field-icon" />
                            <input
                                type="text"
                                placeholder="ex: Jean Dupont"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Adresse email</label>
                        <div className="input-with-icon">
                            <Mail size={16} className="field-icon" />
                            <input
                                type="email"
                                placeholder="nom@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Mot de passe (min. 6 caractères)</label>
                        <div className="input-with-icon">
                            <Lock size={16} className="field-icon" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-auth-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 size={16} className="spin-loader" />
                                <span>Création en cours...</span>
                            </>
                        ) : (
                            <>
                                <span>Créer mon compte</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Vous possédez déjà un compte ?</span>
                    <button type="button" className="btn-link-action" onClick={onGoLogin}>
                        Se connecter
                    </button>
                </div>
            </div>
        </div>
    );
}