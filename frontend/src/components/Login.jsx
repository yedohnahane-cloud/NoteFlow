import { useState } from "react";

function Login({ onLogin, onGoRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        const response = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            onLogin(data.user);
        } else {
            alert(data.message);
        }
    };

    return (
        <div className="auth-container">
            <h1>NoteFlow</h1>
            <h2>Connexion</h2>

            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">
                    Se connecter
                </button>
            </form>

            <button onClick={onGoRegister}>
                Créer un compte
            </button>
        </div>
    );
}

export default Login;