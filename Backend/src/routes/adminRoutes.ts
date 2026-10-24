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
  getHistoryAccessRequests,
  getAuditLogs,
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/dashboard-stats', getDashboardStats);

// Doctors CRUD & Verification
router.get('/doctors', getDoctors);
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
router.get('/history-requests', getHistoryAccessRequests);
router.get('/audit-logs', getAuditLogs);

export default router;
