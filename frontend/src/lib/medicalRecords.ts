import api from './api';

// Patient-uploaded medical records (past checkups, prescriptions, lab reports).

export type RecordCategory = 'CHECKUP' | 'PRESCRIPTION' | 'LAB_REPORT' | 'OTHER';

export type MedicalRecord = {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: RecordCategory | string;
  createdAt: string;
};

export const MAX_RECORD_SIZE = 10 * 1024 * 1024; // keep in step with the server (10 MB)

export const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

export const CATEGORIES: { value: RecordCategory; label: string; badge: string }[] = [
  { value: 'CHECKUP', label: 'Past checkup', badge: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
  { value: 'PRESCRIPTION', label: 'Prescription', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
  { value: 'LAB_REPORT', label: 'Lab report', badge: 'bg-violet-50 text-violet-700 ring-violet-600/15' },
  { value: 'OTHER', label: 'Other', badge: 'bg-gray-100 text-gray-600 ring-gray-500/15' },
];

export const categoryInfo = (value: string) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[3];

// Returns an error message, or null when the file is acceptable.
export const validateRecordFile = (file: File): string | null => {
  const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  const allowedExt = Object.values(ACCEPTED_TYPES).flat();
  const typeOk = file.type ? Object.keys(ACCEPTED_TYPES).includes(file.type) : true;
  if (!allowedExt.includes(ext) || !typeOk) return 'Only PDF, JPG and PNG files are allowed.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_RECORD_SIZE) return `File is too large (${formatBytes(file.size)}). The maximum is ${formatBytes(MAX_RECORD_SIZE)}.`;
  return null;
};

export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const formatRecordDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

export const isImage = (record: Pick<MedicalRecord, 'fileType' | 'fileName'>) =>
  record.fileType.startsWith('image/') || /\.(jpe?g|png)$/i.test(record.fileName);

// Files are fetched with the user's login (not public links), then shown or saved locally.
export const fetchRecordBlob = async (url: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  return res.data as Blob;
};

export const saveBlob = (blob: Blob, fileName: string) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
};

// The API returns JSON errors even for file requests; read them out of a Blob response.
export const readBlobError = async (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.error || fallback;
};

// Where each viewer reads files from.
export const recordUrls = {
  patient: {
    list: '/patient/documents',
    file: (id: string, download = false) => `/patient/documents/${id}/file${download ? '?download=1' : ''}`,
  },
  doctor: (patientId: string) => ({
    list: `/doctor/patient/${patientId}/documents`,
    file: (id: string, download = false) =>
      `/doctor/patient/${patientId}/documents/${id}/file${download ? '?download=1' : ''}`,
  }),
};
