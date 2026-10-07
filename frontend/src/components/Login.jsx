import { useState } from "react";
import { Sparkles, ArrowRight, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { showToast } from "./Toast";

export default function Login({ onGoRegister }) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Veuillez renseigner votre email et mot de passe.");
            return;
        }

        setLoading(true);
        try {
            await login(email.trim(), password);
            showToast("Connexion réussie ! Bienvenue sur NoteFlow.", "success");
        } catch (err) {
            setError(err.message || "Email ou mot de passe incorrect.");
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
                    <h2>Connexion à NoteFlow</h2>
                    <p>Accédez à votre espace de gestion des connaissances et IA</p>
                </div>

                {error && (
                    <div className="auth-error-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="auth-form">
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
                        <label>Mot de passe</label>
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
                                <span>Connexion en cours...</span>
                            </>
                        ) : (
                            <>
                                <span>Se connecter</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Pas encore de compte ?</span>
                    <button type="button" className="btn-link-action" onClick={onGoRegister}>
                        Créer un compte gratuitement
                    </button>
                </div>
            </div>
        </div>
    );
}