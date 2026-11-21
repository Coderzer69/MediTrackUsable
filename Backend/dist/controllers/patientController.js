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
exports.deleteAvatar = exports.uploadAvatar = exports.downloadDocument = exports.deleteDocument = exports.uploadDocument = exports.getDocuments = exports.updateAccessRequest = exports.getAccessRequests = exports.getTreatments = exports.updatePassword = exports.updateProfile = exports.getProfile = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const qrGenerator_1 = require("../utils/qrGenerator");
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        let profile = yield prisma_1.default.patientProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
            },
        });
        // Auto-create patient profile with unique QR code if missing
        if (!profile) {
            let unique = false;
            let qrCode = '';
            while (!unique) {
                qrCode = (0, qrGenerator_1.generatePatientQrCodeId)();
                const existingQr = yield prisma_1.default.patientProfile.findUnique({
                    where: { qrCodeIdentifier: qrCode },
                });
                if (!existingQr) {
                    unique = true;
                }
            }
            profile = yield prisma_1.default.patientProfile.create({
                data: {
                    userId,
                    qrCodeIdentifier: qrCode,
                },
                include: {
                    user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
                },
            });
        }
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
const getDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientId = req.user.id;
        const documents = yield prisma_1.default.patientDocument.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching patient documents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDocuments = getDocuments;
const uploadDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Please select a file to upload' });
        }
        const { title, category } = req.body;
        const validCategories = ['CHECKUP', 'PRESCRIPTION', 'LAB_REPORT', 'OTHER'];
        const assignedCategory = validCategories.includes(category) ? category : 'OTHER';
        const assignedTitle = (title && typeof title === 'string' && title.trim())
            ? title.trim()
            : file.originalname;
        const fileUrl = `/uploads/${file.filename}`;
        const newDocument = yield prisma_1.default.patientDocument.create({
            data: {
                patientId,
                title: assignedTitle,
                fileName: file.originalname,
                fileUrl,
                fileType: file.mimetype || path_1.default.extname(file.originalname).replace('.', ''),
                fileSize: file.size,
                category: assignedCategory,
            },
        });
        yield (0, auditLogger_1.logAudit)(patientId, 'PATIENT_UPLOAD_DOCUMENT', req, {
            documentId: newDocument.id,
            fileName: file.originalname,
            category: assignedCategory,
            fileSize: file.size,
        });
        res.status(201).json(newDocument);
    }
    catch (error) {
        console.error('Error uploading patient document:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
exports.uploadDocument = uploadDocument;
const deleteDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientId = req.user.id;
        const id = req.params.id;
        const document = yield prisma_1.default.patientDocument.findFirst({
            where: { id, patientId },
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        try {
            const fileName = path_1.default.basename(document.fileUrl);
            const filePath = path_1.default.join(__dirname, '../../uploads', fileName);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        catch (e) {
            console.warn('Failed to delete physical file from uploads folder:', e);
        }
        yield prisma_1.default.patientDocument.delete({
            where: { id },
        });
        yield (0, auditLogger_1.logAudit)(patientId, 'PATIENT_DELETE_DOCUMENT', req, {
            documentId: id,
            fileName: document.fileName,
        });
        res.json({ message: 'Document deleted successfully', id });
    }
    catch (error) {
        console.error('Error deleting patient document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
exports.deleteDocument = deleteDocument;
const downloadDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patientId = req.user.id;
        const id = req.params.id;
        const document = yield prisma_1.default.patientDocument.findFirst({
            where: { id, patientId },
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const fileName = path_1.default.basename(document.fileUrl);
        const filePath = path_1.default.join(__dirname, '../../uploads', fileName);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Physical file not found on server' });
        }
        res.download(filePath, document.fileName);
    }
    catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});
exports.downloadDocument = downloadDocument;
const uploadAvatar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Please select an image file to upload as your profile picture' });
        }
        const avatarUrl = `/uploads/${file.filename}`;
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: userId },
            data: { avatarUrl },
            include: {
                patientProfile: true,
            },
        });
        yield (0, auditLogger_1.logAudit)(userId, 'PATIENT_UPLOAD_AVATAR', req, {
            fileName: file.originalname,
            avatarUrl,
        });
        res.json({
            message: 'Profile image updated successfully',
            avatarUrl,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                avatarUrl: updatedUser.avatarUrl,
                qrCodeIdentifier: (_a = updatedUser.patientProfile) === null || _a === void 0 ? void 0 : _a.qrCodeIdentifier,
            },
        });
    }
    catch (error) {
        console.error('Error uploading patient avatar:', error);
        res.status(500).json({ error: 'Failed to upload profile image' });
    }
});
exports.uploadAvatar = uploadAvatar;
const deleteAvatar = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = req.user.id;
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { avatarUrl: true },
        });
        if ((user === null || user === void 0 ? void 0 : user.avatarUrl) && user.avatarUrl.startsWith('/uploads/')) {
            try {
                const filePath = path_1.default.join(__dirname, '../../uploads', path_1.default.basename(user.avatarUrl));
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
            catch (e) {
                console.warn('Could not delete old avatar file:', e);
            }
        }
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: userId },
            data: { avatarUrl: null },
            include: {
                patientProfile: true,
            },
        });
        yield (0, auditLogger_1.logAudit)(userId, 'PATIENT_DELETE_AVATAR', req);
        res.json({
            message: 'Profile image removed successfully',
            avatarUrl: null,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                avatarUrl: null,
                qrCodeIdentifier: (_a = updatedUser.patientProfile) === null || _a === void 0 ? void 0 : _a.qrCodeIdentifier,
            },
        });
    }
    catch (error) {
        console.error('Error deleting patient avatar:', error);
        res.status(500).json({ error: 'Failed to remove profile image' });
    }
});
exports.deleteAvatar = deleteAvatar;
