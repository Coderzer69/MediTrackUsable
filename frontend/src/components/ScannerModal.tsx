import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Search, Camera, AlertCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface ScannerModalProps {
  onClose: () => void;
  onPatientFound: (patient: any) => void;
}

export default function ScannerModal({ onClose, onPatientFound }: ScannerModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualQr, setManualQr] = useState('');
  const [cameraError, setCameraError] = useState(false);

  const handleScan = async (text: string) => {
    const cleanId = text?.trim();
    if (loading || !cleanId) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/doctor/patient/${encodeURIComponent(cleanId)}`);
      onPatientFound(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No patient found for this QR code identifier.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQr.trim()) {
      handleScan(manualQr.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white rounded-full text-gray-700 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Scan Patient QR Code</h2>
          <p className="text-xs text-gray-500">
            Scan the patient's card or enter their unique QR identifier below to start a consultation.
          </p>
        </div>

        {/* Scanner View */}
        <div className="w-full bg-slate-950 aspect-[4/3] relative flex items-center justify-center overflow-hidden">
          {!cameraError ? (
            <Scanner
              onScan={(detectedCodes) => {
                if (detectedCodes && detectedCodes.length > 0) {
                  handleScan(detectedCodes[0].rawValue);
                }
              }}
              onError={(err) => {
                console.warn('QR Scanner camera issue:', err);
                setCameraError(true);
              }}
            />
          ) : (
            <div className="p-6 text-center text-white flex flex-col items-center">
              <Camera className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-sm font-semibold text-gray-300 mb-1">Camera Unavailable</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Camera access was denied or not supported on this device. You can enter the QR identifier manually below.
              </p>
            </div>
          )}
        </div>

        {/* Error / Loading feedback */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs flex items-center gap-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {loading && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-center gap-2 border-b border-emerald-100 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Verifying patient details...</span>
          </div>
        )}

        {/* Manual Fallback Input */}
        <div className="p-5 bg-gray-50/80 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-700 mb-2">Or Enter QR Code / Patient ID Manually:</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. PT-94827104"
              value={manualQr}
              onChange={(e) => setManualQr(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={loading || !manualQr.trim()}
              className="px-4 py-2.5 bg-[#0b3b2c] hover:bg-[#082a1f] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
