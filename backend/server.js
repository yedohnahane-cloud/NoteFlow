const express = require("express");
const db = require("./database/database");
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const cors = require("cors");
const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.get("/", (req, res) => {
    res.send("Bienvenue sur NoteFlow !");
});

app.listen(3000, () => {
    console.log("NoteFlow est lancé sur le port 3000");
});