import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@meditrack.com';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      name: 'System Admin',
    },
    create: {
      email,
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin account confirmed: ${admin.email} / ${password} (Role: ${admin.role})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
