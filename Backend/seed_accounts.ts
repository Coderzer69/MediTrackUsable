import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generatePatientQrCodeId } from './src/utils/qrGenerator';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@meditrack.com' },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: 'Super Administrator',
    },
    create: {
      email: 'admin@meditrack.com',
      name: 'Super Administrator',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log('✓ Admin account ready:', admin.email);

  // 2. Doctor: Urvish Bhardwaj
  const urvish = await prisma.user.upsert({
    where: { email: 'urvishbhardwaj7@gmail.com' },
    update: {
      passwordHash,
      role: Role.DOCTOR,
      name: 'Dr. Urvish Bhardwaj',
    },
    create: {
      email: 'urvishbhardwaj7@gmail.com',
      name: 'Dr. Urvish Bhardwaj',
      passwordHash,
      role: Role.DOCTOR,
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: urvish.id },
    update: {
      verificationStatus: 'APPROVED',
      specialization: 'General Medicine',
      licenseNumber: 'DOC-URVISH-777',
      verifiedById: admin.id,
    },
    create: {
      userId: urvish.id,
      verificationStatus: 'APPROVED',
      specialization: 'General Medicine',
      licenseNumber: 'DOC-URVISH-777',
      verifiedById: admin.id,
    },
  });
  console.log('✓ Urvish doctor account updated with password123 and APPROVED status:', urvish.email);

  // 3. Demo Doctor
  const demoDoctor = await prisma.user.upsert({
    where: { email: 'doctor@meditrack.com' },
    update: {
      passwordHash,
      role: Role.DOCTOR,
      name: 'Dr. Sarah Wilson',
    },
    create: {
      email: 'doctor@meditrack.com',
      name: 'Dr. Sarah Wilson',
      passwordHash,
      role: Role.DOCTOR,
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: demoDoctor.id },
    update: {
      verificationStatus: 'APPROVED',
      specialization: 'Cardiology',
      licenseNumber: 'DOC-SARAH-101',
      verifiedById: admin.id,
    },
    create: {
      userId: demoDoctor.id,
      verificationStatus: 'APPROVED',
      specialization: 'Cardiology',
      licenseNumber: 'DOC-SARAH-101',
      verifiedById: admin.id,
    },
  });
  console.log('✓ Demo doctor account ready:', demoDoctor.email);

  // 4. Demo Patient
  const demoPatient = await prisma.user.upsert({
    where: { email: 'patient@meditrack.com' },
    update: {
      passwordHash,
      role: Role.PATIENT,
      name: 'Alex Johnson',
    },
    create: {
      email: 'patient@meditrack.com',
      name: 'Alex Johnson',
      passwordHash,
      role: Role.PATIENT,
    },
  });

  const existingPatientProfile = await prisma.patientProfile.findUnique({
    where: { userId: demoPatient.id },
  });

  if (!existingPatientProfile) {
    await prisma.patientProfile.create({
      data: {
        userId: demoPatient.id,
        qrCodeIdentifier: generatePatientQrCodeId(),
      },
    });
  }
  console.log('✓ Demo patient account ready:', demoPatient.email);

  console.log('\n======================================');
  console.log('ALL STANDARD ACCOUNTS READY (password: password123)');
  console.log('Admin:   admin@meditrack.com');
  console.log('Doctor:  urvishbhardwaj7@gmail.com');
  console.log('Doctor:  doctor@meditrack.com');
  console.log('Patient: patient@meditrack.com');
  console.log('======================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

