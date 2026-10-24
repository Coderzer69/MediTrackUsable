import { Router } from 'express';
import {
  getDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  verifyDoctor,
  getDashboardStats,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getTreatments,
  getTreatmentById,
  getHistoryAccessRequests,
  getAuditLogs,
  getDoctorById,
  updateAdminProfile,
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/dashboard-stats', getDashboardStats);

// Admin Profile
router.put('/profile', updateAdminProfile);
router.patch('/profile', updateAdminProfile);

// Doctors CRUD & Verification
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorById);
router.post('/doctors', createDoctor);
router.patch('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.patch('/doctors/:id/verify', verifyDoctor);

// Patients CRUD
router.get('/patients', getPatients);
router.post('/patients', createPatient);
router.patch('/patients/:id', updatePatient);
router.delete('/patients/:id', deletePatient);

// Treatments, Requests & Logs
router.get('/treatments', getTreatments);
router.get('/treatments/:id', getTreatmentById);
router.get('/history-requests', getHistoryAccessRequests);
router.get('/audit-logs', getAuditLogs);

export default router;
