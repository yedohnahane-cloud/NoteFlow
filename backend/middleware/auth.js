const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "noteflow_secure_secret_token_key_change_in_production";

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Accès refusé. Token d'authentification manquant ou invalide."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, name }
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Session expirée ou token invalide. Veuillez vous reconnecter."
        });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
