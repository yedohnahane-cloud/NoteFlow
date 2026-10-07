import { useEffect, useState } from "react";

function Dashboard({ user, onLogout }) {
    const [notes, setNotes] = useState([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const loadNotes = async () => {
        const response = await fetch("http://localhost:3000/api/notes");
        const data = await response.json();

        setNotes(
            data.filter((note) => note.user_id === user.id)
        );
    };

    useEffect(() => {
        loadNotes();
    }, []);

    const createNote = async (e) => {
        e.preventDefault();

        const response = await fetch("http://localhost:3000/api/notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                title,
                content
            })
        });

        if (response.ok) {
            setTitle("");
            setContent("");
            loadNotes();
        }
    };

    const deleteNote = async (id) => {
        await fetch(`http://localhost:3000/api/notes/${id}`, {
            method: "DELETE"
        });

        loadNotes();
    };

    return (
        <div className="dashboard">
            <header>
                <h1>NoteFlow</h1>

                <div>
                    <span>Bonjour {user.name} 👋</span>
                    <button onClick={onLogout}>
                        Déconnexion
                    </button>
                </div>
            </header>

            <main>
                <section>
                    <h2>Nouvelle note</h2>

                    <form onSubmit={createNote}>
                        <input
                            type="text"
                            placeholder="Titre"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <textarea
                            placeholder="Écris ta note..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />

                        <button type="submit">
                            Ajouter la note
                        </button>
                    </form>
                </section>

                <section>
                    <h2>Mes notes</h2>

                    {notes.length === 0 ? (
                        <p>Aucune note pour le moment.</p>
                    ) : (
                        notes.map((note) => (
                            <article key={note.id}>
                                <h3>{note.title}</h3>
                                <p>{note.content}</p>

                                <button onClick={() => deleteNote(note.id)}>
                                    Supprimer
                                </button>
                            </article>
                        ))
                    )}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;