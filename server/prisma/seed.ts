import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    'Account and Access',
    'Hardware',
    'Software',
    'Network',
  ];

  console.log('Start seeding categories...');

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {}, // ถ้ามีข้อมูลอยู่แล้ว ไม่ต้องแก้ไข
      create: { name }, // ถ้ายังไม่มี ให้สร้างใหม่
    });
    console.log(`Upserted category: ${name}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });