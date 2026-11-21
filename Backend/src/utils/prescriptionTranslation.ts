// Builds the patient-language version of a confirmed treatment.
// Text is translated with Gemini (GEMINI_API_KEY). Medicine names and strengths
// are always copied from the original so they stay in English.

import { PATIENT_LANGUAGES, PatientLanguage } from './languages';

export type SourcePrescription = {
  medicineName: string;
  strength?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
};

export type SourceTreatment = {
  patientName: string;
  doctorName: string;
  condition?: string | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  doctorNotes?: string | null;
  amendmentReason?: string | null;
  prescriptions: SourcePrescription[];
};

// Fixed wording used in the email and app. {name} and {doctor} are filled in later.
export const ENGLISH_LABELS = {
  subject: 'Your prescription from {doctor} – MediTrack',
  subjectUpdate: 'Your prescription from {doctor} was updated – MediTrack',
  title: 'Prescription',
  titleUpdate: 'Updated prescription',
  greeting: 'Hello {name},',
  intro: '{doctor} has issued a prescription for you. Here are the details.',
  introUpdate: '{doctor} updated your prescription. The current version is below.',
  doctor: 'Doctor',
  date: 'Date',
  condition: 'Condition',
  diagnosis: 'Diagnosis',
  reasonForUpdate: 'Reason for update',
  medicine: 'Medicine',
  dosage: 'Dosage',
  frequency: 'Frequency',
  duration: 'Duration',
  notes: "Doctor's notes",
  openApp: 'Open MediTrack',
  listen: 'You can also listen to this prescription in the MediTrack app.',
  disclaimer:
    'Take medicines only as your doctor directed. If you have questions or side effects, contact your doctor. This email contains personal medical information; if you received it by mistake, please delete it.',
};

export type Labels = typeof ENGLISH_LABELS;

export type LocalizedTreatment = {
  language: PatientLanguage;
  labels: Labels;
  condition: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  doctorNotes: string | null;
  amendmentReason: string | null;
  prescriptions: Required<{ [K in keyof SourcePrescription]: string | null }>[];
  spokenSummary: string;
};

const clean = (v: unknown, max = 2000): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

const withDr = (name: string) => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);

// English version (no translation needed), including a script for the voice recording.
export const buildEnglishVersion = (src: SourceTreatment): LocalizedTreatment => {
  const doctor = withDr(src.doctorName);
  const medLines = src.prescriptions.map((p, i) => {
    const how = [p.dosage, p.frequency, p.duration ? `for ${p.duration}` : null].filter(Boolean).join(', ');
    return `Medicine ${i + 1}: ${p.medicineName}${p.strength ? `, ${p.strength}` : ''}.${how ? ` Take ${how}.` : ''}${p.instructions ? ` ${p.instructions}.` : ''}`;
  });
  const spoken = [
    `Hello ${src.patientName}. This is your prescription from ${doctor}.`,
    src.diagnosis ? `Diagnosis: ${src.diagnosis}.` : src.condition ? `Condition: ${src.condition}.` : '',
    `You have ${src.prescriptions.length} ${src.prescriptions.length === 1 ? 'medicine' : 'medicines'}.`,
    ...medLines,
    src.doctorNotes ? `Your doctor's advice: ${src.doctorNotes}` : '',
    'Please take your medicines only as your doctor directed, and contact your doctor if you have any questions or side effects.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    language: 'en',
    labels: { ...ENGLISH_LABELS },
    condition: clean(src.condition),
    symptoms: clean(src.symptoms),
    diagnosis: clean(src.diagnosis),
    doctorNotes: clean(src.doctorNotes),
    amendmentReason: clean(src.amendmentReason),
    prescriptions: src.prescriptions.map((p) => ({
      medicineName: p.medicineName,
      strength: clean(p.strength),
      dosage: clean(p.dosage),
      frequency: clean(p.frequency),
      duration: clean(p.duration),
      route: clean(p.route),
      instructions: clean(p.instructions),
    })),
    spokenSummary: spoken.slice(0, 4500),
  };
};

// Gemini sometimes answers 503/429 ("high demand"); retry those with backoff.
const callGeminiJson = async (prompt: string): Promise<any> => {
  const delays = [0, 2000, 5000, 10000];
  let lastErr: any;
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      return await callGeminiJsonOnce(prompt);
    } catch (err: any) {
      lastErr = err;
      if (!/\((429|500|502|503|504)\)|timeout|fetch failed/i.test(String(err?.message))) throw err;
    }
  }
  throw lastErr;
};

const callGeminiJsonOnce = async (prompt: string): Promise<any> => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Gemini translation failed (${res.status})`);
  const data: any = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no translation');
  return JSON.parse(text);
};

// Translated version. Throws on failure; the caller falls back to English.
export const buildTranslatedVersion = async (src: SourceTreatment, language: PatientLanguage): Promise<LocalizedTreatment> => {
  if (language === 'en') return buildEnglishVersion(src);
  const english = buildEnglishVersion(src);
  const lang = PATIENT_LANGUAGES[language];

  const sourceForModel = {
    labels: ENGLISH_LABELS,
    condition: english.condition,
    symptoms: english.symptoms,
    diagnosis: english.diagnosis,
    doctorNotes: english.doctorNotes,
    amendmentReason: english.amendmentReason,
    prescriptions: english.prescriptions.map((p) => ({
      medicineName: p.medicineName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      route: p.route,
      instructions: p.instructions,
    })),
  };

  const prompt = `You translate medical prescriptions for patients in India.
Translate the JSON below from English into ${lang.name} (${lang.native}). Use simple, clear, everyday ${lang.name} that a patient understands, in the ${lang.name} script.

STRICT RULES:
1. Keep every "medicineName" EXACTLY as given, in English letters. Never translate or transliterate medicine names.
2. Keep numbers, doses and units accurate (e.g. "1 tablet", "500 mg", "5 days" must keep the same quantities).
3. Translate meaning only. Do not add, remove or change any medical information. Do not add advice.
4. In "labels", keep the placeholders {name} and {doctor} exactly as they are.
5. Keep null values as null.
6. Also write "spokenSummary": a short script in ${lang.name} to be read aloud to the patient: greet the patient by name ("${src.patientName}"), say it is their prescription from ${withDr(src.doctorName)}, mention the diagnosis if present, then each medicine (name in English) with how and when to take it and for how long, then the doctor's advice if present, and end by telling them to take medicines only as directed and to contact their doctor if they have questions or side effects. Maximum 1500 characters.

Return JSON with exactly these keys: labels, condition, symptoms, diagnosis, doctorNotes, amendmentReason, prescriptions (same order and count), spokenSummary.

JSON to translate:
${JSON.stringify(sourceForModel)}`;

  const out = await callGeminiJson(prompt);

  // Labels: use the translation only where it kept the placeholders.
  const labels: Labels = { ...ENGLISH_LABELS };
  if (out?.labels && typeof out.labels === 'object') {
    for (const key of Object.keys(ENGLISH_LABELS) as (keyof Labels)[]) {
      const value = clean(out.labels[key], 600);
      if (!value) continue;
      const needs = (ENGLISH_LABELS[key].match(/\{(name|doctor)\}/g) || []);
      if (needs.every((ph) => value.includes(ph))) labels[key] = value;
    }
  }

  const outRx: any[] = Array.isArray(out?.prescriptions) ? out.prescriptions : [];
  if (outRx.length !== english.prescriptions.length) throw new Error('Translation changed the number of medicines');

  const spoken = clean(out?.spokenSummary, 4500);
  if (!spoken) throw new Error('Translation has no spoken summary');

  return {
    language,
    labels,
    condition: english.condition ? clean(out.condition) || english.condition : null,
    symptoms: english.symptoms ? clean(out.symptoms) || english.symptoms : null,
    diagnosis: english.diagnosis ? clean(out.diagnosis) || english.diagnosis : null,
    doctorNotes: english.doctorNotes ? clean(out.doctorNotes) || english.doctorNotes : null,
    amendmentReason: english.amendmentReason ? clean(out.amendmentReason) || english.amendmentReason : null,
    prescriptions: english.prescriptions.map((p, i) => ({
      // Always the original English name and strength.
      medicineName: p.medicineName,
      strength: p.strength,
      dosage: p.dosage ? clean(outRx[i]?.dosage) || p.dosage : null,
      frequency: p.frequency ? clean(outRx[i]?.frequency) || p.frequency : null,
      duration: p.duration ? clean(outRx[i]?.duration) || p.duration : null,
      route: p.route ? clean(outRx[i]?.route) || p.route : null,
      instructions: p.instructions ? clean(outRx[i]?.instructions) || p.instructions : null,
    })),
    spokenSummary: spoken,
  };
};
