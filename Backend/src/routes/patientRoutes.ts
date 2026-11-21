import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updatePassword,
  getTreatments,
  getAccessRequests,
  updateAccessRequest,
  getDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  uploadAvatar,
  deleteAvatar,
  getDocumentFile,
  updatePreferences,
  getLanguages,
  getTreatmentAudio,
} from '../controllers/patientController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';
import { handleDocumentUpload } from '../utils/medicalDocuments';

const router = Router();

router.use(authenticate, requireRole(['PATIENT']));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/profile/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/profile/avatar', deleteAvatar);
router.patch('/password', updatePassword);
router.patch('/preferences', updatePreferences);
router.get('/languages', getLanguages);
router.get('/treatments', getTreatments);
router.get('/treatments/:id/audio', getTreatmentAudio);
router.get('/access-requests', getAccessRequests);
router.patch('/access-requests/:id', updateAccessRequest);

// Medical Documents & Upload routes
router.get('/documents', getDocuments);
router.post('/documents', handleDocumentUpload, uploadDocument);
router.delete('/documents/:id', deleteDocument);
router.get('/documents/:id/file', getDocumentFile); // ?download=1 to download
router.get('/documents/:id/download', downloadDocument);

export default router;
