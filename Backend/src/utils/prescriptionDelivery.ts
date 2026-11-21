// After a doctor confirms (or amends) a treatment, prepare it for the patient:
//   1. translate it into the patient's language (Gemini; medicine names stay English)
//   2. record a voice version (ElevenLabs) and store it privately in the database
//   3. email it (Brevo)
// Each step falls back gracefully: no translation -> English, no voice -> text only.
// Medical content is never written to logs.

import prisma from './prisma';
import { normalizeLanguage, PatientLanguage } from './languages';
import { buildEnglishVersion, buildTranslatedVersion, LocalizedTreatment } from './prescriptionTranslation';
import { isElevenLabsConfigured, textToSpeech } from './elevenlabs';
import { saveStoredFile, deleteStoredFile } from './fileStore';
import { sendPrescriptionEmail } from './emailService';

export const treatmentAudioKey = (treatmentId: string) => `treatment-audio/${treatmentId}.mp3`;

export type DeliveryResult = {
  language: PatientLanguage;
  translated: boolean;
  audio: boolean;
  email: { sent: boolean; messageId?: string; reason?: string };
  errors: string[];
};

export const deliverPrescriptionToPatient = async (
  treatmentId: string,
  options: { language?: string | null; isUpdate?: boolean; amendmentReason?: string | null } = {},
): Promise<DeliveryResult | null> => {
  const treatment = await prisma.treatment.findUnique({
    where: { id: treatmentId },
    include: {
      prescriptions: { orderBy: { createdAt: 'asc' } },
      patient: { select: { id: true, name: true, email: true, patientProfile: { select: { preferredLanguage: true } } } },
      doctor: { select: { name: true, doctorProfile: { select: { specialization: true } } } },
    },
  });
  if (!treatment || treatment.status !== 'CONFIRMED' || treatment.prescriptions.length === 0) return null;

  const language = normalizeLanguage(options.language || treatment.patient.patientProfile?.preferredLanguage || 'en');
  const errors: string[] = [];

  await prisma.treatmentTranslation.upsert({
    where: { treatmentId },
    create: { treatmentId, language, status: 'PENDING' },
    update: { language, status: 'PENDING', error: null },
  });

  const source = {
    patientName: treatment.patient.name,
    doctorName: treatment.doctor.name,
    condition: treatment.condition,
    symptoms: treatment.symptoms,
    diagnosis: treatment.diagnosis,
    doctorNotes: treatment.doctorNotes,
    amendmentReason: options.amendmentReason,
    prescriptions: treatment.prescriptions,
  };

  // 1. Text in the patient's language
  let localized: LocalizedTreatment;
  let translated = language === 'en';
  try {
    localized = await buildTranslatedVersion(source, language);
    translated = true;
  } catch (err: any) {
    errors.push(`translation: ${err?.message || 'failed'}`);
    localized = buildEnglishVersion(source);
  }

  // 2. Voice recording
  let audioKey: string | null = null;
  if (isElevenLabsConfigured()) {
    try {
      const mp3 = await textToSpeech(localized.spokenSummary);
      audioKey = treatmentAudioKey(treatmentId);
      await saveStoredFile(audioKey, mp3, 'audio/mpeg');
    } catch (err: any) {
      errors.push(`audio: ${err?.message || 'failed'}`);
      audioKey = null;
      await deleteStoredFile(treatmentAudioKey(treatmentId)).catch(() => undefined);
    }
  } else {
    errors.push('audio: ELEVENLABS_API_KEY not set');
  }

  await prisma.treatmentTranslation.update({
    where: { treatmentId },
    data: {
      language: localized.language,
      status: translated ? 'READY' : 'FAILED',
      content: localized as any,
      audioKey,
      error: errors.length ? errors.join(' | ').slice(0, 1000) : null,
    },
  });

  // 3. Email
  let email: DeliveryResult['email'] = { sent: false, reason: 'no_email' };
  if (treatment.patient.email) {
    const result = await sendPrescriptionEmail({
      patientName: treatment.patient.name,
      patientEmail: treatment.patient.email,
      doctorName: treatment.doctor.name,
      doctorSpecialization: treatment.doctor.doctorProfile?.specialization,
      issuedAt: treatment.confirmedAt || treatment.updatedAt,
      treatmentId,
      isUpdate: options.isUpdate,
      localized,
      hasAudio: !!audioKey,
    });
    email = result.sent ? { sent: true, messageId: result.messageId } : { sent: false, reason: result.reason };
  }

  return { language: localized.language, translated, audio: !!audioKey, email, errors };
};

// Shape sent to the browser (no storage keys).
export const toTranslationDto = (t: { language: string; status: string; content: any; audioKey: string | null; updatedAt: Date } | null | undefined) =>
  t
    ? {
        language: t.language,
        status: t.status,
        content: t.content ?? null,
        hasAudio: !!t.audioKey,
        updatedAt: t.updatedAt,
      }
    : null;
