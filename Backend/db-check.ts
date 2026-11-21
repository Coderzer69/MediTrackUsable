// Read-only database health check: counts rows, changes nothing.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [users, byRole, doctorProfiles, patientProfiles, treatments, prescriptions, accessRequests, auditLogs, documents] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.doctorProfile.count(),
    prisma.patientProfile.count(),
    prisma.treatment.count(),
    prisma.prescription.count(),
    prisma.historyAccessRequest.count(),
    prisma.auditLog.count(),
    prisma.patientDocument.count(),
  ]);
  const doctorsWithoutProfile = await prisma.user.count({ where: { role: 'DOCTOR', doctorProfile: null } });
  const patientsWithoutProfile = await prisma.user.count({ where: { role: 'PATIENT', patientProfile: null } });
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/\/.*$/, '');
  console.log(JSON.stringify({
    databaseHost: host,
    users,
    usersByRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
    doctorProfiles,
    patientProfiles,
    doctorsWithoutProfile,
    patientsWithoutProfile,
    treatments,
    prescriptions,
    accessRequests,
    auditLogs,
    documents,
  }, null, 2));
}

main()
  .catch((e) => { console.error('DB check failed:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
