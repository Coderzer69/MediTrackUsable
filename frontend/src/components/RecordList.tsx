import { useState } from 'react';
import { Download, Eye, FileImage, FileText, Loader2, Trash2 } from 'lucide-react';
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

type RecordListProps = {
  records: MedicalRecord[];
  fileUrl: (id: string, download?: boolean) => string;
  onPreview: (record: MedicalRecord) => void;
  // Omit for read-only lists (doctor view).
  onDelete?: (record: MedicalRecord) => Promise<void>;
  onError?: (message: string) => void;
};

// List of uploaded records: name, upload date, category badge and actions.
export default function RecordList({ records, fileUrl, onPreview, onDelete, onError }: RecordListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = async (record: MedicalRecord) => {
    setDownloadingId(record.id);
    try {
      saveBlob(await fetchRecordBlob(fileUrl(record.id, true)), record.fileName);
    } catch (err) {
      onError?.(await readBlobError(err, 'Could not download this record.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (record: MedicalRecord) => {
    if (!onDelete) return;
    setDeletingId(record.id);
    try {
      await onDelete(record);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <ul className="divide-y divide-gray-100">
      {records.map((record, i) => {
        const category = categoryInfo(record.category);
        const Icon = isImage(record) ? FileImage : FileText;
        const showsFileName = record.title !== record.fileName;
        return (
          <li
            key={record.id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center animate-fade-up"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isImage(record) ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onPreview(record)}
                  className="block max-w-full truncate text-left text-[14.5px] font-bold text-gray-900 hover:text-[#0b5c46] transition-colors"
                  title={record.title}
                >
                  {record.title}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-gray-500">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${category.badge}`}>
                    {category.label}
                  </span>
                  <span>Uploaded {formatRecordDate(record.createdAt)}</span>
                  <span className="text-gray-300">·</span>
                  <span>{formatBytes(record.fileSize)}</span>
                  {showsFileName && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="max-w-[220px] truncate" title={record.fileName}>{record.fileName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 pl-[58px] sm:pl-0">
              {confirmingId === record.id ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-[12.5px] font-medium text-gray-600">Delete this record?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(record)}
                    disabled={deletingId === record.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {deletingId === record.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Delete
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onPreview(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-700 hover:border-emerald-200 hover:text-[#0b5c46] transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(record)}
                    disabled={downloadingId === record.id}
                    title="Download"
                    aria-label={`Download ${record.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:text-[#0b5c46] disabled:opacity-60 transition-colors"
                  >
                    {downloadingId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(record.id)}
                      title="Delete"
                      aria-label={`Delete ${record.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
