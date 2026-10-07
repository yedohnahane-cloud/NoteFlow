const express = require("express");

const app = express();

const db = require("./database/database");
app.use("/api/auth", authRoutes);
app.get("/", (req, res) => {
    res.send("Bienvenue sur NoteFlow !");
});

app.listen(3000, () => {
    console.log("NoteFlow est lancé sur le port 3000");
});
app.use(express.json());