import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

function App() {
    const [page, setPage] = useState("login");
    const [user, setUser] = useState(null);

    if (user) {
        return (
            <Dashboard
                user={user}
                onLogout={() => setUser(null)}
            />
        );
    }

    if (page === "register") {
        return (
            <Register
                onRegister={() => setPage("login")}
            />
        );
    }

    return (
        <Login
            onLogin={(user) => setUser(user)}
            onGoRegister={() => setPage("register")}
        />
    );
}

export default App;