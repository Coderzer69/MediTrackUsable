"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required: No token provided' });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
        return res.status(401).json({ error: 'Authentication required: Invalid token format' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Fetch live user from database so role updates take effect immediately
        let liveUser = null;
        if (decoded.id) {
            liveUser = yield prisma_1.default.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true, email: true },
            });
        }
        req.user = {
            id: liveUser ? liveUser.id : decoded.id,
            role: liveUser ? liveUser.role : decoded.role,
            email: liveUser ? liveUser.email : decoded.email,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});
exports.authenticate = authenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        // ADMIN has superuser permission across all roles
        if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
