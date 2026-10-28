import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seed(client: PrismaClient = prisma) {
  console.log("Start seeding database...");

  const defaultPasswordHash = bcrypt.hashSync("Password123!", 10);

  // 1. Users (Lab 3 users + zero-ticket requester)
  const seedUsers = [
    // Requesters (4 Active + 1 Inactive + 1 Zero-ticket Requester)
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
    {
      id: "6",
      name: "Zero Ticket Requester",
      email: "req.zero@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
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

  const userMap: Record<string, string> = {};

  for (const user of seedUsers) {
    const upserted = await client.user.upsert({
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
    userMap[user.email] = upserted.id;
    console.log(`Upserted User: ${user.email} (${user.role}, isActive: ${user.isActive})`);
  }

  // 2. Categories (4 categories)
  const categories = [
    { id: 1, name: "Account and Access" },
    { id: 2, name: "Hardware" },
    { id: 3, name: "Software" },
    { id: 4, name: "Network" },
  ];

  for (const c of categories) {
    await client.category.upsert({
      where: { name: c.name },
      update: { isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
    console.log(`Upserted Category: ${c.name}`);
  }

  // 3. Related Systems (7 related systems)
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
    await client.relatedSystem.upsert({
      where: { name: s.name },
      update: { isActive: true },
      create: { id: s.id, name: s.name, isActive: true },
    });
    console.log(`Upserted Related System: ${s.name}`);
  }

  // 4. Tickets (All 8 statuses, assigned and unassigned, mixed priorities)
  const seedTickets = [
    {
      ticketNumber: "TKT-2026-000101",
      requesterEmail: "req.active1@toktickit.local",
      ownerEmail: null,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Cannot access email account after weekend",
      description: "User receives invalid credentials error on Outlook Web Access.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      status: TicketStatus.NEW,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-20T08:00:00.000Z"),
      updatedAt: new Date("2026-10-20T08:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000102",
      requesterEmail: "req.active2@toktickit.local",
      ownerEmail: "staff.alex@toktickit.local",
      categoryId: 4,
      relatedSystemId: 3,
      summary: "VPN profile disconnects periodically",
      description: "Connection drops every 15 minutes during remote session.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: TicketStatus.NEW,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-20T08:30:00.000Z"),
      updatedAt: new Date("2026-10-20T08:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000103",
      requesterEmail: "req.active1@toktickit.local",
      ownerEmail: "staff.alex@toktickit.local",
      categoryId: 4,
      relatedSystemId: 2,
      summary: "Campus Wi-Fi authentication timeout in Building B",
      description: "Laptops in classroom 401 fail 802.1x handshake.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: TicketStatus.OPEN,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-20T09:00:00.000Z"),
      updatedAt: new Date("2026-10-20T09:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000104",
      requesterEmail: "req.active2@toktickit.local",
      ownerEmail: "staff.sarah@toktickit.local",
      categoryId: 2,
      relatedSystemId: 7,
      summary: "Corrupted hard drive sectors on faculty laptop",
      description: "Blue screen error during startup with filesystem corruption.",
      requestedPriority: Priority.URGENT,
      itPriority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-20T10:00:00.000Z"),
      updatedAt: new Date("2026-10-20T11:05:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000105",
      requesterEmail: "req.active1@toktickit.local",
      ownerEmail: "staff.alex@toktickit.local",
      categoryId: 1,
      relatedSystemId: 4,
      summary: "Access permission request for LEB2 grading role",
      description: "Adjunct instructor needs TA access to manage course sections.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: TicketStatus.WAITING_FOR_REQUESTER,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-20T11:30:00.000Z"),
      updatedAt: new Date("2026-10-20T12:05:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000106",
      requesterEmail: "req.active2@toktickit.local",
      ownerEmail: "staff.alex@toktickit.local",
      categoryId: 3,
      relatedSystemId: 5,
      summary: "Grade Submission App session timeout error",
      description: "Instructor unable to submit midterm grades due to CSRF token mismatch.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: TicketStatus.RESOLVED,
      isRequesterResolved: true,
      reopenedAt: null,
      createdAt: new Date("2026-10-21T08:00:00.000Z"),
      updatedAt: new Date("2026-10-21T09:10:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000107",
      requesterEmail: "req.active3@toktickit.local",
      ownerEmail: "staff.sarah@toktickit.local",
      categoryId: 2,
      relatedSystemId: 7,
      summary: "Laptop replacement for retired faculty workstation",
      description: "Routine hardware life-cycle replacement per 4-year cycle.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      status: TicketStatus.CLOSED,
      isRequesterResolved: true,
      reopenedAt: null,
      createdAt: new Date("2026-10-21T10:00:00.000Z"),
      updatedAt: new Date("2026-10-21T11:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000108",
      requesterEmail: "req.active1@toktickit.local",
      ownerEmail: "staff.alex@toktickit.local",
      categoryId: 2,
      relatedSystemId: 6,
      summary: "Department printer printing garbled text across all pages",
      description: "HP LaserJet 400 prints raw PostScript codes after Windows update.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: TicketStatus.REOPENED,
      isRequesterResolved: false,
      reopenedAt: new Date("2026-10-22T14:00:00.000Z"),
      createdAt: new Date("2026-10-22T09:00:00.000Z"),
      updatedAt: new Date("2026-10-22T14:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000109",
      requesterEmail: "req.active3@toktickit.local",
      ownerEmail: null,
      categoryId: 3,
      relatedSystemId: 4,
      summary: "Duplicate ticket submitted for LEB2 course enrollment",
      description: "User accidentally clicked submit twice on slow connection.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      status: TicketStatus.CANCELLED,
      isRequesterResolved: false,
      reopenedAt: null,
      createdAt: new Date("2026-10-23T08:00:00.000Z"),
      updatedAt: new Date("2026-10-23T08:30:00.000Z"),
    },
  ];

  const ticketMap: Record<string, number> = {};

  for (const t of seedTickets) {
    const requesterId = userMap[t.requesterEmail];
    const ownerId = t.ownerEmail ? userMap[t.ownerEmail] : null;

    const upserted = await client.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.status,
        isRequesterResolved: t.isRequesterResolved,
        reopenedAt: t.reopenedAt,
        ownerId,
        updatedAt: t.updatedAt,
      },
      create: {
        ticketNumber: t.ticketNumber,
        requesterId,
        ownerId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.status,
        isRequesterResolved: t.isRequesterResolved,
        reopenedAt: t.reopenedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      },
    });
    ticketMap[t.ticketNumber] = upserted.id;
    console.log(`Upserted Ticket: ${t.ticketNumber} (${t.status})`);
  }

  // 5. Actions Taken (Fixed UUIDs, upsert by id, explicit timestamps)
  const seedActions = [
    // Action 1 on TKT-2026-000103 (OPEN) - 1 action by staff-1
    {
      id: "b0000001-0000-0000-0000-000000000001",
      ticketNumber: "TKT-2026-000103",
      performedByEmail: "staff.alex@toktickit.local",
      actionDateTime: new Date("2026-10-20T09:10:00.000Z"),
      description: "Reviewed AP controller logs and confirmed authentication timeout.",
      result: "Isolated issue to Building B RADIUS secret mismatch.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "controller_debug_log.txt",
      createdAt: new Date("2026-10-20T09:15:00.000Z"),
      updatedAt: new Date("2026-10-20T09:15:00.000Z"),
    },

    // Action 2 on TKT-2026-000104 (IN_PROGRESS) - Multiple actions by different staff (staff-2 and staff-3)
    {
      id: "b0000001-0000-0000-0000-000000000002",
      ticketNumber: "TKT-2026-000104",
      performedByEmail: "staff.sarah@toktickit.local",
      actionDateTime: new Date("2026-10-20T10:15:00.000Z"),
      description: "Ran SMART disk diagnostics and identified bad sectors on NVMe SSD.",
      result: "Disk health status at 42%; immediate replacement required.",
      followUpRequired: true,
      followUpNote: "Back up user profile before hardware replacement.",
      attachmentNotes: "smart_disk_health_report.png",
      createdAt: new Date("2026-10-20T10:20:00.000Z"),
      updatedAt: new Date("2026-10-20T10:20:00.000Z"),
    },
    {
      id: "b0000001-0000-0000-0000-000000000003",
      ticketNumber: "TKT-2026-000104",
      performedByEmail: "staff.david@toktickit.local",
      actionDateTime: new Date("2026-10-20T11:00:00.000Z"),
      description: "Cloned user data onto temporary external drive and prepared new SSD.",
      result: "User data cloned successfully with zero unreadable files.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      createdAt: new Date("2026-10-20T11:05:00.000Z"),
      updatedAt: new Date("2026-10-20T11:05:00.000Z"),
    },

    // Action 4 on TKT-2026-000105 (WAITING_FOR_REQUESTER) - Action recorded by ADMINISTRATOR
    {
      id: "b0000001-0000-0000-0000-000000000004",
      ticketNumber: "TKT-2026-000105",
      performedByEmail: "admin.main@toktickit.local",
      actionDateTime: new Date("2026-10-20T12:00:00.000Z"),
      description: "Reviewed departmental role hierarchy and requested academic dean sign-off.",
      result: "Awaiting signed Dean authorization form from instructor.",
      followUpRequired: true,
      followUpNote: "Contact department coordinator if form is not received within 3 business days.",
      attachmentNotes: "dean_authorization_template.pdf",
      createdAt: new Date("2026-10-20T12:05:00.000Z"),
      updatedAt: new Date("2026-10-20T12:05:00.000Z"),
    },

    // Action 5 on TKT-2026-000106 (RESOLVED) - 1 action
    {
      id: "b0000001-0000-0000-0000-000000000005",
      ticketNumber: "TKT-2026-000106",
      performedByEmail: "staff.alex@toktickit.local",
      actionDateTime: new Date("2026-10-21T09:00:00.000Z"),
      description: "Cleared application server session cache and verified CSRF cookie parameters.",
      result: "Instructor submitted test midterm grade sheet successfully.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "grade_submission_receipt.png",
      createdAt: new Date("2026-10-21T09:10:00.000Z"),
      updatedAt: new Date("2026-10-21T09:10:00.000Z"),
    },

    // Action 6 on TKT-2026-000107 (CLOSED) - 1 action
    {
      id: "b0000001-0000-0000-0000-000000000006",
      ticketNumber: "TKT-2026-000107",
      performedByEmail: "staff.sarah@toktickit.local",
      actionDateTime: new Date("2026-10-21T11:00:00.000Z"),
      description: "Completed asset decommission checklist and certified cryptographic sanitization.",
      result: "Asset inventory updated and sanitization certificate filed.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "asset_disposal_cert_signed.pdf",
      createdAt: new Date("2026-10-21T11:15:00.000Z"),
      updatedAt: new Date("2026-10-21T11:15:00.000Z"),
    },

    // Action 7 on TKT-2026-000108 (REOPENED) - Action created BEFORE reopenedAt, NO action after it
    {
      id: "b0000001-0000-0000-0000-000000000007",
      ticketNumber: "TKT-2026-000108",
      performedByEmail: "staff.alex@toktickit.local",
      actionDateTime: new Date("2026-10-22T10:00:00.000Z"),
      description: "Installed PostScript Type-3 universal driver patch.",
      result: "Printed initial test page; customer later reported garbled margins persisted.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      createdAt: new Date("2026-10-22T10:30:00.000Z"), // before reopenedAt: 2026-10-22T14:00:00.000Z
      updatedAt: new Date("2026-10-22T10:30:00.000Z"),
    },
  ];

  for (const a of seedActions) {
    const ticketId = ticketMap[a.ticketNumber];
    const performedById = userMap[a.performedByEmail];

    await client.actionTaken.upsert({
      where: { id: a.id },
      update: {
        ticketId,
        performedById,
        actionDateTime: a.actionDateTime,
        description: a.description,
        result: a.result,
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        updatedAt: a.updatedAt,
      },
      create: {
        id: a.id,
        ticketId,
        performedById,
        actionDateTime: a.actionDateTime,
        description: a.description,
        result: a.result,
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
    });
    console.log(`Upserted ActionTaken: ${a.id} on ticket ${a.ticketNumber}`);
  }

  console.log("Seeding finished successfully.");
}

// When invoked directly from CLI
if (
  process.argv[1]?.endsWith("seed.ts") ||
  process.argv[1]?.endsWith("seed.js")
) {
  seed()
    .catch((e) => {
      console.error("Error during seeding:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}