"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;
    if (!token)
        return res.status(401).json({ error: "Access token missing" });
    jsonwebtoken_1.default.verify(String(token), process.env.JWT_SECRET || "supersecret", (err, user) => {
        if (err)
            return res.status(403).json({ error: "Invalid or expired token" });
        req.user = user;
        next();
    });
};
exports.verifyToken = verifyToken;
const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== "ADMIN") {
        return res
            .status(403)
            .json({ error: "Unauthorized: Admin access required" });
    }
    next();
};
exports.verifyAdmin = verifyAdmin;
