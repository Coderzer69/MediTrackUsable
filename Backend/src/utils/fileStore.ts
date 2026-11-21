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

// Removes stored files that belong to a user who is about to be deleted:
// prescription voice recordings of their treatments, their medical records,
// doctor verification documents and avatar. (Database rows cascade; file rows don't.)
export const deleteStoredFilesForUser = async (userId: string) => {
  const [treatments, documents, user] = await Promise.all([
    prisma.treatment.findMany({
      where: { OR: [{ patientId: userId }, { doctorId: userId }] },
      select: { translation: { select: { audioKey: true } } },
    }),
    prisma.patientDocument.findMany({ where: { patientId: userId }, select: { fileUrl: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, doctorProfile: { select: { verificationDocumentUrl: true, qualificationDocumentUrl: true } } },
    }),
  ]);
  const base = (u?: string | null) => (u ? u.replace(/^.*\//, '') : null);
  const keys = [
    ...treatments.map((t) => t.translation?.audioKey),
    ...documents.map((d) => (d.fileUrl.startsWith('medical-records/') ? d.fileUrl : base(d.fileUrl))),
    base(user?.avatarUrl),
    base(user?.doctorProfile?.verificationDocumentUrl),
    base(user?.doctorProfile?.qualificationDocumentUrl),
  ].filter((k): k is string => !!k);
  if (keys.length) await prisma.storedFile.deleteMany({ where: { key: { in: keys } } });
  return keys.length;
};
