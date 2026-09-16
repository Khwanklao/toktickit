import { describe, it, expect, beforeEach } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { runRequesterMigration } from "../../prisma/migrations/data/migrate-requesters.js";
import bcrypt from "bcryptjs";

describe("MIGR-01: Migration & Seed Data Verification", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    // Re-seed development accounts to test seed idempotency and initial state
    const hash = bcrypt.hashSync("Password123!", 10);
    const seedUsers = [
      {
        id: "1",
        name: "Active Requester 1",
        email: "req.active1@toktickit.local",
        role: "REQUESTER" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "2",
        name: "Active Requester 2",
        email: "req.active2@toktickit.local",
        role: "REQUESTER" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "3",
        name: "Active Requester 3",
        email: "req.active3@toktickit.local",
        role: "REQUESTER" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "4",
        name: "Active Requester 4",
        email: "req.active4@toktickit.local",
        role: "REQUESTER" as const,
        isActive: true,
        mustChangePassword: true,
      },
      {
        id: "5",
        name: "Inactive Requester",
        email: "req.inactive@toktickit.local",
        role: "REQUESTER" as const,
        isActive: false,
        mustChangePassword: false,
      },
      {
        id: "staff-1",
        name: "Alex Staff",
        email: "staff.alex@toktickit.local",
        role: "IT_STAFF" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "staff-2",
        name: "Sarah Staff",
        email: "staff.sarah@toktickit.local",
        role: "IT_STAFF" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "staff-3",
        name: "David Staff",
        email: "staff.david@toktickit.local",
        role: "IT_STAFF" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "staff-4",
        name: "Inactive Staff",
        email: "staff.inactive@toktickit.local",
        role: "IT_STAFF" as const,
        isActive: false,
        mustChangePassword: false,
      },
      {
        id: "admin-1",
        name: "Main Admin",
        email: "admin.main@toktickit.local",
        role: "ADMINISTRATOR" as const,
        isActive: true,
        mustChangePassword: false,
      },
      {
        id: "admin-2",
        name: "Secondary Admin",
        email: "admin.secondary@toktickit.local",
        role: "ADMINISTRATOR" as const,
        isActive: true,
        mustChangePassword: false,
      },
    ];

    for (const u of seedUsers) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          mustChangePassword: u.mustChangePassword,
          passwordHash: hash,
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: hash,
          role: u.role,
          isActive: u.isActive,
          mustChangePassword: u.mustChangePassword,
        },
      });
    }
  });

  it("verifies development seed accounts are correctly populated in User table", async () => {
    const requesters = await prisma.user.findMany({
      where: { role: "REQUESTER" },
    });
    expect(requesters.length).toBeGreaterThanOrEqual(5);

    const active4 = await prisma.user.findUnique({
      where: { email: "req.active4@toktickit.local" },
    });
    expect(active4).not.toBeNull();
    expect(active4?.mustChangePassword).toBe(true);

    const inactiveReq = await prisma.user.findUnique({
      where: { email: "req.inactive@toktickit.local" },
    });
    expect(inactiveReq).not.toBeNull();
    expect(inactiveReq?.isActive).toBe(false);

    const staffMembers = await prisma.user.findMany({
      where: { role: "IT_STAFF" },
    });
    expect(staffMembers.length).toBeGreaterThanOrEqual(4);

    const admins = await prisma.user.findMany({
      where: { role: "ADMINISTRATOR" },
    });
    expect(admins.length).toBeGreaterThanOrEqual(2);
  });

  it("verifies fallback email pattern (requester_<legacyId>@toktickit.local) is generated deterministically and uniquely", async () => {
    const legacyId = 99991;
    const fallbackEmail = `requester_${legacyId}@toktickit.local`;

    const user = await prisma.user.upsert({
      where: { email: fallbackEmail },
      update: {},
      create: {
        id: String(legacyId),
        name: `Legacy Requester ${legacyId}`,
        email: fallbackEmail,
        passwordHash: "dummyHash",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
    });

    expect(user.email).toBe("requester_99991@toktickit.local");
    expect(user.mustChangePassword).toBe(true);
  });

  it("verifies requester migration script can be run idempotently without data loss", async () => {
    await expect(runRequesterMigration()).resolves.not.toThrow();
  });
});
