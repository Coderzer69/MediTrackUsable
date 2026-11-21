import { useEffect, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2, X } from 'lucide-react';
import {
  categoryInfo,
  fetchRecordBlob,
  formatBytes,
  formatRecordDate,
  isImage,
  readBlobError,
  saveBlob,
  type MedicalRecord,
} from '../lib/medicalRecords';

type RecordPreviewModalProps = {
  record: MedicalRecord;
  fileUrl: string; // inline (preview) URL for this record
  onClose: () => void;
};

// Shows a PDF or image inside the app. The file is loaded with the viewer's
// login, so it never needs a public link.
export default function RecordPreviewModal({ record, fileUrl, onClose }: RecordPreviewModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let url = '';
    let cancelled = false;
    fetchRecordBlob(fileUrl)
      .then((b) => {
        if (cancelled) return;
        // Force the right type so the browser renders it instead of downloading.
        const typed = new Blob([b], { type: isImage(record) ? record.fileType || 'image/jpeg' : 'application/pdf' });
        url = URL.createObjectURL(typed);
        setBlob(typed);
        setObjectUrl(url);
      })
      .catch(async (err) => {
        if (!cancelled) setError(await readBlobError(err, 'Could not open this record.'));
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileUrl, record]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const category = categoryInfo(record.category);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${record.title}`}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 sm:px-6 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-gray-900">{record.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-gray-500">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${category.badge}`}>
                {category.label}
              </span>
              <span>{formatRecordDate(record.createdAt)}</span>
              <span>·</span>
              <span>{formatBytes(record.fileSize)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!blob}
              onClick={() => blob && saveBlob(blob, record.fileName)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-50 p-3 sm:p-4">
          {error ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-red-600">
              <AlertCircle className="h-8 w-8" />
              {error}
            </div>
          ) : !objectUrl ? (
            <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin text-[#0b5c46]" />
              Loading preview...
            </div>
          ) : isImage(record) ? (
            <img src={objectUrl} alt={record.title} className="max-h-full max-w-full rounded-lg object-contain shadow-sm" />
          ) : (
            <object data={objectUrl} type="application/pdf" className="h-full w-full min-h-[60vh] rounded-lg bg-white">
              <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-gray-500">
                <FileText className="h-10 w-10 text-gray-300" />
                Your browser can't show PDFs here.
                <button
                  type="button"
                  onClick={() => blob && saveBlob(blob, record.fileName)}
                  className="rounded-xl bg-[#0b5c46] px-4 py-2 font-semibold text-white hover:bg-[#094d3a]"
                >
                  Download PDF
                </button>
              </div>
            </object>
          )}
        </div>
      </div>
    </div>
  );
}
