import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import te from './locales/te.json';
import ta from './locales/ta.json';

const SUPPORTED_LANGUAGES = ['en', 'hi', 'bn', 'mr', 'te', 'ta'];

const storedLng = localStorage.getItem('i18nextLng');
const initialLanguage = storedLng && SUPPORTED_LANGUAGES.includes(storedLng) ? storedLng : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      bn: { translation: bn },
      mr: { translation: mr },
      te: { translation: te },
      ta: { translation: ta },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
