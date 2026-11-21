import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2, Volume2, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { languageLabel } from '../lib/patientLanguages';

export type TreatmentTranslation = {
  language: string;
  status: 'PENDING' | 'READY' | 'FAILED' | string;
  content: any | null;
  hasAudio: boolean;
  updatedAt?: string;
} | null;

interface Props {
  translation: TreatmentTranslation;
  audioUrl: string; // authenticated API path, e.g. /patient/treatments/:id/audio
  showTranslated: boolean;
  onToggle: (translated: boolean) => void;
}

// Shows the patient-language version controls: a switch between the original
// (English) and the patient's language, and the ElevenLabs voice recording.
export default function PrescriptionLanguagePanel({ translation, audioUrl, showTranslated, onToggle }: Props) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  if (!translation) return null;

  const isEnglish = translation.language === 'en';
  const label = languageLabel(translation.language);

  const loadAudio = async () => {
    setLoadingAudio(true);
    setAudioError('');
    try {
      const res = await api.get(audioUrl, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setAudioSrc(url);
    } catch {
      setAudioError('Could not load the recording. Please try again.');
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-emerald-700" />
          <h2 className="text-[16px] font-bold text-gray-900">Your language: {label}</h2>
        </div>
        {!isEnglish && translation.status === 'READY' && (
          <div className="inline-flex rounded-xl border border-gray-200 p-0.5 text-xs font-bold">
            <button
              onClick={() => onToggle(true)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${showTranslated ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {label.split(' (')[0]}
            </button>
            <button
              onClick={() => onToggle(false)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${!showTranslated ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              English
            </button>
          </div>
        )}
      </div>

      {translation.status === 'PENDING' && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Preparing your prescription in your language…
        </p>
      )}
      {translation.status === 'FAILED' && !isEnglish && (
        <p className="text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> The translation isn't available, so this prescription is shown in English.
        </p>
      )}

      {translation.hasAudio && (
        <div className="mt-2">
          {audioSrc ? (
            <audio controls autoPlay src={audioSrc} className="w-full" aria-label="Listen to your prescription" />
          ) : (
            <button
              onClick={loadAudio}
              disabled={loadingAudio}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              Listen to your prescription
            </button>
          )}
          {audioError && <p className="text-xs text-red-600 mt-2">{audioError}</p>}
        </div>
      )}

      <p className="text-[12px] text-gray-500 mt-3">
        Medicine names are kept in English. Translated and spoken automatically. If anything is unclear, ask your doctor.
      </p>
    </div>
  );
}
