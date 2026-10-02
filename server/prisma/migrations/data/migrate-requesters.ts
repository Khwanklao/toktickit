import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function runRequesterMigration() {
  console.log("Starting transactional data migration for legacy requesters...");

  const defaultPasswordHash = bcrypt.hashSync("InitialPassword123!", 10);

  await prisma.$transaction(async (tx) => {
    // 1. Check if legacy RequesterUser table exists
    const tableCheck = await tx.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'RequesterUser'
      ) as exists;
    `;

    const hasLegacyTable = tableCheck[0]?.exists;

    if (!hasLegacyTable) {
      console.log("No legacy 'RequesterUser' table found. Skipping data transform.");
      return;
    }

    // 2. Fetch all legacy requester rows
    const legacyRequesters = await tx.$queryRaw<
      Array<{
        id: number;
        name: string;
        email: string | null;
        department: string | null;
        isActive: boolean;
      }>
    >`SELECT id, name, email, department, "isActive" FROM "RequesterUser"`;

    console.log(`Found ${legacyRequesters.length} legacy requesters.`);

    const userMap: Record<number, string> = {};

    for (const legacy of legacyRequesters) {
      let email = (legacy.email || "").trim().toLowerCase();
      // Fallback email for missing/blank values: requester_<legacyId>@toktickit.local
      if (!email) {
        email = `requester_${legacy.id}@toktickit.local`;
      }

      // Check if user already exists
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            id: String(legacy.id),
            name: legacy.name || `Legacy Requester ${legacy.id}`,
            email,
            passwordHash: defaultPasswordHash,
            role: "REQUESTER",
            isActive: legacy.isActive ?? true,
            mustChangePassword: true,
          },
        });
      }
      userMap[legacy.id] = user.id;
    }

    // 3. Update legacy ticket references if legacy column exists
    const ticketColumnCheck = await tx.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'Ticket' AND column_name = 'legacyRequesterId'
      ) as exists;
    `;

    if (ticketColumnCheck[0]?.exists) {
      for (const [legacyIdStr, newUserId] of Object.entries(userMap)) {
        const legacyId = Number(legacyIdStr);
        await tx.$executeRawUnsafe(
          `UPDATE "Ticket" SET "requesterId" = $1 WHERE "legacyRequesterId" = $2`,
          newUserId,
          legacyId
        );
      }
    }

    // 4. Assert that no tickets remain with unmapped or empty requesterId
    const unmappedTickets = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM "Ticket" WHERE "requesterId" IS NULL OR "requesterId" = ''
    `;
    const orphanedCount = Number(unmappedTickets[0]?.count || 0);

    if (orphanedCount > 0) {
      throw new Error(
        `Migration failed & rolled back: Found ${orphanedCount} tickets with unmapped or orphaned requesterId.`
      );
    }

    console.log("Requester migration data transformation completed successfully.");
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate-requesters.ts")) {
  runRequesterMigration()
    .then(() => {
      console.log("Migration script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration script error:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
