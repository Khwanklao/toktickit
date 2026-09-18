import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding database...");

  const defaultPasswordHash = bcrypt.hashSync("Password123!", 10);

  const seedUsers = [
    // Requesters (4 Active + 1 Inactive)
    {
      id: "1",
      name: "Active Requester 1",
      email: "req.active1@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "2",
      name: "Active Requester 2",
      email: "req.active2@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "3",
      name: "Active Requester 3",
      email: "req.active3@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "4",
      name: "Active Requester 4",
      email: "req.active4@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: true,
    },
    {
      id: "5",
      name: "Inactive Requester",
      email: "req.inactive@toktickit.local",
      role: Role.REQUESTER,
      isActive: false,
      mustChangePassword: false,
    },

    // IT Staff (3 Active + 1 Inactive)
    {
      id: "staff-1",
      name: "Alex Staff",
      email: "staff.alex@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "staff-2",
      name: "Sarah Staff",
      email: "staff.sarah@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "staff-3",
      name: "David Staff",
      email: "staff.david@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "staff-4",
      name: "Inactive Staff",
      email: "staff.inactive@toktickit.local",
      role: Role.IT_STAFF,
      isActive: false,
      mustChangePassword: false,
    },

    // Administrators (2 Active)
    {
      id: "admin-1",
      name: "Main Admin",
      email: "admin.main@toktickit.local",
      role: Role.ADMINISTRATOR,
      isActive: true,
      mustChangePassword: false,
    },
    {
      id: "admin-2",
      name: "Secondary Admin",
      email: "admin.secondary@toktickit.local",
      role: Role.ADMINISTRATOR,
      isActive: true,
      mustChangePassword: false,
    },
  ];

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordHash: defaultPasswordHash,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: defaultPasswordHash,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });
    console.log(`Upserted User: ${user.email} (${user.role}, isActive: ${user.isActive})`);
  }

  // Categories (4 categories)
  const categories = [
    { id: 1, name: "Account and Access" },
    { id: 2, name: "Hardware" },
    { id: 3, name: "Software" },
    { id: 4, name: "Network" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
    console.log(`Upserted Category: ${c.name}`);
  }

  // Related Systems (7 related systems)
  const relatedSystems = [
    { id: 1, name: "Email" },
    { id: 2, name: "Campus Wi-Fi" },
    { id: 3, name: "VPN" },
    { id: 4, name: "LEB2 App" },
    { id: 5, name: "Grade Submission App" },
    { id: 6, name: "Printer" },
    { id: 7, name: "Corporate Laptop" },
  ];

  for (const s of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: s.name },
      update: { isActive: true },
      create: { id: s.id, name: s.name, isActive: true },
    });
    console.log(`Upserted Related System: ${s.name}`);
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });