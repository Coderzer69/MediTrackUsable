// Checks that a doctor whose profile row is missing is NOT auto-approved on login.
// Uses a throwaway account (synctest.*@example.com) that is deleted at the end.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:3000/api';
const post = async (path: string, body: unknown) => {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json().catch(() => null)) as any };
};

async function main() {
  const email = `synctest.doctor.${Date.now()}@example.com`;
  const reg = await post('/auth/register', { name: 'Missing Profile Test', email, password: 'test1234', role: 'DOCTOR' });
  const userId = reg.body?.user?.id as string;
  // Simulate the wiped table for this one test account only.
  await prisma.doctorProfile.deleteMany({ where: { userId, user: { email } } });
  const login = await post('/auth/login', { email, password: 'test1234' });
  const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
  console.log(JSON.stringify({
    registered: reg.status,
    loginStatus: login.status,
    loginVerificationStatus: login.body?.user?.verificationStatus,
    storedVerificationStatus: profile?.verificationStatus,
    storedLicenseNumber: profile?.licenseNumber,
  }, null, 2));
  await prisma.user.delete({ where: { id: userId } }); // cascades to the profile
  console.log('cleanup: test account deleted');
}

main()
  .catch((e) => { console.error('Test failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
