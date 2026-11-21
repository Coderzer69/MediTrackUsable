import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AccessRequestStatus } from '@prisma/client';
import { logAudit } from '../utils/auditLogger';
import { generatePatientQrCodeId } from '../utils/qrGenerator';
import {
  DOCUMENT_CATEGORIES,
  STORED_PREFIX,
  fileContentMatchesType,
  removeFileQuietly,
  resolveDocumentPath,
  sendDocumentFile,
  toDocumentDto,
} from '../utils/medicalDocuments';


export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let profile = await prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      },
    });

    // Admins have no patient profile; return a read-only view instead of creating one
    // (creating one would give the admin a scannable patient QR code).
    if (!profile && req.user!.role === 'ADMIN') {
      const adminUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
      });
      return res.json({ id: null, userId, qrCodeIdentifier: null, user: adminUser });
    }

    // Auto-create patient profile with unique QR code if missing
    if (!profile) {
      let unique = false;
      let qrCode = '';
      while (!unique) {
        qrCode = generatePatientQrCodeId();
        const existingQr = await prisma.patientProfile.findUnique({
          where: { qrCodeIdentifier: qrCode },
        });
        if (!existingQr) {
          unique = true;
        }
      }

      profile = await prisma.patientProfile.create({
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
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        NOT: { id: userId },
      },
    });

    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already in use by another account' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
      include: {
        patientProfile: true,
      },
    });

    await logAudit(userId, 'PATIENT_UPDATE_PROFILE', req, {
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
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Password update is not available for this account' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await logAudit(userId, 'PATIENT_UPDATE_PASSWORD', req);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating patient password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTreatments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Patients can only view CONFIRMED treatments
    const treatments = await prisma.treatment.findMany({
      where: { patientId: userId, status: 'CONFIRMED' },
      include: {
        doctor: { select: { name: true } },
        prescriptions: true,
        amendments: true,
      },
      orderBy: { confirmedAt: 'desc' },
    });

    res.json(treatments);
  } catch (error) {
    console.error('Error fetching patient treatments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccessRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const requests = await prisma.historyAccessRequest.findMany({
      where: { patientId: userId },
      include: {
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching access requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAccessRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requestId = req.params.id as string;
    const userId = req.user!.id;
    const { status } = req.body;

    if (!['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be APPROVED or DENIED.' });
    }

    const request = await prisma.historyAccessRequest.findFirst({
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

    const updatedRequest = await prisma.historyAccessRequest.update({
      where: { id: requestId },
      data: { status: status as AccessRequestStatus, expiresAt },
    });

    await logAudit(userId, 'PATIENT_UPDATE_ACCESS_REQUEST', req, {
      requestId,
      doctorId: request.doctorId,
      status,
      expiresAt,
    });

    res.json({ message: `Access request ${status}`, request: updatedRequest });
  } catch (error) {
    console.error('Error updating access request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------------------------------------------ medical records
// Documents the patient uploads (past checkups, prescriptions, lab reports).
// Stored privately; see utils/medicalDocuments.ts.

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.user!.id;
    const documents = await prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents.map(toDocumentDto));
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  const file = req.file;
  try {
    const patientId = req.user!.id;

    if (!file) {
      return res.status(400).json({ error: 'Please choose a PDF, JPG or PNG file to upload.' });
    }

    if (!fileContentMatchesType(file.path, file.mimetype)) {
      removeFileQuietly(file.path);
      return res.status(400).json({ error: 'This file does not look like a valid PDF, JPG or PNG. Please choose another file.' });
    }

    const { title, category } = req.body;
    const assignedCategory = (DOCUMENT_CATEGORIES as readonly string[]).includes(category) ? category : 'OTHER';
    const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 120) : '';

    const newDocument = await prisma.patientDocument.create({
      data: {
        patientId,
        title: cleanTitle || file.originalname,
        fileName: file.originalname,
        fileUrl: `${STORED_PREFIX}${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
        category: assignedCategory,
      },
    });

    await logAudit(patientId, 'PATIENT_UPLOAD_DOCUMENT', req, {
      documentId: newDocument.id,
      fileName: file.originalname,
      category: assignedCategory,
      fileSize: file.size,
    });

    res.status(201).json(toDocumentDto(newDocument));
  } catch (error) {
    if (file) removeFileQuietly(file.path);
    console.error('Error uploading patient document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.user!.id;
    const id = req.params.id as string;

    const document = await prisma.patientDocument.findFirst({ where: { id, patientId } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await prisma.patientDocument.delete({ where: { id } });
    removeFileQuietly(resolveDocumentPath(document));

    await logAudit(patientId, 'PATIENT_DELETE_DOCUMENT', req, {
      documentId: id,
      fileName: document.fileName,
    });

    res.json({ message: 'Document deleted successfully', id });
  } catch (error) {
    console.error('Error deleting patient document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

const serveOwnDocument = async (req: AuthRequest, res: Response, download: boolean) => {
  try {
    const patientId = req.user!.id;
    const id = req.params.id as string;
    const document = await prisma.patientDocument.findFirst({ where: { id, patientId } });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return sendDocumentFile(res, document, download);
  } catch (error) {
    console.error('Error sending patient document:', error);
    res.status(500).json({ error: 'Failed to open document' });
  }
};

// GET /documents/:id/file             -> preview (inline)
// GET /documents/:id/file?download=1  -> download (attachment)
export const getDocumentFile = (req: AuthRequest, res: Response) =>
  serveOwnDocument(req, res, req.query.download !== undefined);

// Kept for existing links: always downloads.
export const downloadDocument = (req: AuthRequest, res: Response) => serveOwnDocument(req, res, true);

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Please select an image file to upload as your profile picture' });
    }

    const avatarUrl = `/uploads/${file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      include: {
        patientProfile: true,
      },
    });

    await logAudit(userId, 'PATIENT_UPLOAD_AVATAR', req, {
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
        qrCodeIdentifier: updatedUser.patientProfile?.qrCodeIdentifier,
      },
    });
  } catch (error) {
    console.error('Error uploading patient avatar:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.join(__dirname, '../../uploads', path.basename(user.avatarUrl));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn('Could not delete old avatar file:', e);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      include: {
        patientProfile: true,
      },
    });

    await logAudit(userId, 'PATIENT_DELETE_AVATAR', req);

    res.json({
      message: 'Profile image removed successfully',
      avatarUrl: null,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatarUrl: null,
        qrCodeIdentifier: updatedUser.patientProfile?.qrCodeIdentifier,
      },
    });
  } catch (error) {
    console.error('Error deleting patient avatar:', error);
    res.status(500).json({ error: 'Failed to remove profile image' });
  }
};
