// Languages a patient can receive prescriptions in (matches the backend list).
export const PATIENT_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
] as const;

export const languageLabel = (code?: string | null) => {
  const lang = PATIENT_LANGUAGES.find((l) => l.code === (code || 'en'));
  if (!lang) return code || 'English';
  return lang.code === 'en' ? 'English' : `${lang.native} (${lang.name})`;
};

// Default for new sign-ups: the app's interface language if it's one we support.
export const defaultPatientLanguage = (uiLanguage?: string | null) => {
  const code = (uiLanguage || 'en').split('-')[0].toLowerCase();
  return PATIENT_LANGUAGES.some((l) => l.code === code) ? code : 'en';
};
