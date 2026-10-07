import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const initAuth = async () => {
        const token = api.getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const data = await api.getProfile();
            setUser(data.user);
        } catch (error) {
            console.warn("Session expirée ou invalide");
            api.setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initAuth();

        const handleSessionExpired = () => {
            setUser(null);
        };
        window.addEventListener("noteflow_session_expired", handleSessionExpired);
        return () => window.removeEventListener("noteflow_session_expired", handleSessionExpired);
    }, []);

    const login = async (email, password) => {
        const data = await api.login({ email, password });
        api.setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (name, email, password) => {
        const data = await api.register({ name, email, password });
        api.setToken(data.token);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        api.setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
}
