import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const TEST_DB_URL = "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

// Ensure DATABASE_URL is directed to the isolated test database for this suite
process.env.DATABASE_URL = TEST_DB_URL;

describe("REG-01: Migration & Rollback Verification Test (toktickit_test)", () => {
  let prisma: PrismaClient;

  const rollbackSql = `
    DROP TABLE IF EXISTS "ActionTaken" CASCADE;
    ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "reopenedAt";
  `;

  // Dynamically discover the migration folder name from server/prisma/migrations/
  const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
  const migrationEntries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const targetDirEntry = migrationEntries.find(
    (entry) => entry.isDirectory() && entry.name.includes("add_action_taken_and_reopened_at")
  );

  if (!targetDirEntry) {
    throw new Error(
      "Could not find migration directory matching 'add_action_taken_and_reopened_at' under prisma/migrations"
    );
  }

  const migrationName = targetDirEntry.name;
  const migrationFilePath = path.join(migrationsDir, migrationName, "migration.sql");
  const forwardMigrationSql = fs.readFileSync(migrationFilePath, "utf8");

  interface PrismaMigrationRow {
    id: string;
    checksum: string;
    finished_at: Date | string | null;
    migration_name: string;
    logs: string | null;
    rolled_back_at: Date | string | null;
    started_at: Date | string | null;
    applied_steps_count: number;
  }

  let savedMigrationRow: PrismaMigrationRow | null = null;

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
    // 5. Safety guard: assert that DATABASE_URL points to toktickit_test and abort before any destructive statement
    expect(process.env.DATABASE_URL).toContain("toktickit_test");
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("toktickit_test")) {
      throw new Error(
        `Safety guard aborted: DATABASE_URL must point to toktickit_test, got: ${process.env.DATABASE_URL}`
      );
    }

    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    // Capture real migration row before any rollback or schema alterations
    const initialRows = await prisma.$queryRawUnsafe<PrismaMigrationRow[]>(
      `SELECT * FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}';`
    );
    if (initialRows.length > 0) {
      savedMigrationRow = initialRows[0];
    }

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
    // Restore schema objects and preserved migration row to leave toktickit_test in valid state
    try {
      if (prisma) {
        await executeMultiStatementSql(forwardMigrationSql);

        if (savedMigrationRow) {
          // Any DELETE or UPDATE on _prisma_migrations must filter strictly by exact migration_name
          await prisma.$executeRawUnsafe(
            `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}';`
          );
          await prisma.$executeRawUnsafe(
            `INSERT INTO "_prisma_migrations" (
              id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
            savedMigrationRow.id,
            savedMigrationRow.checksum,
            savedMigrationRow.finished_at,
            savedMigrationRow.migration_name,
            savedMigrationRow.logs,
            savedMigrationRow.rolled_back_at,
            savedMigrationRow.started_at,
            savedMigrationRow.applied_steps_count
          );
        }
      }
    } finally {
      await prisma?.$disconnect();
    }
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
    // Before rollback step: read real row of migration and keep every column value
    const preRollbackRows = await prisma.$queryRawUnsafe<PrismaMigrationRow[]>(
      `SELECT * FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}';`
    );
    expect(preRollbackRows.length).toBe(1);
    savedMigrationRow = preRollbackRows[0];
    expect(savedMigrationRow.migration_name).toBe(migrationName);
    expect(savedMigrationRow.checksum).toBeDefined();

    // Execute rollback SQL
    await executeMultiStatementSql(rollbackSql);

    // Execute documented history synchronization step per specification §7.3
    // Any DELETE or UPDATE on _prisma_migrations must filter strictly by exact migration_name only
    await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}';`
    );

    // Concrete assertion: row must be absent from _prisma_migrations
    const postRollbackCheck = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(`
      SELECT migration_name FROM "_prisma_migrations" WHERE "migration_name" = '${migrationName}';
    `);
    expect(postRollbackCheck.length).toBe(0);

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
