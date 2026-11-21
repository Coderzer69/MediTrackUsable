import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronLeft, FileImage, FileText,
  FolderOpen, Loader2, ShieldCheck, UploadCloud, X,
} from 'lucide-react';
import api from '../lib/api';
import {
  ACCEPT_ATTRIBUTE,
  CATEGORIES,
  MAX_RECORD_SIZE,
  formatBytes,
  recordUrls,
  validateRecordFile,
  type MedicalRecord,
  type RecordCategory,
} from '../lib/medicalRecords';
import RecordList from './RecordList';
import RecordPreviewModal from './RecordPreviewModal';

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'success'; title: string }
  | { phase: 'error'; message: string };

type PatientMedicalRecordsProps = {
  onBack: () => void;
};

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '');

export default function PatientMedicalRecords({ onBack }: PatientMedicalRecordsProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [filter, setFilter] = useState<'ALL' | RecordCategory>('ALL');
  const [previewing, setPreviewing] = useState<MedicalRecord | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('CHECKUP');
  const [dragActive, setDragActive] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ phase: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const fetchRecords = async () => {
    try {
      setListError('');
      const res = await api.get(recordUrls.patient.list);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setListError(err.response?.data?.error || 'Could not load your medical records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (upload.phase !== 'success') return;
    const timer = window.setTimeout(() => setUpload({ phase: 'idle' }), 3500);
    return () => window.clearTimeout(timer);
  }, [upload]);

  const chooseFile = (picked: File | undefined | null) => {
    if (!picked) return;
    const problem = validateRecordFile(picked);
    setUpload({ phase: 'idle' });
    if (problem) {
      setFile(null);
      setFileError(problem);
      return;
    }
    setFileError('');
    setFile(picked);
    setTitle(stripExtension(picked.name));
  };

  const clearSelection = () => {
    setFile(null);
    setFileError('');
    setTitle('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files.length > 1) {
      setFileError('Please upload one file at a time.');
      return;
    }
    chooseFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('title', title.trim() || stripExtension(file.name));
    form.append('category', category);
    setUpload({ phase: 'uploading', progress: 0 });
    try {
      // The browser sets the multipart Content-Type (with boundary) for FormData.
      const res = await api.post(recordUrls.patient.list, form, {
        onUploadProgress: (event) => {
          if (event.total) setUpload({ phase: 'uploading', progress: Math.round((event.loaded / event.total) * 100) });
        },
      });
      setRecords((current) => [res.data, ...current]);
      setUpload({ phase: 'success', title: res.data?.title || file.name });
      clearSelection();
    } catch (err: any) {
      setUpload({
        phase: 'error',
        message: err.response?.data?.error || 'Upload failed. Please check your connection and try again.',
      });
    }
  };

  const handleDelete = async (record: MedicalRecord) => {
    try {
      await api.delete(`${recordUrls.patient.list}/${record.id}`);
      setRecords((current) => current.filter((r) => r.id !== record.id));
    } catch (err: any) {
      setListError(err.response?.data?.error || 'Could not delete this record.');
    }
  };

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = records.filter((r) => r.category === c.value).length;
    return acc;
  }, {});
  const visible = filter === 'ALL' ? records : records.filter((r) => r.category === filter);
  const uploading = upload.phase === 'uploading';
  const SelectedIcon = file?.type.startsWith('image/') ? FileImage : FileText;

  return (
    <div className="w-full font-sans">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-emerald-700 hover:text-emerald-800 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-[14px] text-gray-500">Upload past checkups, prescriptions and lab reports in one place.</p>
        </div>
      </div>

      {/* Uploader */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload a medical record: drag and drop a file, or press Enter to browse"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
              : fileError
                ? 'border-red-300 bg-red-50/40'
                : 'border-gray-200 bg-gray-50/60 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <span className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors ${dragActive ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-emerald-600 shadow-sm border border-gray-100'}`}>
            <UploadCloud className="h-6 w-6" />
          </span>
          <p className="text-[15px] font-bold text-gray-900">
            {dragActive ? 'Drop your file to add it' : 'Drag & drop a file here'}
          </p>
          <p className="mt-1 text-[13.5px] text-gray-500">
            or <span className="font-semibold text-[#0b5c46] underline underline-offset-2">browse from your device</span>
          </p>
          <p className="mt-3 text-[12px] text-gray-400">PDF, JPG or PNG · up to {formatBytes(MAX_RECORD_SIZE)}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
        </div>

        {fileError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700 animate-fade-up" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {fileError}
          </div>
        )}

        {file && (
          <div className="mt-5 space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 border border-gray-100">
                <SelectedIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-gray-900">{file.name}</p>
                <p className="text-[12.5px] text-gray-500">{formatBytes(file.size)} · ready to upload</p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Remove selected file"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="record-title" className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                  Title
                </label>
                <input
                  id="record-title"
                  type="text"
                  value={title}
                  maxLength={120}
                  disabled={uploading}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood test - March 2026"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-semibold text-gray-700">Record type</span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Record type">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={category === c.value}
                      disabled={uploading}
                      onClick={() => setCategory(c.value)}
                      className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                        category === c.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {upload.phase === 'uploading' ? (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between text-[13px] font-medium text-gray-600">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Uploading securely...
                  </span>
                  <span className="tabular-nums">{upload.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-200 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUpload}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0b5c46] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-[#094d3a] transition-colors"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload record
                </button>
              </div>
            )}
          </div>
        )}

        {upload.phase === 'success' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-800 animate-fade-up" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            “{upload.title}” was uploaded and added to your records.
          </div>
        )}
        {upload.phase === 'error' && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700 animate-fade-up" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {upload.message}
          </div>
        )}
      </section>

      {/* Records list */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[17px] font-bold text-gray-900">
            Your records {records.length > 0 && <span className="font-medium text-gray-400">({records.length})</span>}
          </h2>
          {records.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[{ value: 'ALL' as const, label: 'All', count: records.length }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label, count: counts[c.value] }))].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                    filter === chip.value ? 'bg-[#0b5c46] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip.label} <span className="opacity-70">{chip.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {listError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {listError}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3.5 py-3 animate-pulse">
                <div className="h-11 w-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FolderOpen className="h-7 w-7" />
            </span>
            <p className="text-[15px] font-bold text-gray-900">No medical records yet</p>
            <p className="mt-1 max-w-sm text-[13.5px] text-gray-500">
              Upload your past checkups, prescriptions and lab reports above. They stay private until you approve a doctor's access request.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-gray-500">No records in this category yet.</p>
        ) : (
          <RecordList
            records={visible}
            fileUrl={recordUrls.patient.file}
            onPreview={setPreviewing}
            onDelete={handleDelete}
            onError={setListError}
          />
        )}

        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-gray-50 px-4 py-3 text-[12.5px] text-gray-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Doctors can view and download these records only after you approve their request under History Access, and only until that access expires. They can't change or delete anything.
        </div>
      </section>

      {previewing && (
        <RecordPreviewModal
          record={previewing}
          fileUrl={recordUrls.patient.file(previewing.id)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
