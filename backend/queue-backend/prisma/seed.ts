import { CounterStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where: { code: 'NASR' },
    update: {
      name: 'Nasr City Branch', nameAr: 'فرع مدينة نصر', nameEn: 'Nasr City Branch',
      address: 'Nasr City, Cairo', addressAr: 'مدينة نصر، القاهرة', addressEn: 'Nasr City, Cairo',
      latitude: 30.0561, longitude: 31.33,
    },
    create: {
      name: 'Nasr City Branch', nameAr: 'فرع مدينة نصر', nameEn: 'Nasr City Branch', code: 'NASR',
      address: 'Nasr City, Cairo', addressAr: 'مدينة نصر، القاهرة', addressEn: 'Nasr City, Cairo',
      latitude: 30.0561, longitude: 31.33,
      timezone: 'Africa/Cairo',
    },
  });

  const dental = await prisma.service.upsert({
    where: { branchId_prefix: { branchId: branch.id, prefix: 'D' } },
    update: {
      name: 'Dental examination', nameAr: 'كشف الأسنان', nameEn: 'Dental examination',
      description: 'General dental examination queue', descriptionAr: 'طابور الكشف العام للأسنان',
      descriptionEn: 'General dental examination queue',
    },
    create: {
      branchId: branch.id, name: 'Dental examination', nameAr: 'كشف الأسنان', nameEn: 'Dental examination', prefix: 'D',
      description: 'General dental examination queue', descriptionAr: 'طابور الكشف العام للأسنان',
      descriptionEn: 'General dental examination queue', averageServiceMinutes: 15, nearTurnThreshold: 2,
    },
  });
  const general = await prisma.service.upsert({
    where: { branchId_prefix: { branchId: branch.id, prefix: 'G' } },
    update: {
      name: 'General examination', nameAr: 'الكشف العام', nameEn: 'General examination',
      description: 'General examination queue', descriptionAr: 'طابور الكشف العام',
      descriptionEn: 'General examination queue',
    },
    create: {
      branchId: branch.id, name: 'General examination', nameAr: 'الكشف العام', nameEn: 'General examination', prefix: 'G',
      description: 'General examination queue', descriptionAr: 'طابور الكشف العام',
      descriptionEn: 'General examination queue',
      averageServiceMinutes: 10, nearTurnThreshold: 2,
    },
  });

  await prisma.counter.upsert({
    where: { branchId_number: { branchId: branch.id, number: 1 } },
    update: { serviceId: dental.id, name: 'Desk 1' },
    create: { branchId: branch.id, serviceId: dental.id, name: 'Desk 1', number: 1, status: CounterStatus.CLOSED },
  });
  await prisma.counter.upsert({
    where: { branchId_number: { branchId: branch.id, number: 2 } },
    update: { serviceId: general.id, name: 'Desk 2' },
    create: { branchId: branch.id, serviceId: general.id, name: 'Desk 2', number: 2, status: CounterStatus.CLOSED },
  });

  const users = [
    { email: 'admin@queue.local', fullName: 'System Admin', role: Role.ADMIN, branchId: null, password: 'Admin123!' },
    { email: 'manager@queue.local', fullName: 'Branch Manager', role: Role.MANAGER, branchId: branch.id, password: 'Manager123!' },
    { email: 'staff@queue.local', fullName: 'Desk Staff', role: Role.STAFF, branchId: branch.id, password: 'Staff123!' },
    { email: 'customer@queue.local', fullName: 'Demo Customer', role: Role.CUSTOMER, branchId: null, password: 'Customer123!' },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email, fullName: user.fullName, role: user.role, branchId: user.branchId,
        passwordHash: await bcrypt.hash(user.password, 12),
      },
    });
  }

  console.log('Seed completed. Demo accounts are documented in README.md.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
