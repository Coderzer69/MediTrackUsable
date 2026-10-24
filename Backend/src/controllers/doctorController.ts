import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { TreatmentStatus } from '@prisma/client';
import OpenAI from 'openai';
import { logAudit } from '../utils/auditLogger';

// Helper to check if doctor is verified
const isDoctorVerified = async (userId: string) => {
  const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
  return profile?.verificationStatus === 'APPROVED';
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, email, specialization, licenseNumber } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existingEmailUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
    });

    if (existingEmailUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const normalizedLicenseNumber = typeof licenseNumber === 'string' ? licenseNumber.trim() : '';
    if (normalizedLicenseNumber) {
      const existingLicenseDoctor = await prisma.doctorProfile.findFirst({
        where: {
          licenseNumber: normalizedLicenseNumber,
          NOT: { userId },
        },
      });

      if (existingLicenseDoctor) {
        return res.status(400).json({ error: 'License number is already in use' });
      }
    }

    const updatedProfile = await prisma.$transaction(async (prismaTx: any) => {
      await prismaTx.user.update({
        where: { id: userId },
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
        },
      });

      return prismaTx.doctorProfile.update({
        where: { userId },
        data: {
          specialization: typeof specialization === 'string' ? specialization.trim() || null : null,
          licenseNumber: normalizedLicenseNumber || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });
    });

    res.json({ message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
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
      return res.status(400).json({ error: 'Password change is not available for this account' });
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

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating doctor password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;

    // Get patients from treatments
    const treatments = await prisma.treatment.findMany({
      where: { doctorId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    // Get patients from access requests (approved or pending)
    const accessRequests = await prisma.historyAccessRequest.findMany({
      where: { doctorId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    const patientMap = new Map();
    
    treatments.forEach(t => {
      const patientId = t.patient.id;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          ...t.patient,
          treatmentsCount: 0,
          lastVisit: null
        });
      }
      const p = patientMap.get(patientId);
      p.treatmentsCount += 1;
      if (!p.lastVisit || new Date(t.createdAt) > new Date(p.lastVisit)) {
        p.lastVisit = t.createdAt;
      }
    });

    accessRequests.forEach(ar => {
      const patientId = ar.patient.id;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          ...ar.patient,
          treatmentsCount: 0,
          lastVisit: null
        });
      }
    });

    // Get the patient profile for each patient to include QR code identifier
    const patients = Array.from(patientMap.values());
    const patientsWithProfile = await Promise.all(
      patients.map(async (p) => {
        const profile = await prisma.patientProfile.findUnique({ where: { userId: p.id } });
        return {
          ...p,
          qrCodeIdentifier: profile?.qrCodeIdentifier,
        };
      })
    );

    res.json(patientsWithProfile);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTreatments = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const treatments = await prisma.treatment.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(treatments);
  } catch (error) {
    console.error('Error fetching doctor treatments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccessRequests = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const requests = await prisma.historyAccessRequest.findMany({
      where: { doctorId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requestsWithProfile = await Promise.all(
      requests.map(async (r) => {
        const profile = await prisma.patientProfile.findUnique({ where: { userId: r.patient.id } });
        return {
          ...r,
          patient: {
            ...r.patient,
            qrCodeIdentifier: profile?.qrCodeIdentifier,
          }
        };
      })
    );

    res.json(requestsWithProfile);
  } catch (error) {
    console.error('Error fetching access requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const scanPatientQr = async (req: AuthRequest, res: Response) => {
  try {
    const qrId = req.params.qrId as string;
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { qrCodeIdentifier: qrId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient not found for this QR code' });
    }

    if (req.user?.id) {
      await logAudit(req.user.id, 'DOCTOR_SCAN_PATIENT_QR', req, {
        qrId,
        patientId: patientProfile.user.id,
      });
    }

    res.json({
      id: patientProfile.user.id,
      patientId: patientProfile.user.id,
      name: patientProfile.user.name,
      email: patientProfile.user.email,
      qrId: patientProfile.qrCodeIdentifier,
      qrIdentifier: patientProfile.qrCodeIdentifier
    });
  } catch (error) {
    console.error('Error scanning QR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestHistoryAccess = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const { patientId } = req.body;

    if (!(await isDoctorVerified(doctorId))) {
      return res.status(403).json({ error: 'Only verified doctors can request history access' });
    }

    // Check if an active request already exists
    const existing = await prisma.historyAccessRequest.findFirst({
      where: {
        doctorId,
        patientId,
        status: 'APPROVED',
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have active access to this patient\'s history' });
    }

    const request = await prisma.historyAccessRequest.create({
      data: {
        doctorId,
        patientId,
      },
    });

    await logAudit(doctorId, 'DOCTOR_REQUEST_HISTORY_ACCESS', req, {
      patientId,
      requestId: request.id,
    });

    res.status(201).json({ message: 'Access request sent to patient', request });
  } catch (error) {
    console.error('Error requesting history access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPatientHistory = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const patientId = req.params.id as string;

    if (!(await isDoctorVerified(doctorId))) {
      return res.status(403).json({ error: 'Only verified doctors can view history' });
    }

    const access = await prisma.historyAccessRequest.findFirst({
      where: {
        doctorId,
        patientId,
        status: 'APPROVED',
        expiresAt: { gt: new Date() },
      },
    });

    if (!access) {
      return res.status(403).json({ error: 'You do not have active permission to view this patient\'s history' });
    }

    // Log the access using unified auditLogger
    await logAudit(doctorId, 'VIEWED_PATIENT_HISTORY', req, { patientId });

    const treatments = await prisma.treatment.findMany({
      where: { patientId, status: 'CONFIRMED' },
      include: {
        doctor: { select: { name: true } },
        prescriptions: true,
        amendments: true,
      },
      orderBy: { confirmedAt: 'desc' },
    });

    res.json(treatments);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper to validate and normalize consultation draft output
const validateAndNormalizeConsultation = (raw: any) => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid consultation draft output: expected JSON object');
  }

  const cleanString = (val: any) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    return null;
  };

  const prescriptions = Array.isArray(raw.prescriptions)
    ? raw.prescriptions
        .filter((p: any) => p && typeof p === 'object' && p.medicineName)
        .map((p: any) => ({
          medicineName: String(p.medicineName).trim(),
          strength: cleanString(p.strength),
          dosage: cleanString(p.dosage),
          frequency: cleanString(p.frequency),
          duration: cleanString(p.duration),
          route: cleanString(p.route),
          instructions: cleanString(p.instructions),
        }))
    : [];

  return {
    condition: cleanString(raw.condition),
    symptoms: cleanString(raw.symptoms),
    diagnosis: cleanString(raw.diagnosis),
    doctorNotes: cleanString(raw.doctorNotes),
    prescriptions,
  };
};

export const draftFromAudio = async (req: AuthRequest, res: Response) => {
  try {
    const { text, audioBase64, mimeType } = req.body;

    if (!text && !audioBase64) {
      return res.status(400).json({ error: 'Either transcript text or audioBase64 is required' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return res.status(500).json({ error: 'AI API key (GEMINI_API_KEY or OPENAI_API_KEY) is missing in environment variables' });
    }

    const prompt = `
You are an expert clinical medical scribe. Parse the doctor-patient consultation and output a strict JSON object matching this exact schema:
{
  "condition": "Chief complaint or primary medical condition, or null if not mentioned",
  "symptoms": "Detailed symptoms mentioned by patient or doctor, or null if not mentioned",
  "diagnosis": "Doctor's formal diagnosis or clinical assessment, or null if not mentioned",
  "doctorNotes": "Advice, lifestyle instructions, follow-up schedule, or notes, or null if not mentioned",
  "prescriptions": [
    {
      "medicineName": "Exact medicine name (required)",
      "strength": "e.g. 500mg, 10ml, or null",
      "dosage": "e.g. 1 tablet, 2 puffs, or null",
      "frequency": "e.g. twice daily, every 8 hours, or null",
      "duration": "e.g. 5 days, 2 weeks, or null",
      "route": "e.g. oral, topical, or null",
      "instructions": "e.g. after meals, with water, or null"
    }
  ]
}

CRITICAL RULES:
1. Return strictly valid JSON.
2. If any field or detail was not mentioned, set its value to null (or empty array [] for prescriptions).
3. Do not invent any medication not mentioned in the audio or transcript.
${text ? `\nConsultation Transcript:\n"${text}"` : ''}
`;

    const executeAiCall = async (): Promise<any> => {
      if (geminiKey) {
        const parts: any[] = [];
        if (audioBase64) {
          parts.push({
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          });
        }
        parts.push({ text: prompt });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error('No content returned from Gemini');
        }

        const parsed = JSON.parse(content);
        return validateAndNormalizeConsultation(parsed);
      } else if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a clinical scribe assistant that strictly outputs valid JSON matching the schema.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error('No content returned from OpenAI');
        }

        const parsed = JSON.parse(content);
        return validateAndNormalizeConsultation(parsed);
      }
    };

    // Execute with one automatic retry on failure
    let draftData: any = null;
    try {
      draftData = await executeAiCall();
    } catch (firstErr) {
      console.warn('Initial AI consultation parse attempt failed, retrying once...', firstErr);
      draftData = await executeAiCall();
    }

    if (req.user?.id) {
      await logAudit(req.user.id, 'DOCTOR_DRAFT_CONSULTATION', req, {
        patientId: req.body.patientId,
        hasAudio: !!audioBase64,
        transcriptLength: text?.length,
      });
    }

    res.json({
      message: 'Structured data drafted. Please review before confirming.',
      data: draftData,
    });
  } catch (error: any) {
    console.error('Error drafting from audio text:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const { patientId, condition, symptoms, diagnosis, doctorNotes, status, prescriptions } = req.body;

    if (status === 'CONFIRMED' && !(await isDoctorVerified(doctorId))) {
      return res.status(403).json({ error: 'Only verified doctors can confirm treatments' });
    }

    const treatment = await prisma.$transaction(async (prismaTx: any) => {
      const newTreatment = await prismaTx.treatment.create({
        data: {
          doctorId,
          patientId,
          condition,
          symptoms,
          diagnosis,
          doctorNotes,
          status: status as TreatmentStatus || 'DRAFT',
          confirmedAt: status === 'CONFIRMED' ? new Date() : null,
        },
      });

      if (prescriptions && prescriptions.length > 0) {
        const presData = prescriptions.map((p: any) => ({
          treatmentId: newTreatment.id,
          medicineName: p.medicineName,
          strength: p.strength,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route,
          instructions: p.instructions,
        }));
        await prismaTx.prescription.createMany({ data: presData });
      }

      return await prismaTx.treatment.findUnique({
        where: { id: newTreatment.id },
        include: { prescriptions: true },
      });
    });

    await logAudit(doctorId, 'DOCTOR_CREATE_TREATMENT', req, {
      treatmentId: treatment?.id,
      patientId,
      status: status || 'DRAFT',
      condition,
    });

    res.status(201).json(treatment);
  } catch (error) {
    console.error('Error creating treatment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const editTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const treatmentId = req.params.id as string;
    const { condition, symptoms, diagnosis, doctorNotes, status, prescriptions, amendmentReason } = req.body;

    const existingTreatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { prescriptions: true },
    });

    if (!existingTreatment) return res.status(404).json({ error: 'Treatment not found' });
    if (existingTreatment.doctorId !== doctorId) return res.status(403).json({ error: 'Not authorized to edit this treatment' });

    if (existingTreatment.status === 'CONFIRMED') {
      if (!amendmentReason) {
        return res.status(400).json({ error: 'Amendment reason is required when editing a confirmed treatment' });
      }

      // Create an amendment record before updating
      await prisma.treatmentAmendment.create({
        data: {
          treatmentId,
          doctorId,
          reason: amendmentReason,
          previousData: JSON.parse(JSON.stringify(existingTreatment)),
          newData: { condition, symptoms, diagnosis, doctorNotes, prescriptions },
        },
      });
    }

    const updatedTreatment = await prisma.$transaction(async (prismaTx: any) => {
      // Update treatment details
      const updateData: any = { condition, symptoms, diagnosis, doctorNotes };
      if (status === 'CONFIRMED' && existingTreatment.status === 'DRAFT') {
        updateData.status = 'CONFIRMED';
        updateData.confirmedAt = new Date();
      }

      await prismaTx.treatment.update({
        where: { id: treatmentId },
        data: updateData,
      });

      // Update prescriptions (for simplicity, we delete existing and recreate them)
      if (prescriptions) {
        await prismaTx.prescription.deleteMany({ where: { treatmentId } });
        const presData = prescriptions.map((p: any) => ({
          treatmentId,
          medicineName: p.medicineName,
          strength: p.strength,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          route: p.route,
          instructions: p.instructions,
        }));
        await prismaTx.prescription.createMany({ data: presData });
      }

      return await prismaTx.treatment.findUnique({
        where: { id: treatmentId },
        include: { prescriptions: true, amendments: true },
      });
    });

    await logAudit(doctorId, 'DOCTOR_EDIT_TREATMENT', req, {
      treatmentId,
      status: updatedTreatment?.status,
      amendmentReason,
    });

    res.json({ message: 'Treatment updated successfully', treatment: updatedTreatment });
  } catch (error) {
    console.error('Error editing treatment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitVerification = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const { licenseNumber, specialization, qualification, registrationYear, issuingAuthority } = req.body;
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    const licenseDoc = files['licenseDocument'] ? files['licenseDocument'][0].filename : null;
    const qualDoc = files['qualificationDocument'] ? files['qualificationDocument'][0].filename : null;

    if (!licenseNumber || !licenseDoc) {
      return res.status(400).json({ error: 'License number and license document are required' });
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data: {
        licenseNumber,
        specialization,
        verificationStatus: 'PENDING',
        // Since we didn't add qualification/registrationYear/issuingAuthority to schema, we just store what we have
        ...(licenseDoc && { verificationDocumentUrl: licenseDoc }),
        ...(qualDoc && { qualificationDocumentUrl: qualDoc }),
      },
    });

    await logAudit(doctorId, 'DOCTOR_SUBMIT_VERIFICATION', req, {
      licenseNumber,
      specialization,
      hasLicenseDoc: !!licenseDoc,
      hasQualDoc: !!qualDoc,
    });

    res.json({ message: 'Verification documents submitted successfully', profile: updatedProfile });
  } catch (error) {
    console.error('Error submitting verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
