import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updatePassword,
  getTreatments,
  getAccessRequests,
  updateAccessRequest,
} from '../controllers/patientController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate, requireRole(['PATIENT']));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);
router.get('/treatments', getTreatments);
router.get('/access-requests', getAccessRequests);
router.patch('/access-requests/:id', updateAccessRequest);

export default router;
