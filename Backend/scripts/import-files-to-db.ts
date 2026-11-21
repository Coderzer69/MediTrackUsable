// One-time, additive import of files that were uploaded before database storage
// existed (Backend/uploads and Backend/private-uploads/medical-records) into the
// StoredFile table, so the deployed server can serve them.
// It only INSERTS missing rows. It never deletes or overwrites anything.
//
//   npx tsx scripts/import-files-to-db.ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const root = path.join(__dirname, '..');
const UPLOADS = path.join(root, 'uploads');
const MEDICAL = path.join(root, 'private-uploads', 'medical-records');

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

async function importOne(key: string, filePath: string) {
  if (!fs.existsSync(filePath)) return 'missing';
  const existing = await prisma.storedFile.findUnique({ where: { key }, select: { id: true } });
  if (existing) return 'exists';
  const data = fs.readFileSync(filePath);
  const mimeType = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  await prisma.storedFile.create({ data: { key, data, mimeType, size: data.length } });
  return 'imported';
}

async function main() {
  const counts: Record<string, number> = { imported: 0, exists: 0, missing: 0 };
  const tally = (r: string) => (counts[r] = (counts[r] || 0) + 1);

  // Only files the database actually points to.
  const doctors = await prisma.doctorProfile.findMany({
    select: { verificationDocumentUrl: true, qualificationDocumentUrl: true },
  });
  const users = await prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } });
  const docs = await prisma.patientDocument.findMany({ select: { fileUrl: true } });

  const publicNames = new Set<string>();
  doctors.forEach((d) => [d.verificationDocumentUrl, d.qualificationDocumentUrl].forEach((u) => u && publicNames.add(path.basename(u))));
  users.forEach((u) => u.avatarUrl && publicNames.add(path.basename(u.avatarUrl)));

  for (const name of publicNames) tally(await importOne(name, path.join(UPLOADS, name)));

  for (const d of docs) {
    if (d.fileUrl.startsWith('medical-records/')) {
      tally(await importOne(d.fileUrl, path.join(MEDICAL, path.basename(d.fileUrl))));
    } else {
      const name = path.basename(d.fileUrl);
      tally(await importOne(name, path.join(UPLOADS, name)));
    }
  }

  console.log('File import finished:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error('Import failed:', e?.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
