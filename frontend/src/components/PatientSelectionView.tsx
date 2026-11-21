import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { QrCode, Search, UserCheck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

interface PatientSelectionViewProps {
  onPatientSelected: (patient: any) => void;
}

export default function PatientSelectionView({ onPatientSelected }: PatientSelectionViewProps) {
  const { t } = useTranslation();
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMode, setActiveMode] = useState<'scan' | 'manual'>('scan');

  const handleScanOrSubmit = async (text: string) => {
    const raw = text?.trim();
    if (loading || !raw) return;

    // Clean code if a full URL or prefix was scanned (e.g. from QR code)
    const cleanId = raw.includes('/') ? raw.split('/').pop()?.trim() || raw : raw;

    setLoading(true);
    setError('');
    
    try {
      const res = await api.get(`/doctor/patient/${encodeURIComponent(cleanId)}`);
      onPatientSelected(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || t('doctor.patientNotFound'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full font-sans flex flex-col items-center justify-center pt-8 pb-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-700">
            <UserCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{t('doctor.scannerTitle')}</h1>
          <p className="text-gray-500 font-medium">{t('doctor.scannerSubtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_20px_rgb(0,0,0,0.03)] overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveMode('scan')}
              className={`flex-1 py-4 text-[14.5px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeMode === 'scan' ? 'bg-[#f0f7f4] text-[#0b5c46] border-b-2 border-[#0b5c46]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <QrCode className="w-[18px] h-[18px]" />
              {t('doctor.scanQrTab')}
            </button>
            <button
              onClick={() => setActiveMode('manual')}
              className={`flex-1 py-4 text-[14.5px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeMode === 'manual' ? 'bg-[#f0f7f4] text-[#0b5c46] border-b-2 border-[#0b5c46]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Search className="w-[18px] h-[18px]" />
              {t('doctor.manualEntryTab')}
            </button>
          </div>

          <div className="p-8">
            {activeMode === 'scan' ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden bg-black relative border-4 border-gray-100 mb-4">
                  <Scanner
                    onScan={(detectedCodes) => {
                      if (detectedCodes && detectedCodes.length > 0) {
                        handleScanOrSubmit(detectedCodes[0].rawValue);
                      }
                    }}
                    onError={(err) => console.log(err)}
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium text-center">{t('doctor.positionQr')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 py-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-bold text-gray-900">{t('doctor.patientIdLabel')}</label>
                  <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanOrSubmit(manualId)}
                    placeholder={t('doctor.patientIdPlaceholder')}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => handleScanOrSubmit(manualId)}
                  disabled={loading || !manualId.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#0b5c46] hover:bg-[#084836] text-white font-bold text-[14.5px] rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Search className="w-[18px] h-[18px]" />
                      {t('doctor.findPatient')}
                    </>
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl text-center border border-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
