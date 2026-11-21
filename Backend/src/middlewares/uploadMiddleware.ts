import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { saveStoredFileFromDisk } from '../utils/fileStore';

// Temporary local folder. Files are copied into the database right after upload
// (see persistUploads) because the server's disk is not kept between deploys.
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  // Unguessable name: these files are served by URL.
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (MIME_BY_EXT[ext]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.'));
  }
};

const multerInstance = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Copies every uploaded file into the database (key = its file name).
const persistUploads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files: Express.Multer.File[] = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      const f = req.files as any;
      if (Array.isArray(f)) files.push(...f);
      else Object.values(f).forEach((list: any) => files.push(...list));
    }
    for (const file of files) {
      const mime = MIME_BY_EXT[path.extname(file.filename).toLowerCase()] || file.mimetype;
      await saveStoredFileFromDisk(file.filename, file.path, mime);
    }
    next();
  } catch (err) {
    next(err);
  }
};

const withPersist = (handler: any) => [handler, persistUploads];

// Same API as multer (single/fields/array), plus database persistence.
export const upload = {
  single: (name: string) => withPersist(multerInstance.single(name)),
  fields: (fields: multer.Field[]) => withPersist(multerInstance.fields(fields)),
  array: (name: string, max?: number) => withPersist(multerInstance.array(name, max)),
};
