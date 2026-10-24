import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AccessRequestStatus } from '@prisma/client';
import { logAudit } from '../utils/auditLogger';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.patientProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

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
