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
exports.getAuditLogs = exports.getHistoryAccessRequests = exports.getTreatments = exports.deletePatient = exports.updatePatient = exports.createPatient = exports.getPatients = exports.getDashboardStats = exports.verifyDoctor = exports.deleteDoctor = exports.updateDoctor = exports.createDoctor = exports.getDoctors = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const qrGenerator_1 = require("../utils/qrGenerator");
const auditLogger_1 = require("../utils/auditLogger");
const getDoctors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = req.query.status;
        let whereClause = {};
        if (status) {
            whereClause.verificationStatus = status;
        }
        const doctors = yield prisma_1.default.doctorProfile.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { id: true, name: true, email: true, createdAt: true },
                },
            },
            orderBy: { id: 'desc' },
        });
        res.json(doctors);
    }
    catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDoctors = getDoctors;
const createDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, email, password, specialization, licenseNumber, verificationStatus } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        if (licenseNumber) {
            const existingLicense = yield prisma_1.default.doctorProfile.findUnique({ where: { licenseNumber } });
            if (existingLicense) {
                return res.status(400).json({ error: 'Doctor with this license number already exists' });
            }
        }
        const passwordHash = yield bcrypt_1.default.hash(password, 10);
        const doctor = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const user = yield tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    passwordHash,
                    role: 'DOCTOR',
                },
            });
            const profile = yield tx.doctorProfile.create({
                data: {
                    userId: user.id,
                    specialization: specialization ? specialization.trim() : null,
                    licenseNumber: licenseNumber ? licenseNumber.trim() : null,
                    verificationStatus: verificationStatus || 'APPROVED',
                    verifiedById: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, createdAt: true },
                    },
                },
            });
            return profile;
        }));
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_CREATE_DOCTOR', req, {
                doctorId: doctor.userId,
                email: doctor.user.email,
                name: doctor.user.name,
            });
        }
        res.status(201).json({ message: 'Doctor created successfully', doctor });
    }
    catch (error) {
        console.error('Error creating doctor:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.createDoctor = createDoctor;
const updateDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = req.params.id;
        const { name, email, specialization, licenseNumber, verificationStatus, rejectionReason } = req.body;
        const targetProfile = yield prisma_1.default.doctorProfile.findFirst({
            where: {
                OR: [{ id: doctorId }, { userId: doctorId }],
            },
        });
        if (!targetProfile) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }
        if (email) {
            const existingEmail = yield prisma_1.default.user.findFirst({
                where: {
                    email: email.trim().toLowerCase(),
                    NOT: { id: targetProfile.userId },
                },
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }
        if (licenseNumber) {
            const existingLicense = yield prisma_1.default.doctorProfile.findFirst({
                where: {
                    licenseNumber: licenseNumber.trim(),
                    NOT: { id: targetProfile.id },
                },
            });
            if (existingLicense) {
                return res.status(400).json({ error: 'License number already in use' });
            }
        }
        const updated = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (name || email) {
                yield tx.user.update({
                    where: { id: targetProfile.userId },
                    data: Object.assign(Object.assign({}, (name && { name: name.trim() })), (email && { email: email.trim().toLowerCase() })),
                });
            }
            return tx.doctorProfile.update({
                where: { id: targetProfile.id },
                data: Object.assign(Object.assign(Object.assign(Object.assign({}, (specialization !== undefined && { specialization: (specialization === null || specialization === void 0 ? void 0 : specialization.trim()) || null })), (licenseNumber !== undefined && { licenseNumber: (licenseNumber === null || licenseNumber === void 0 ? void 0 : licenseNumber.trim()) || null })), (verificationStatus && { verificationStatus })), (rejectionReason !== undefined && { rejectionReason: (rejectionReason === null || rejectionReason === void 0 ? void 0 : rejectionReason.trim()) || null })),
                include: {
                    user: {
                        select: { id: true, name: true, email: true, createdAt: true },
                    },
                },
            });
        }));
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_UPDATE_DOCTOR', req, {
                doctorId: updated.userId,
                updates: { name, email, specialization, licenseNumber, verificationStatus },
            });
        }
        res.json({ message: 'Doctor updated successfully', doctor: updated });
    }
    catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.updateDoctor = updateDoctor;
const deleteDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const doctorId = req.params.id;
        const targetProfile = yield prisma_1.default.doctorProfile.findFirst({
            where: {
                OR: [{ id: doctorId }, { userId: doctorId }],
            },
        });
        if (!targetProfile) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }
        yield prisma_1.default.user.delete({
            where: { id: targetProfile.userId },
        });
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_DELETE_DOCTOR', req, {
                doctorId: targetProfile.userId,
            });
        }
        res.json({ message: 'Doctor deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.deleteDoctor = deleteDoctor;
const verifyDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const doctorProfileId = req.params.id;
        const { status, rejectionReason, reason } = req.body;
        if (!status || !Object.values(client_1.DoctorVerificationStatus).includes(status)) {
            return res.status(400).json({
                error: `Invalid verification status. Allowed values: ${Object.values(client_1.DoctorVerificationStatus).join(', ')}`,
            });
        }
        // Find the profile either by its primary id or by the linked userId
        const targetProfile = yield prisma_1.default.doctorProfile.findFirst({
            where: {
                OR: [
                    { id: doctorProfileId },
                    { userId: doctorProfileId },
                ],
            },
        });
        if (!targetProfile) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }
        let verifiedById = null;
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            const actingAdmin = yield prisma_1.default.user.findUnique({
                where: { id: req.user.id },
                select: { id: true },
            });
            if (actingAdmin) {
                verifiedById = actingAdmin.id;
            }
        }
        const finalRejectionReason = status === 'REJECTED'
            ? (rejectionReason || reason || 'Application documents did not meet requirements.')
            : null;
        const doctor = yield prisma_1.default.doctorProfile.update({
            where: { id: targetProfile.id },
            data: {
                verificationStatus: status,
                verifiedById: verifiedById,
                rejectionReason: finalRejectionReason,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, status === 'APPROVED' ? 'ADMIN_APPROVE_DOCTOR' : 'ADMIN_REJECT_DOCTOR', req, {
                doctorId: doctor.userId,
                status,
                rejectionReason: finalRejectionReason,
            });
        }
        res.json({ message: `Doctor status updated to ${status}`, doctor });
    }
    catch (error) {
        console.error('Error verifying doctor:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.verifyDoctor = verifyDoctor;
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalDoctors = yield prisma_1.default.doctorProfile.count();
        const approvedDoctors = yield prisma_1.default.doctorProfile.count({
            where: { verificationStatus: 'APPROVED' },
        });
        const pendingDoctors = yield prisma_1.default.doctorProfile.count({
            where: { verificationStatus: 'PENDING' },
        });
        const totalPatients = yield prisma_1.default.patientProfile.count();
        const totalTreatments = yield prisma_1.default.treatment.count();
        const pendingRequests = yield prisma_1.default.historyAccessRequest.count({
            where: { status: 'PENDING' }
        });
        res.json({
            totalDoctors,
            approvedDoctors,
            pendingDoctors,
            totalPatients,
            totalTreatments,
            pendingRequests,
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDashboardStats = getDashboardStats;
const getPatients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const patients = yield prisma_1.default.user.findMany({
            where: { role: 'PATIENT' },
            include: {
                patientProfile: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const formatted = patients.map((p) => { var _a; return ({
            id: p.id,
            userId: p.id,
            name: p.name,
            email: p.email,
            createdAt: p.createdAt,
            qrCodeIdentifier: ((_a = p.patientProfile) === null || _a === void 0 ? void 0 : _a.qrCodeIdentifier) || '',
            patientProfile: p.patientProfile,
            user: { id: p.id, name: p.name, email: p.email },
        }); });
        res.json(formatted);
    }
    catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPatients = getPatients;
const createPatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        const passwordHash = yield bcrypt_1.default.hash(password, 10);
        let unique = false;
        let qrCode = '';
        while (!unique) {
            qrCode = (0, qrGenerator_1.generatePatientQrCodeId)();
            const existing = yield prisma_1.default.patientProfile.findUnique({ where: { qrCodeIdentifier: qrCode } });
            if (!existing)
                unique = true;
        }
        const patient = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield tx.user.create({
                data: {
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    passwordHash,
                    role: 'PATIENT',
                },
            });
            const profile = yield tx.patientProfile.create({
                data: {
                    userId: user.id,
                    qrCodeIdentifier: qrCode,
                },
            });
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                qrCodeIdentifier: profile.qrCodeIdentifier,
                patientProfile: profile,
                user: { id: user.id, name: user.name, email: user.email },
            };
        }));
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_CREATE_PATIENT', req, {
                patientId: patient.id,
                email: patient.email,
                name: patient.name,
            });
        }
        res.status(201).json({ message: 'Patient created successfully', patient });
    }
    catch (error) {
        console.error('Error creating patient:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.createPatient = createPatient;
const updatePatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const patientId = req.params.id;
        const { name, email } = req.body;
        const targetUser = yield prisma_1.default.user.findFirst({
            where: {
                id: patientId,
                role: 'PATIENT',
            },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        if (email) {
            const existingEmail = yield prisma_1.default.user.findFirst({
                where: {
                    email: email.trim().toLowerCase(),
                    NOT: { id: targetUser.id },
                },
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }
        const updated = yield prisma_1.default.user.update({
            where: { id: targetUser.id },
            data: Object.assign(Object.assign({}, (name && { name: name.trim() })), (email && { email: email.trim().toLowerCase() })),
            include: {
                patientProfile: true,
            },
        });
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_UPDATE_PATIENT', req, {
                patientId: updated.id,
                updates: { name, email },
            });
        }
        res.json({
            message: 'Patient updated successfully',
            patient: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                qrCodeIdentifier: (_b = updated.patientProfile) === null || _b === void 0 ? void 0 : _b.qrCodeIdentifier,
                patientProfile: updated.patientProfile,
                user: { id: updated.id, name: updated.name, email: updated.email },
            },
        });
    }
    catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.updatePatient = updatePatient;
const deletePatient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const patientId = req.params.id;
        const targetUser = yield prisma_1.default.user.findFirst({
            where: {
                id: patientId,
                role: 'PATIENT',
            },
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        yield prisma_1.default.user.delete({
            where: { id: targetUser.id },
        });
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) {
            yield (0, auditLogger_1.logAudit)(req.user.id, 'ADMIN_DELETE_PATIENT', req, {
                patientId: targetUser.id,
            });
        }
        res.json({ message: 'Patient deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting patient:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.deletePatient = deletePatient;
const getTreatments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const treatments = yield prisma_1.default.treatment.findMany({
            include: {
                doctor: { select: { name: true, email: true } },
                patient: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(treatments);
    }
    catch (error) {
        console.error('Error fetching treatments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getTreatments = getTreatments;
const getHistoryAccessRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield prisma_1.default.historyAccessRequest.findMany({
            include: {
                doctor: { select: { name: true, email: true } },
                patient: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching history access requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getHistoryAccessRequests = getHistoryAccessRequests;
const getAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield prisma_1.default.auditLog.findMany({
            include: {
                user: { select: { name: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAuditLogs = getAuditLogs;
