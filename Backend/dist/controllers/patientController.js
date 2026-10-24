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
exports.updateAccessRequest = exports.getAccessRequests = exports.getTreatments = exports.updatePassword = exports.updateProfile = exports.getProfile = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const profile = yield prisma_1.default.patientProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, email: true, createdAt: true } },
            },
        });
        if (!profile)
            return res.status(404).json({ error: 'Profile not found' });
        res.json(profile);
    }
    catch (error) {
        console.error('Error fetching patient profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getProfile = getProfile;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        const existingEmail = yield prisma_1.default.user.findFirst({
            where: {
                email: email.trim().toLowerCase(),
                NOT: { id: userId },
            },
        });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email is already in use by another account' });
        }
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: userId },
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
            },
            include: {
                patientProfile: true,
            },
        });
        yield (0, auditLogger_1.logAudit)(userId, 'PATIENT_UPDATE_PROFILE', req, {
            name: updatedUser.name,
            email: updatedUser.email,
        });
        res.json({
            message: 'Profile updated successfully',
            profile: updatedUser.patientProfile,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
            },
        });
    }
    catch (error) {
        console.error('Error updating patient profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateProfile = updateProfile;
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });
        if (!user || !user.passwordHash) {
            return res.status(400).json({ error: 'Password update is not available for this account' });
        }
        const isMatch = yield bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        const newPasswordHash = yield bcrypt_1.default.hash(newPassword, 10);
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        yield (0, auditLogger_1.logAudit)(userId, 'PATIENT_UPDATE_PASSWORD', req);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Error updating patient password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updatePassword = updatePassword;
const getTreatments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Patients can only view CONFIRMED treatments
        const treatments = yield prisma_1.default.treatment.findMany({
            where: { patientId: userId, status: 'CONFIRMED' },
            include: {
                doctor: { select: { name: true } },
                prescriptions: true,
                amendments: true,
            },
            orderBy: { confirmedAt: 'desc' },
        });
        res.json(treatments);
    }
    catch (error) {
        console.error('Error fetching patient treatments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getTreatments = getTreatments;
const getAccessRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const requests = yield prisma_1.default.historyAccessRequest.findMany({
            where: { patientId: userId },
            include: {
                doctor: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching access requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAccessRequests = getAccessRequests;
const updateAccessRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestId = req.params.id;
        const userId = req.user.id;
        const { status } = req.body;
        if (!['APPROVED', 'DENIED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be APPROVED or DENIED.' });
        }
        const request = yield prisma_1.default.historyAccessRequest.findFirst({
            where: { id: requestId, patientId: userId },
        });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Can only update PENDING requests' });
        }
        let expiresAt = null;
        if (status === 'APPROVED') {
            // Grant access for 24 hours
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
        }
        const updatedRequest = yield prisma_1.default.historyAccessRequest.update({
            where: { id: requestId },
            data: { status: status, expiresAt },
        });
        yield (0, auditLogger_1.logAudit)(userId, 'PATIENT_UPDATE_ACCESS_REQUEST', req, {
            requestId,
            doctorId: request.doctorId,
            status,
            expiresAt,
        });
        res.json({ message: `Access request ${status}`, request: updatedRequest });
    }
    catch (error) {
        console.error('Error updating access request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateAccessRequest = updateAccessRequest;
