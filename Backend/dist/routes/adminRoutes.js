"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate, (0, authMiddleware_1.requireRole)(['ADMIN']));
router.get('/dashboard-stats', adminController_1.getDashboardStats);
// Doctors CRUD & Verification
router.get('/doctors', adminController_1.getDoctors);
router.post('/doctors', adminController_1.createDoctor);
router.patch('/doctors/:id', adminController_1.updateDoctor);
router.delete('/doctors/:id', adminController_1.deleteDoctor);
router.patch('/doctors/:id/verify', adminController_1.verifyDoctor);
// Patients CRUD
router.get('/patients', adminController_1.getPatients);
router.post('/patients', adminController_1.createPatient);
router.patch('/patients/:id', adminController_1.updatePatient);
router.delete('/patients/:id', adminController_1.deletePatient);
// Treatments, Requests & Logs
router.get('/treatments', adminController_1.getTreatments);
router.get('/history-requests', adminController_1.getHistoryAccessRequests);
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
