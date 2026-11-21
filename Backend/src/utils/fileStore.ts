import fs from 'fs';
import prisma from './prisma';

// Persistent file storage backed by the StoredFile table.
// Keys look like "medical-records/<uuid>.pdf" or "licenseDocument-<uuid>.png".

export const saveStoredFile = async (key: string, data: Buffer, mimeType: string) => {
  await prisma.storedFile.upsert({
    where: { key },
    create: { key, data, mimeType, size: data.length },
    update: { data, mimeType, size: data.length },
  });
};

export const saveStoredFileFromDisk = async (key: string, filePath: string, mimeType: string) =>
  saveStoredFile(key, fs.readFileSync(filePath), mimeType);

export const getStoredFile = (key: string) => prisma.storedFile.findUnique({ where: { key } });

export const deleteStoredFile = async (key: string) => {
  await prisma.storedFile.deleteMany({ where: { key } });
};
