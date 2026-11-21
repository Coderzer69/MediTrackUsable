import { Router } from 'express';
import {
  scanPatientQr,
  requestHistoryAccess,
  getPatientHistory,
  getPatientDocuments,
  downloadPatientDocumentForDoctor,
  getPatientDocumentFileForDoctor,
  createTreatment,
  editTreatment,
  draftFromAudio,
  getPatients,
  getAccessRequests,
  submitVerification,
  getProfile,
  updateProfile,
  updatePassword,
  getTreatments,
  uploadAvatar,
  deleteAvatar,
} from '../controllers/doctorController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = Router();

router.use(authenticate, requireRole(['DOCTOR', 'ADMIN']));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/profile/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/profile/avatar', deleteAvatar);
router.patch('/password', updatePassword);
router.get('/patients', getPatients);
router.get('/treatments', getTreatments);
router.get('/access-requests', getAccessRequests);
router.get('/patient/:qrId', scanPatientQr);
router.post('/access-requests', requestHistoryAccess);
router.get('/patient/:id/history', getPatientHistory);
router.get('/patient/:id/documents', getPatientDocuments);
router.get('/patient/:patientId/documents/:documentId/file', getPatientDocumentFileForDoctor); // ?download=1
router.get('/patient/:patientId/documents/:documentId/download', downloadPatientDocumentForDoctor);
router.post('/treatment/draft-from-audio', draftFromAudio);
router.post('/treatment', createTreatment);
router.patch('/treatment/:id', editTreatment);
router.post('/verify', upload.fields([
  { name: 'licenseDocument', maxCount: 1 },
  { name: 'qualificationDocument', maxCount: 1 }
]), submitVerification);

export default router;
