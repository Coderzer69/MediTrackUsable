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
exports.logAudit = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const logAudit = (userId, action, req, details) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const rawIp = (req === null || req === void 0 ? void 0 : req.headers['x-forwarded-for']) || ((_a = req === null || req === void 0 ? void 0 : req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || (req === null || req === void 0 ? void 0 : req.ip);
        const ip = typeof rawIp === 'string'
            ? rawIp.split(',')[0].trim()
            : Array.isArray(rawIp)
                ? rawIp[0]
                : '127.0.0.1';
        yield prisma_1.default.auditLog.create({
            data: {
                userId,
                action,
                details: Object.assign({ ip, userAgent: (req === null || req === void 0 ? void 0 : req.headers['user-agent']) || 'unknown' }, details),
            },
        });
    }
    catch (error) {
        console.error('Audit log creation error:', error);
    }
});
exports.logAudit = logAudit;
