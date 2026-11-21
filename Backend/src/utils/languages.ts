// Languages a patient can receive prescriptions in. All are supported by the
// ElevenLabs Eleven v4 voice model. English is the source language.
export const PATIENT_LANGUAGES = {
  en: { name: 'English', native: 'English' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  bn: { name: 'Bengali', native: 'বাংলা' },
  mr: { name: 'Marathi', native: 'मराठी' },
  ta: { name: 'Tamil', native: 'தமிழ்' },
  te: { name: 'Telugu', native: 'తెలుగు' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', native: 'മലയാളം' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  ur: { name: 'Urdu', native: 'اردو' },
} as const;

export type PatientLanguage = keyof typeof PATIENT_LANGUAGES;

export const isPatientLanguage = (value: unknown): value is PatientLanguage =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PATIENT_LANGUAGES, value);

// Accepts "hi", "hi-IN", "HI" etc. Falls back to English.
export const normalizeLanguage = (value: unknown): PatientLanguage => {
  if (typeof value !== 'string') return 'en';
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  return isPatientLanguage(code) ? code : 'en';
};
