// Client API centralisé pour NoteFlow avec injection automatique du JWT

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

class ApiService {
    getToken() {
        return localStorage.getItem("noteflow_token");
    }

    setToken(token) {
        if (token) {
            localStorage.setItem("noteflow_token", token);
        } else {
            localStorage.removeItem("noteflow_token");
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Si session expirée, nettoyer le token
            if (response.status === 401 && !endpoint.includes("/auth/login")) {
                this.setToken(null);
                window.dispatchEvent(new Event("noteflow_session_expired"));
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = new Error(data.message || `Erreur HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
            throw error;
        }
    }

    // --- AUTH ---
    login(credentials) {
        return this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        });
    }

    register(data) {
        return this.request("/auth/register", {
            method: "POST",
            body: JSON.stringify(data)
        });
    }

    getProfile() {
        return this.request("/auth/me");
    }

    // --- STATS ---
    getStats() {
        return this.request("/notes/stats/overview");
    }

    // --- NOTES ---
    getNotes(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.tag) searchParams.append("tag", params.tag);
        if (params.category) searchParams.append("category", params.category);
        if (params.favorite) searchParams.append("favorite", "true");
        if (params.archived) searchParams.append("archived", "true");
        if (params.sort) searchParams.append("sort", params.sort);

        const qs = searchParams.toString();
        return this.request(`/notes${qs ? `?${qs}` : ""}`);
    }

    getNote(id) {
        return this.request(`/notes/${id}`);
    }

    createNote(data) {
        return this.request("/notes", {
            method: "POST",
            body: JSON.stringify(data)
        });
    }

    updateNote(id, data) {
        return this.request(`/notes/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        });
    }

    deleteNote(id) {
        return this.request(`/notes/${id}`, {
            method: "DELETE"
        });
    }

    toggleFavorite(id) {
        return this.request(`/notes/${id}/toggle-favorite`, {
            method: "POST"
        });
    }

    toggleArchive(id) {
        return this.request(`/notes/${id}/toggle-archive`, {
            method: "POST"
        });
    }

    togglePin(id) {
        return this.request(`/notes/${id}/toggle-pin`, {
            method: "POST"
        });
    }

    getNoteVersions(id) {
        return this.request(`/notes/${id}/versions`);
    }

    restoreNoteVersion(noteId, versionId) {
        return this.request(`/notes/${noteId}/versions/${versionId}/restore`, {
            method: "POST"
        });
    }

    // --- TAGS ---
    getTags() {
        return this.request("/tags");
    }

    createTag(data) {
        return this.request("/tags", {
            method: "POST",
            body: JSON.stringify(data)
        });
    }

    deleteTag(id) {
        return this.request(`/tags/${id}`, {
            method: "DELETE"
        });
    }

    // --- KNOWLEDGE GRAPH ---
    getGraphData() {
        return this.request("/graph");
    }

    createLink(source_note_id, target_note_id) {
        return this.request("/graph/links", {
            method: "POST",
            body: JSON.stringify({ source_note_id, target_note_id })
        });
    }

    deleteLink(source_note_id, target_note_id) {
        return this.request("/graph/links", {
            method: "DELETE",
            body: JSON.stringify({ source_note_id, target_note_id })
        });
    }

    // --- IA / SMART NOTES ---
    aiSummarize(title, content) {
        return this.request("/ai/summarize", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiGenerateTags(title, content) {
        return this.request("/ai/tags", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiImprove(title, content) {
        return this.request("/ai/improve", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiQuiz(title, content) {
        return this.request("/ai/quiz", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiStudySheet(title, content) {
        return this.request("/ai/study-sheet", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiConcepts(title, content) {
        return this.request("/ai/concepts", {
            method: "POST",
            body: JSON.stringify({ title, content })
        });
    }

    aiSuggestLinks(noteId) {
        return this.request("/ai/suggest-links", {
            method: "POST",
            body: JSON.stringify({ noteId })
        });
    }

    aiAskQuestion(question, content) {
        return this.request("/ai/ask", {
            method: "POST",
            body: JSON.stringify({ question, content })
        });
    }
}

export const api = new ApiService();
export default api;
