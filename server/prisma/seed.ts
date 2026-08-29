import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding database...');

  // 1. Seed Requesters (4 active + 1 inactive)
  const requesters = [
    {
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.com',
      department: 'Engineering',
      isActive: true,
    },
    {
      id: 2,
      name: 'Michael Brown',
      email: 'michael.brown@example.com',
      department: 'Finance',
      isActive: true,
    },
    {
      id: 3,
      name: 'Sarah Davis',
      email: 'sarah.davis@example.com',
      department: 'Marketing',
      isActive: true,
    },
    {
      id: 4,
      name: 'David Wilson',
      email: 'david.wilson@example.com',
      department: 'Human Resources',
      isActive: true,
    },
    {
      id: 5,
      name: 'Robert Taylor',
      email: 'robert.taylor@example.com',
      department: 'Operations',
      isActive: false,
    },
  ];

  for (const r of requesters) {
    await prisma.requesterUser.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        email: r.email,
        department: r.department,
        isActive: r.isActive,
      },
      create: r,
    });
    console.log(`Upserted Requester: ${r.name} (isActive: ${r.isActive})`);
  }

  // 2. Seed Categories (4 categories)
  const categories = [
    { id: 1, name: 'Account and Access' },
    { id: 2, name: 'Hardware' },
    { id: 3, name: 'Software' },
    { id: 4, name: 'Network' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
    console.log(`Upserted Category: ${c.name}`);
  }

  // 3. Seed Related Systems (7 related systems)
  const relatedSystems = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Campus Wi-Fi' },
    { id: 3, name: 'VPN' },
    { id: 4, name: 'LEB2 App' },
    { id: 5, name: 'Grade Submission App' },
    { id: 6, name: 'Printer' },
    { id: 7, name: 'Corporate Laptop' },
  ];

  for (const s of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: s.name },
      update: { isActive: true },
      create: { id: s.id, name: s.name, isActive: true },
    });
    console.log(`Upserted Related System: ${s.name}`);
  }

  // Sync PostgreSQL sequence counters to prevent PK collision on auto-increment
  await prisma.$executeRawUnsafe(
    `SELECT setval('"RequesterUser_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "RequesterUser"));`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Category_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "Category"));`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('"RelatedSystem_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "RelatedSystem"));`
  );

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });