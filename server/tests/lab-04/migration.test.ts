import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const TEST_DB_URL = "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

describe("REG-01: Migration & Rollback Verification Test (toktickit_test)", () => {
  let prisma: PrismaClient;

  const rollbackSql = `
    DROP TABLE IF EXISTS "ActionTaken" CASCADE;
    ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "reopenedAt";
  `;

  const migrationFilePath = path.resolve(
    "prisma/migrations/20261025024500_add_action_taken_and_reopened_at/migration.sql"
  );
  const forwardMigrationSql = fs.readFileSync(migrationFilePath, "utf8");

  async function executeMultiStatementSql(sql: string) {
    const statements = sql
      .replace(/--.*$/gm, "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
  }

  const legacyUserId = "u-mig-user-legacy";
  const legacyStaffId = "u-mig-staff-legacy";
  const legacyTicketNumber = "TKT-MIG-REG-001";
  let legacyTicketId: number;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    });

    // 1. Roll back ActionTaken and reopenedAt column to simulate pre-migration Lab 3 state
    await executeMultiStatementSql(rollbackSql);

    // 2. Clean up any previous test artifacts
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Ticket" WHERE "ticketNumber" = '${legacyTicketNumber}';`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "User" WHERE id IN ('${legacyUserId}', '${legacyStaffId}');`
    );

    // 3. Insert representative Lab 3 data
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "mustChangePassword", "createdAt", "updatedAt")
      VALUES 
        ('${legacyUserId}', 'Legacy Requester', 'mig.requester@toktickit.local', 'dummyHash', 'REQUESTER', true, false, NOW(), NOW()),
        ('${legacyStaffId}', 'Legacy Staff', 'mig.staff@toktickit.local', 'dummyHash', 'IT_STAFF', true, false, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    `);

    // Ensure category and related system exist
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Category" (id, name, "isActive") VALUES (1, 'Account and Access', true) ON CONFLICT (name) DO NOTHING;
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "RelatedSystem" (id, name, "isActive") VALUES (1, 'Email', true) ON CONFLICT (name) DO NOTHING;
    `);

    // Insert legacy ticket without reopenedAt
    const ticketInsertResult = await prisma.$queryRawUnsafe<Array<{ id: number }>>(`
      INSERT INTO "Ticket" (
        "ticketNumber", "requesterId", "ownerId", "categoryId", "relatedSystemId",
        summary, description, "requestedPriority", "itPriority", status, "isRequesterResolved",
        "createdAt", "updatedAt"
      ) VALUES (
        '${legacyTicketNumber}', '${legacyUserId}', '${legacyStaffId}', 1, 1,
        'Pre-migration Lab 3 Ticket', 'Created before Sprint 4 migration was applied.', 'MEDIUM', 'MEDIUM', 'IN_PROGRESS', false,
        NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'
      )
      RETURNING id;
    `);

    legacyTicketId = ticketInsertResult[0].id;

    // Insert Lab 3 public comment, internal note, attachment
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PublicComment" (id, "ticketId", "authorId", content, "createdAt")
      VALUES ('c-mig-public-1', ${legacyTicketId}, '${legacyUserId}', 'Pre-migration public comment', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "InternalNote" (id, "ticketId", "authorId", content, "createdAt")
      VALUES ('n-mig-internal-1', ${legacyTicketId}, '${legacyStaffId}', 'Pre-migration internal note', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Attachment" (
        "ticketId", "originalFileName", "storedFileName", "mimeType", "fileSize", "uploadedBy", "createdAt"
      ) VALUES (
        ${legacyTicketId}, 'legacy_spec.pdf', 'stored_mig_01.pdf', 'application/pdf', 1024, '${legacyUserId}', NOW()
      );
    `);
  });

  afterAll(async () => {
    // Ensure final state on toktickit_test has migration applied for future test runs
    try {
      await executeMultiStatementSql(forwardMigrationSql);
    } catch {
      // ignore
    }
    await prisma.$disconnect();
  });

  it("applies add_action_taken_and_reopened_at migration without data loss", async () => {
    // Apply migration
    await executeMultiStatementSql(forwardMigrationSql);

    // Verify User table is intact
    const users = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM "User" WHERE id = '${legacyUserId}'`
    );
    expect(users.length).toBe(1);
    expect(users[0].name).toBe("Legacy Requester");

    // Verify Ticket table is intact, with reopenedAt column added
    const tickets = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        ticketNumber: string;
        reopenedAt: Date | null;
        summary: string;
      }>
    >(
      `SELECT id, "ticketNumber", "reopenedAt", summary FROM "Ticket" WHERE id = ${legacyTicketId}`
    );
    expect(tickets.length).toBe(1);
    expect(tickets[0].ticketNumber).toBe(legacyTicketNumber);
    expect(tickets[0].summary).toBe("Pre-migration Lab 3 Ticket");
    expect(tickets[0].reopenedAt).toBeNull();

    // Verify PublicComment is intact
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "PublicComment" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(comments.length).toBe(1);

    // Verify InternalNote is intact
    const notes = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "InternalNote" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(notes.length).toBe(1);

    // Verify Attachment is intact
    const attachments = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM "Attachment" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(attachments.length).toBe(1);

    // Verify legacy ticket has 0 actions taken
    const actions = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "ActionTaken" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(actions.length).toBe(0);

    // Verify new ActionTaken table can be written to
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ActionTaken" (
        id, "ticketId", "actionDateTime", description, result, "performedById", "followUpRequired", "createdAt", "updatedAt"
      ) VALUES (
        'a-mig-test-1', ${legacyTicketId}, NOW(), 'First post-migration action description', 'Action outcome verified successfully.',
        '${legacyStaffId}', false, NOW(), NOW()
      );
    `);

    const newActions = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "ActionTaken" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(newActions.length).toBe(1);
  });

  it("executes the rollback procedure and verifies Lab 3 tables continue to operate normally", async () => {
    // Execute rollback SQL
    await executeMultiStatementSql(rollbackSql);

    // Verify ActionTaken table is dropped
    const actionTakenCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'ActionTaken'
      ) as exists;
    `);
    expect(actionTakenCheck[0].exists).toBe(false);

    // Verify reopenedAt column is dropped from Ticket table
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns WHERE table_name = 'Ticket' AND column_name = 'reopenedAt'
      ) as exists;
    `);
    expect(columnCheck[0].exists).toBe(false);

    // Verify Lab 3 Ticket row still exists and works
    const tickets = await prisma.$queryRawUnsafe<Array<{ id: number; ticketNumber: string }>>(
      `SELECT id, "ticketNumber" FROM "Ticket" WHERE id = ${legacyTicketId}`
    );
    expect(tickets.length).toBe(1);
    expect(tickets[0].ticketNumber).toBe(legacyTicketNumber);

    // Verify Lab 3 PublicComment, InternalNote, and Attachment still exist
    const comments = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "PublicComment" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(comments.length).toBe(1);

    const notes = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "InternalNote" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(notes.length).toBe(1);

    const attachments = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM "Attachment" WHERE "ticketId" = ${legacyTicketId}`
    );
    expect(attachments.length).toBe(1);
  });
});
