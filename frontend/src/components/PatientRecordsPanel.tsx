import { useEffect, useState } from 'react';
import { AlertCircle, FolderOpen, Lock, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { recordUrls, type MedicalRecord } from '../lib/medicalRecords';
import RecordList from './RecordList';
import RecordPreviewModal from './RecordPreviewModal';

type PatientRecordsPanelProps = {
  patientId: string;
  patientName?: string;
  // Tighter spacing for use inside a pop-up.
  compact?: boolean;
};

type PanelState =
  | { kind: 'loading' }
  | { kind: 'locked'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; records: MedicalRecord[] };

// Doctor view of the documents a patient uploaded: read-only (preview + download).
// The server only returns them while the patient's approval is active.
export default function PatientRecordsPanel({ patientId, patientName, compact = false }: PatientRecordsPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: 'loading' });
  const [previewing, setPreviewing] = useState<MedicalRecord | null>(null);
  const [actionError, setActionError] = useState('');
  const urls = recordUrls.doctor(patientId);

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      const res = await api.get(urls.list);
      setState({ kind: 'ready', records: Array.isArray(res.data) ? res.data : [] });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setState({
          kind: 'locked',
          message: 'These records unlock once the patient approves your history access request.',
        });
      } else {
        setState({ kind: 'error', message: err.response?.data?.error || 'Could not load patient records.' });
      }
    }
  };

  useEffect(() => {
    if (patientId) load();
  }, [patientId]);

  const count = state.kind === 'ready' ? state.records.length : 0;

  return (
    <section
      className={`rounded-2xl border border-gray-100 bg-white ${compact ? 'p-4' : 'p-5 sm:p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}
      aria-label="Patient medical records"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h2 className={`${compact ? 'text-[15px]' : 'text-[17px]'} font-bold text-gray-900`}>
            Patient Medical Records {count > 0 && <span className="font-medium text-gray-400">({count})</span>}
          </h2>
          <p className="text-[12.5px] text-gray-500">
            Uploaded by {patientName || 'the patient'} · view only
          </p>
        </div>
        {state.kind === 'ready' && (
          <button
            type="button"
            onClick={load}
            title="Refresh"
            aria-label="Refresh records"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {actionError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="mt-3 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-2 animate-pulse">
              <div className="h-11 w-11 rounded-xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-gray-100" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.kind === 'locked' && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[13.5px] text-amber-800">
          <Lock className="h-5 w-5 shrink-0 text-amber-600" />
          {state.message}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.message}
          </span>
          <button type="button" onClick={load} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' &&
        (state.records.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <FolderOpen className="h-5 w-5" />
            </span>
            <p className="text-[13.5px] text-gray-500">This patient hasn't uploaded any medical records yet.</p>
          </div>
        ) : (
          <div className={compact ? 'max-h-[300px] overflow-y-auto pr-1' : ''}>
            <RecordList
              records={state.records}
              fileUrl={urls.file}
              onPreview={setPreviewing}
              onError={setActionError}
            />
          </div>
        ))}

      {previewing && (
        <RecordPreviewModal
          record={previewing}
          fileUrl={urls.file(previewing.id)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </section>
  );
}
