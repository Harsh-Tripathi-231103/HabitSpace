import { verifyToken } from "../utils/jwt.js";
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing bearer token" });
        return;
    }
    const token = authHeader.slice("Bearer ".length);
    try {
        const payload = verifyToken(token);
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
    }
}
