const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database");

const router = express.Router();

router.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Tous les champs sont obligatoires"
        });
    }
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email et mot de passe obligatoires"
        });
    }

    const user = db.prepare(
        "SELECT * FROM users WHERE email = ?"
    ).get(email);

    if (!user) {
        return res.status(401).json({
            message: "Email ou mot de passe incorrect"
        });
    }

    const passwordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordCorrect) {
        return res.status(401).json({
            message: "Email ou mot de passe incorrect"
        });
    }

    res.json({
        message: "Connexion réussie",
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
});
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const statement = db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `);

        statement.run(name, email, hashedPassword);

        res.status(201).json({
            message: "Utilisateur créé avec succès"
        });

    } catch (error) {
        res.status(400).json({
            message: "Cet email est peut-être déjà utilisé"
        });
    }
});

module.exports = router;