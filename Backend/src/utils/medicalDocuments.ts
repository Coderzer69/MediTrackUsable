import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getStoredFile } from './fileStore';

// ------------------------------------------------------------------ storage
// Patient medical documents live in a PRIVATE folder that is never served as
// static files. They can only be read through the authenticated API, which
// checks that the caller is the patient or a doctor with approved access.
export const MEDICAL_DOCS_DIR = path.join(__dirname, '../../private-uploads/medical-records');
if (!fs.existsSync(MEDICAL_DOCS_DIR)) {
  fs.mkdirSync(MEDICAL_DOCS_DIR, { recursive: true });
}

// Older uploads (if any) were stored in the public uploads folder.
const LEGACY_UPLOADS_DIR = path.join(__dirname, '../../uploads');

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, { mime: string; extensions: string[] }> = {
  pdf: { mime: 'application/pdf', extensions: ['.pdf'] },
  jpg: { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  png: { mime: 'image/png', extensions: ['.png'] },
};

export const DOCUMENT_CATEGORIES = ['CHECKUP', 'PRESCRIPTION', 'LAB_REPORT', 'OTHER'] as const;

const typeForExtension = (ext: string) =>
  Object.values(ALLOWED_TYPES).find((t) => t.extensions.includes(ext.toLowerCase()));

// ------------------------------------------------------------------ upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MEDICAL_DOCS_DIR),
  // Random name: never reuse the user's file name on disk.
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const documentUploader = multer({
  storage,
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const type = typeForExtension(path.extname(file.originalname));
    if (!type || file.mimetype !== type.mime) {
      return cb(new UploadValidationError('Only PDF, JPG and PNG files are allowed.'));
    }
    cb(null, true);
  },
}).single('file');

class UploadValidationError extends Error {}

// Runs the upload and turns any problem into a clear 400/413 response.
export const handleDocumentUpload = (req: Request, res: Response, next: NextFunction) => {
  documentUploader(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File is too large. The maximum size is ${MAX_DOCUMENT_SIZE / 1024 / 1024} MB.` });
      }
      return res.status(400).json({ error: 'Please upload a single file.' });
    }
    if (err instanceof UploadValidationError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  });
};

// Checks the file's real content (magic bytes), not just its name.
export const fileContentMatchesType = (filePath: string, mime: string) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(8);
    fs.readSync(fd, head, 0, 8, 0);
    if (mime === 'application/pdf') return head.subarray(0, 5).toString('latin1') === '%PDF-';
    if (mime === 'image/png') return head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    return false;
  } finally {
    fs.closeSync(fd);
  }
};

export const removeFileQuietly = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn('Could not remove file:', filePath, e);
  }
};

// ------------------------------------------------------------------ reading
type StoredDocument = {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: Date;
};

export const STORED_PREFIX = 'medical-records/';

export const resolveDocumentPath = (doc: Pick<StoredDocument, 'fileUrl'>) => {
  const name = path.basename(doc.fileUrl);
  return doc.fileUrl.startsWith(STORED_PREFIX)
    ? path.join(MEDICAL_DOCS_DIR, name)
    : path.join(LEGACY_UPLOADS_DIR, name);
};

// What the browser gets: display fields only, never the storage location.
export const toDocumentDto = (doc: StoredDocument) => ({
  id: doc.id,
  title: doc.title,
  fileName: doc.fileName,
  fileType: doc.fileType,
  fileSize: doc.fileSize,
  category: doc.category,
  createdAt: doc.createdAt,
});

// Storage key used in the StoredFile table for a document.
export const documentStorageKey = (doc: Pick<StoredDocument, 'fileUrl'>) =>
  doc.fileUrl.startsWith(STORED_PREFIX) ? doc.fileUrl : path.basename(doc.fileUrl);

// Sends a document for preview (inline) or download (attachment).
// Reads from the database first; falls back to the local disk for files
// uploaded before database storage existed.
export const sendDocumentFile = async (res: Response, doc: StoredDocument, download: boolean) => {
  const stored = await getStoredFile(documentStorageKey(doc));
  const filePath = resolveDocumentPath(doc);
  if (!stored && !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'The file for this record is missing on the server.' });
  }
  const type = typeForExtension(path.extname(doc.fileName)) || typeForExtension(path.extname(filePath));
  const safeName = doc.fileName.replace(/["\r\n\\]/g, '_');
  res.setHeader('Content-Type', type?.mime || stored?.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (stored) return res.end(Buffer.from(stored.data));
  return res.sendFile(filePath);
};
