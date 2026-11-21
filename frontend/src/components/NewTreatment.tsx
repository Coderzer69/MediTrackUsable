import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, Mic, Save, Edit, Trash2, Plus, CheckCircle2,
  Loader2, AlertCircle, Volume2, X, Sparkles, Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReviewTreatment from './ReviewTreatment';
import api from '../lib/api';
import { PATIENT_LANGUAGES, languageLabel } from '../lib/patientLanguages';

interface NewTreatmentProps {
  onBack: () => void;
  patient?: any;
}

export default function NewTreatment({ onBack, patient }: NewTreatmentProps) {
  const { t } = useTranslation();
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  // Server features: ElevenLabs dictation / patient voice
  const [caps, setCaps] = useState<{ elevenLabsDictation: boolean; patientVoice: boolean; email: boolean } | null>(null);
  // Language the patient receives the prescription in (their setting; doctor can override)
  const [patientLanguage, setPatientLanguage] = useState<string>(patient?.preferredLanguage || 'en');

  useEffect(() => {
    api.get('/doctor/capabilities').then((res) => setCaps(res.data)).catch(() => setCaps(null));
  }, []);

  useEffect(() => {
    if (patient?.preferredLanguage) setPatientLanguage(patient.preferredLanguage);
  }, [patient?.preferredLanguage]);

  const useScribe = !!caps?.elevenLabsDictation;

  // Treatment Form State
  const [condition, setCondition] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Manual Prescription Modal State
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicineName: '',
    strength: '',
    dosage: '',
    frequency: '',
    duration: '',
    route: 'Oral',
    instructions: '',
  });

  const recognitionRef = useRef<any>(null);
  const transcriptSegmentsRef = useRef<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser. Fallback MediaRecorder will be used.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      if (result?.isFinal) {
        const text = result[0].transcript.trim();
        if (text) {
          transcriptSegmentsRef.current.push(text);
          setTranscript(transcriptSegmentsRef.current.join(' '));
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if ((recognition as any)._shouldRestart) {
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      (recognition as any)._shouldRestart = false;
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        (recognitionRef.current as any)._shouldRestart = false;
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      transcriptSegmentsRef.current = [];
      setTranscript('');
      if (recognitionRef.current) {
        (recognitionRef.current as any)._shouldRestart = true;
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch (err) {
          console.warn('SpeechRecognition start error, falling back to MediaRecorder:', err);
          toggleMediaRecorder();
        }
      } else {
        // Fallback to MediaRecorder
        toggleMediaRecorder();
      }
    }
  };

  // MediaRecorder Fallback (Gemini direct audio fallback)
  const toggleMediaRecorder = async () => {
    if (isMediaRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsMediaRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          // Convert to base64 and send directly to draft-from-audio
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            await draftFromAudioPayload({ audioBase64: base64Audio, mimeType: 'audio/webm' });
          };
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsMediaRecording(true);
      } catch (err) {
        console.error('Microphone permission error:', err);
        showToast('Microphone access was denied. Please allow microphone permissions.', 'error');
      }
    }
  };

  const draftFromAudioPayload = async (payload: { text?: string; audioBase64?: string; mimeType?: string }) => {
    setIsDrafting(true);
    try {
      const currentState = { condition, symptoms, diagnosis, doctorNotes, prescriptions };
      const res = await api.post('/doctor/treatment/draft-from-audio', {
        ...payload,
        patientId: patient?.id,
        currentState,
      });

      const draft = res.data.data;
      if (res.data.transcript) {
        transcriptSegmentsRef.current = [res.data.transcript];
        setTranscript(res.data.transcript);
      }
      if (draft) {
        if (draft.condition) setCondition(draft.condition);
        if (draft.symptoms) setSymptoms(draft.symptoms);
        if (draft.diagnosis) setDiagnosis(draft.diagnosis);
        if (draft.doctorNotes) setDoctorNotes(draft.doctorNotes);
        if (draft.prescriptions && draft.prescriptions.length > 0) {
          setPrescriptions(draft.prescriptions);
        }
        showToast(
          res.data.transcript
            ? `Transcribed by ElevenLabs${res.data.detectedLanguage ? ` (${languageLabel(res.data.detectedLanguage)})` : ''} and filled in. Please review.`
            : 'Clinical consultation fields extracted by Gemini AI.'
        );
      }
    } catch (err: any) {
      console.error('Failed to generate draft', err);
      showToast(err.response?.data?.error || 'Failed to extract draft with Gemini AI', 'error');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleDraftFromText = async () => {
    if (!transcript.trim()) return;
    await draftFromAudioPayload({ text: transcript });
  };

  const handleSave = async (confirm: boolean) => {
    if (!patient?.id) {
      showToast('No patient selected', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/doctor/treatment', {
        patientId: patient.id,
        condition,
        symptoms,
        diagnosis,
        doctorNotes,
        prescriptions,
        status: confirm ? 'CONFIRMED' : 'DRAFT',
        patientLanguage,
      });
      showToast(confirm ? t('treatment.treatmentConfirmedSuccess') : t('treatment.treatmentSavedSuccess'));
      setTimeout(() => onBack(), 600);
    } catch (err: any) {
      console.error('Failed to save treatment', err);
      showToast(err.response?.data?.error || 'Failed to save treatment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Prescription modal helpers
  const openAddPrescription = () => {
    setEditingIndex(null);
    setPrescriptionForm({
      medicineName: '',
      strength: '',
      dosage: '',
      frequency: '',
      duration: '',
      route: 'Oral',
      instructions: '',
    });
    setPrescriptionModalOpen(true);
  };

  const openEditPrescription = (index: number) => {
    setEditingIndex(index);
    const med = prescriptions[index];
    setPrescriptionForm({
      medicineName: med.medicineName || '',
      strength: med.strength || '',
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      duration: med.duration || '',
      route: med.route || 'Oral',
      instructions: med.instructions || '',
    });
    setPrescriptionModalOpen(true);
  };

  const handleSavePrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionForm.medicineName.trim()) return;

    if (editingIndex !== null) {
      setPrescriptions((prev) =>
        prev.map((item, idx) => (idx === editingIndex ? { ...prescriptionForm } : item))
      );
    } else {
      setPrescriptions((prev) => [...prev, { ...prescriptionForm }]);
    }
    setPrescriptionModalOpen(false);
  };

  if (isReviewing) {
    return (
      <div className="pt-2 pb-10">
        <ReviewTreatment
          patient={patient}
          treatmentData={{ condition, symptoms, diagnosis, doctorNotes, prescriptions }}
          onBack={() => setIsReviewing(false)}
          onEdit={() => setIsReviewing(false)}
          onConfirm={() => handleSave(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full font-sans text-gray-900">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 transition-colors font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{t('treatment.newTreatmentTitle')}</h1>
            <p className="text-xs text-gray-500">{t('treatment.aiScribeDesc')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            {t('common.draft')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left Column: Patient Profile & AI Speech */}
        <div className="flex flex-col gap-6">
          {/* Patient Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-[52px] h-[52px] rounded-full bg-[#e6f4ef] text-[#0b3b2c] font-bold text-lg flex items-center justify-center shrink-0 uppercase">
              {patient?.name ? patient.name.charAt(0) : '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-gray-900 truncate mb-0.5">{patient?.name || t('common.patient')}</h3>
              <p className="text-xs text-gray-500 font-mono">ID: {patient?.qrCodeIdentifier || 'QR-N/A'}</p>
              {patient?.email && <p className="text-[11px] text-gray-400 truncate">{patient.email}</p>}
            </div>
          </div>

          {/* Patient's language */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-emerald-600" />
              <label htmlFor="patient-language" className="text-sm font-bold text-gray-900">Patient's language</label>
            </div>
            <select
              id="patient-language"
              value={patientLanguage}
              onChange={(e) => setPatientLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-600"
            >
              {PATIENT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.code === 'en' ? 'English' : `${l.native} — ${l.name}`}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              {patient?.preferredLanguage && patient.preferredLanguage !== patientLanguage
                ? `Patient's setting is ${languageLabel(patient.preferredLanguage)}; this consultation will use ${languageLabel(patientLanguage)}.`
                : 'On confirm, the patient gets the prescription in this language'}
              {caps?.patientVoice ? ', with a voice recording' : ''}
              {caps?.email ? ' and by email' : ''}. Medicine names stay in English.
            </p>
          </div>

          {/* AI Voice Assistant */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="flex items-center gap-2 self-start mb-4">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">{t('treatment.aiScribe')}</h3>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              {t('treatment.aiScribeDesc')}
            </p>

            <button
              onClick={useScribe ? toggleMediaRecorder : toggleSpeechRecognition}
              disabled={isDrafting}
              aria-label={(isRecording || isMediaRecording) ? t('treatment.stopVoice') : t('treatment.startVoice')}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white mb-3 shadow-lg transition-all cursor-pointer disabled:opacity-60 ${
                (isRecording || isMediaRecording)
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20 animate-pulse scale-105'
                  : 'bg-[#0b5c46] hover:bg-[#084836] shadow-emerald-900/20'
              }`}
            >
              <Mic className="w-8 h-8" />
            </button>
            <p className="text-sm font-bold text-gray-900 mb-1">
              {isDrafting ? t('treatment.extractingAi') : (isRecording || isMediaRecording) ? t('treatment.stopVoice') : t('treatment.startVoice')}
            </p>
            <p className="text-[11px] text-gray-400 mb-4">
              {useScribe
                ? (isMediaRecording ? 'Recording… tap again to stop' : 'ElevenLabs · speak in any language')
                : (isRecording ? t('landing.listening') : 'AI Ready')}
            </p>

            {/* Direct Gemini Audio Fallback Option (only when ElevenLabs dictation is off) */}
            {!useScribe && <div className="w-full pt-4 border-t border-gray-100">
              <button
                onClick={toggleMediaRecorder}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isMediaRecording
                    ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isMediaRecording ? t('treatment.stopVoice') : t('treatment.startVoice')}
              </button>
            </div>}

            {/* Live Transcript Box */}
            {transcript !== '' && (
              <div className="w-full mt-4 text-left">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('treatment.liveTranscript')}</label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full bg-gray-50 p-3 rounded-xl text-xs text-gray-700 border border-gray-200 focus:outline-none focus:border-emerald-500 resize-y min-h-[90px]"
                  placeholder={t('treatment.transcriptPlaceholder')}
                />
              </div>
            )}

            {transcript && !isRecording && (
              <button
                onClick={handleDraftFromText}
                disabled={isDrafting}
                className="w-full mt-3 py-2.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isDrafting ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <Sparkles className="w-4 h-4 text-emerald-700" />}
                {isDrafting ? t('treatment.extractingAi') : t('treatment.generateDraft')}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Clinical Details Form */}
        <div className="flex flex-col gap-6">
          {/* Clinical Information Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5">{t('treatment.clinicalFindings')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('treatment.condition')}</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder={t('treatment.conditionPlaceholder')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('treatment.symptoms')}</label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t('treatment.symptomsPlaceholder')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('treatment.diagnosis')}</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder={t('treatment.diagnosisPlaceholder')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('treatment.doctorNotes')}</label>
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder={t('treatment.doctorNotesPlaceholder')}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Prescriptions Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">{t('treatment.prescriptions')}</h2>
                <p className="text-xs text-gray-400">{t('treatment.prescriptionsDesc')}</p>
              </div>
              <button
                onClick={openAddPrescription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('treatment.addMedicine')}
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 mb-6">
                <p className="text-xs text-gray-500 font-medium mb-2">{t('treatment.noPrescriptions')}</p>
                <p className="text-[11px] text-gray-400">{t('treatment.prescriptionsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {prescriptions.map((med, index) => (
                  <div key={index} className="border border-gray-100 bg-[#fbfdfc] rounded-xl p-4 shadow-sm relative">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{med.medicineName}</h4>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {med.route || 'Oral'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditPrescription(index)}
                          className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title={t('common.edit')}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPrescriptions((prev) => prev.filter((_, i) => i !== index))}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px]">{t('treatment.strength')}</span>
                        <span className="font-semibold text-gray-800">{med.strength || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">{t('treatment.dosage')}</span>
                        <span className="font-semibold text-gray-800">{med.dosage || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">{t('treatment.frequency')}</span>
                        <span className="font-semibold text-gray-800">{med.frequency || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">{t('treatment.duration')}</span>
                        <span className="font-semibold text-gray-800">{med.duration || '—'}</span>
                      </div>
                    </div>
                    {med.instructions && (
                      <p className="mt-2 text-[11px] text-gray-500 italic bg-white p-2 rounded-lg border border-gray-100">
                        {t('treatment.instructions')}: {med.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full sm:w-auto flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? t('common.saving') : t('treatment.saveDraft')}
              </button>
              <button
                onClick={() => setIsReviewing(true)}
                disabled={isSaving || !condition.trim()}
                className="w-full sm:w-auto flex-1 py-3 bg-[#0b5c46] hover:bg-[#084836] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('treatment.reviewAndConfirm')} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PRESCRIPTION */}
      {prescriptionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setPrescriptionModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingIndex !== null ? t('treatment.editMedicine') : t('treatment.addMedicine')}
            </h3>
            <form onSubmit={handleSavePrescription} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.medicineName')} *</label>
                <input
                  type="text"
                  required
                  value={prescriptionForm.medicineName}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicineName: e.target.value })}
                  placeholder={t('treatment.medicineNamePlaceholder')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.strength')}</label>
                  <input
                    type="text"
                    value={prescriptionForm.strength}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, strength: e.target.value })}
                    placeholder={t('treatment.strengthPlaceholder')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.dosage')}</label>
                  <input
                    type="text"
                    value={prescriptionForm.dosage}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                    placeholder={t('treatment.dosagePlaceholder')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.frequency')}</label>
                  <input
                    type="text"
                    value={prescriptionForm.frequency}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                    placeholder={t('treatment.frequencyPlaceholder')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.duration')}</label>
                  <input
                    type="text"
                    value={prescriptionForm.duration}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                    placeholder={t('treatment.durationPlaceholder')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.route')}</label>
                <select
                  value={prescriptionForm.route}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, route: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="Oral">{t('treatment.oral')}</option>
                  <option value="Topical">{t('treatment.topical')}</option>
                  <option value="Intravenous (IV)">{t('treatment.intravenous')}</option>
                  <option value="Inhalation">{t('treatment.inhalation')}</option>
                  <option value="Intramuscular (IM)">{t('treatment.intramuscular')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('treatment.instructions')}</label>
                <input
                  type="text"
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                  placeholder={t('treatment.instructionsPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrescriptionModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0b3b2c] hover:bg-[#082a1f] text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {editingIndex !== null ? t('common.save') : t('treatment.addMedicine')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
