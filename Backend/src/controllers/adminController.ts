import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { DoctorVerificationStatus } from '@prisma/client';


import bcrypt from 'bcrypt';
import { generatePatientQrCodeId } from '../utils/qrGenerator';
import { logAudit } from '../utils/auditLogger';

export const getDoctors = async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as DoctorVerificationStatus | undefined;

    let whereClause: any = {};
    if (status) {
      whereClause.verificationStatus = status;
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, specialization, licenseNumber, verificationStatus } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    if (licenseNumber) {
      const existingLicense = await prisma.doctorProfile.findUnique({ where: { licenseNumber } });
      if (existingLicense) {
        return res.status(400).json({ error: 'Doctor with this license number already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doctor = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role: 'DOCTOR',
        },
      });

      const profile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialization: specialization ? specialization.trim() : null,
          licenseNumber: licenseNumber ? licenseNumber.trim() : null,
          verificationStatus: verificationStatus || 'APPROVED',
          verifiedById: req.user?.id || null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      });

      return profile;
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_CREATE_DOCTOR', req, {
        doctorId: doctor.userId,
        email: doctor.user.email,
        name: doctor.user.name,
      });
    }

    res.status(201).json({ message: 'Doctor created successfully', doctor });
  } catch (error: any) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.params.id as string;
    const { name, email, specialization, licenseNumber, verificationStatus, rejectionReason } = req.body;

    const targetProfile = await prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorId }, { userId: doctorId }],
      },
    });

    if (!targetProfile) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
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
      const existingLicense = await prisma.doctorProfile.findFirst({
        where: {
          licenseNumber: licenseNumber.trim(),
          NOT: { id: targetProfile.id },
        },
      });
      if (existingLicense) {
        return res.status(400).json({ error: 'License number already in use' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name || email) {
        await tx.user.update({
          where: { id: targetProfile.userId },
          data: {
            ...(name && { name: name.trim() }),
            ...(email && { email: email.trim().toLowerCase() }),
          },
        });
      }

      return tx.doctorProfile.update({
        where: { id: targetProfile.id },
        data: {
          ...(specialization !== undefined && { specialization: specialization?.trim() || null }),
          ...(licenseNumber !== undefined && { licenseNumber: licenseNumber?.trim() || null }),
          ...(verificationStatus && { verificationStatus }),
          ...(rejectionReason !== undefined && { rejectionReason: rejectionReason?.trim() || null }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      });
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_UPDATE_DOCTOR', req, {
        doctorId: updated.userId,
        updates: { name, email, specialization, licenseNumber, verificationStatus },
      });
    }

    res.json({ message: 'Doctor updated successfully', doctor: updated });
  } catch (error: any) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.params.id as string;

    const targetProfile = await prisma.doctorProfile.findFirst({
      where: {
        OR: [{ id: doctorId }, { userId: doctorId }],
      },
    });

    if (!targetProfile) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    await prisma.user.delete({
      where: { id: targetProfile.userId },
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_DELETE_DOCTOR', req, {
        doctorId: targetProfile.userId,
      });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const verifyDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const doctorProfileId = req.params.id as string;
    const { status, rejectionReason, reason } = req.body;

    if (!status || !Object.values(DoctorVerificationStatus).includes(status)) {
      return res.status(400).json({
        error: `Invalid verification status. Allowed values: ${Object.values(DoctorVerificationStatus).join(', ')}`,
      });
    }

    // Find the profile either by its primary id or by the linked userId
    const targetProfile = await prisma.doctorProfile.findFirst({
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

    let verifiedById: string | null = null;
    if (req.user?.id) {
      const actingAdmin = await prisma.user.findUnique({
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

    const doctor = await prisma.doctorProfile.update({
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

    if (req.user?.id) {
      await logAudit(req.user.id, status === 'APPROVED' ? 'ADMIN_APPROVE_DOCTOR' : 'ADMIN_REJECT_DOCTOR', req, {
        doctorId: doctor.userId,
        status,
        rejectionReason: finalRejectionReason,
      });
    }

    res.json({ message: `Doctor status updated to ${status}`, doctor });
  } catch (error: any) {
    console.error('Error verifying doctor:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalDoctors = await prisma.doctorProfile.count();
    const approvedDoctors = await prisma.doctorProfile.count({
      where: { verificationStatus: 'APPROVED' },
    });
    const pendingDoctors = await prisma.doctorProfile.count({
      where: { verificationStatus: 'PENDING' },
    });
    const totalPatients = await prisma.patientProfile.count();
    const totalTreatments = await prisma.treatment.count();
    const pendingRequests = await prisma.historyAccessRequest.count({
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
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      include: {
        patientProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = patients.map((p) => ({
      id: p.id,
      userId: p.id,
      name: p.name,
      email: p.email,
      createdAt: p.createdAt,
      qrCodeIdentifier: p.patientProfile?.qrCodeIdentifier || '',
      patientProfile: p.patientProfile,
      user: { id: p.id, name: p.name, email: p.email },
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPatient = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let unique = false;
    let qrCode = '';
    while (!unique) {
      qrCode = generatePatientQrCodeId();
      const existing = await prisma.patientProfile.findUnique({ where: { qrCodeIdentifier: qrCode } });
      if (!existing) unique = true;
    }

    const patient = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role: 'PATIENT',
        },
      });

      const profile = await tx.patientProfile.create({
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
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_CREATE_PATIENT', req, {
        patientId: patient.id,
        email: patient.email,
        name: patient.name,
      });
    }

    res.status(201).json({ message: 'Patient created successfully', patient });
  } catch (error: any) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updatePatient = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.id as string;
    const { name, email } = req.body;

    const targetUser = await prisma.user.findFirst({
      where: {
        id: patientId,
        role: 'PATIENT',
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          NOT: { id: targetUser.id },
        },
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.trim().toLowerCase() }),
      },
      include: {
        patientProfile: true,
      },
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_UPDATE_PATIENT', req, {
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
        qrCodeIdentifier: updated.patientProfile?.qrCodeIdentifier,
        patientProfile: updated.patientProfile,
        user: { id: updated.id, name: updated.name, email: updated.email },
      },
    });
  } catch (error: any) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deletePatient = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.id as string;

    const targetUser = await prisma.user.findFirst({
      where: {
        id: patientId,
        role: 'PATIENT',
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await prisma.user.delete({
      where: { id: targetUser.id },
    });

    if (req.user?.id) {
      await logAudit(req.user.id, 'ADMIN_DELETE_PATIENT', req, {
        patientId: targetUser.id,
      });
    }

    res.json({ message: 'Patient deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getTreatments = async (req: AuthRequest, res: Response) => {
  try {
    const treatments = await prisma.treatment.findMany({
      include: {
        doctor: { select: { name: true, email: true } },
        patient: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(treatments);
  } catch (error) {
    console.error('Error fetching treatments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getHistoryAccessRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.historyAccessRequest.findMany({
      include: {
        doctor: { select: { name: true, email: true } },
        patient: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching history access requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
