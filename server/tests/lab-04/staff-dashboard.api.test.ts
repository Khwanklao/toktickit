import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";
import { Role, TicketStatus, Priority } from "@prisma/client";

// Safety check
const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl.includes("toktickit_test")) {
  throw new Error(`Safety check failed: DATABASE_URL must point to toktickit_test, got: ${dbUrl}`);
}

describe("Staff Dashboard & Queue Query API Integration Tests (API-15, API-18, API-19, API-30, API-31)", () => {
  const prisma = getPrisma();

  let reqCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  let reqUser: any;
  let staffUser: any;
  let otherStaffUser: any;
  let adminUser: any;

  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    reqUser = await prisma.user.upsert({
      where: { email: "req.staffdash@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-staffdash",
        name: "StaffDash Requester",
        email: "req.staffdash@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "staff.dashmain@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-dashmain",
        name: "Main Dash Staff",
        email: "staff.dashmain@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    otherStaffUser = await prisma.user.upsert({
      where: { email: "staff.dashother@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-dashother",
        name: "Other Dash Staff",
        email: "staff.dashother@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.staffdash@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        id: "u-admin-staffdash",
        name: "StaffDash Admin",
        email: "admin.staffdash@toktickit.local",
        passwordHash: hash,
        role: Role.ADMINISTRATOR,
        isActive: true,
      },
    });

    category = await prisma.category.upsert({
      where: { name: "Network" },
      update: { isActive: true },
      create: { name: "Network", isActive: true },
    });

    relatedSystem = await prisma.relatedSystem.upsert({
      where: { name: "VPN" },
      update: { isActive: true },
      create: { name: "VPN", isActive: true },
    });

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.staffdash@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.dashmain@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.staffdash@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];

    // Create tickets assigned to staffUser and otherStaffUser
    // 1 NEW (unassigned)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-1`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "New Ticket unassigned",
        description: "Test description",
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.NEW,
        ownerId: null,
      },
    });

    // 1 OPEN (assigned to staffUser)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-2`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Open Ticket assigned to staffUser",
        description: "Test description",
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        status: TicketStatus.OPEN,
        ownerId: staffUser.id,
      },
    });

    // 1 REOPENED (assigned to staffUser)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-3`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Reopened Ticket assigned to staffUser",
        description: "Test description",
        requestedPriority: Priority.HIGH,
        itPriority: Priority.HIGH,
        status: TicketStatus.REOPENED,
        ownerId: staffUser.id,
      },
    });

    // 1 IN_PROGRESS (assigned to otherStaffUser)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-4`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "In progress ticket other staff",
        description: "Test description",
        requestedPriority: Priority.HIGH,
        itPriority: Priority.URGENT,
        status: TicketStatus.IN_PROGRESS,
        ownerId: otherStaffUser.id,
      },
    });

    // 1 WAITING_FOR_REQUESTER (assigned to staffUser)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-5`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Waiting for requester staffUser",
        description: "Test description",
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.WAITING_FOR_REQUESTER,
        ownerId: staffUser.id,
      },
    });

    // 1 CLOSED (assigned to staffUser)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-${Date.now()}-6`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Closed ticket staffUser",
        description: "Test description",
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.CLOSED,
        ownerId: staffUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: { requesterId: reqUser.id },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: [reqUser.id, staffUser.id, otherStaffUser.id, adminUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [reqUser.id, staffUser.id, otherStaffUser.id, adminUser.id] } },
    });
  });

  describe("API-15: IT Staff Dashboard Endpoint (GET /api/staff/dashboard)", () => {
    it("returns 200 OK with accurate metrics and recentQueueUpdates for Staff and Admin", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();

      // Check metric fields presence and non-negative
      expect(typeof res.body.metrics.newTickets).toBe("number");
      expect(typeof res.body.metrics.openTickets).toBe("number");
      expect(typeof res.body.metrics.inProgressTickets).toBe("number");
      expect(typeof res.body.metrics.waitingRequesterTickets).toBe("number");
      expect(typeof res.body.metrics.myAssignedTickets).toBe("number");

      // Verify recentQueueUpdates
      expect(Array.isArray(res.body.recentQueueUpdates)).toBe(true);
      expect(res.body.recentQueueUpdates.length).toBeLessThanOrEqual(5);

      for (const item of res.body.recentQueueUpdates) {
        expect(item.id).toBeDefined();
        expect(item.ticketNumber).toBeDefined();
        expect(item.summary).toBeDefined();
        expect(item.status).toBeDefined();
        expect(item.itPriority).toBeDefined();
        expect(item.updatedAt).toBeDefined();
        // owner may be object or null
        if (item.owner) {
          expect(item.owner.id).toBeDefined();
          expect(item.owner.name).toBeDefined();
        }
      }

      // Check Admin can also view staff dashboard
      const adminRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", adminCookie);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.metrics).toBeDefined();
    });

    it("rejects Requester access with 403 FORBIDDEN and unauthenticated with 401 UNAUTHORIZED", async () => {
      const unauthRes = await request(app).get("/api/staff/dashboard");
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe("UNAUTHORIZED");

      const reqRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", reqCookie);
      expect(reqRes.status).toBe(403);
      expect(reqRes.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("API-19: Comparison of Staff Dashboard Numbers with Direct Prisma Queries", () => {
    it("dashboard metrics match exact counts from direct Prisma count queries", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", staffCookie);

      const dbNew = await prisma.ticket.count({
        where: { status: TicketStatus.NEW },
      });
      const dbOpen = await prisma.ticket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.REOPENED] } },
      });
      const dbInProgress = await prisma.ticket.count({
        where: { status: TicketStatus.IN_PROGRESS },
      });
      const dbWaiting = await prisma.ticket.count({
        where: { status: TicketStatus.WAITING_FOR_REQUESTER },
      });
      const dbMyAssigned = await prisma.ticket.count({
        where: {
          ownerId: staffUser.id,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      });

      expect(res.body.metrics.newTickets).toBe(dbNew);
      expect(res.body.metrics.openTickets).toBe(dbOpen);
      expect(res.body.metrics.inProgressTickets).toBe(dbInProgress);
      expect(res.body.metrics.waitingRequesterTickets).toBe(dbWaiting);
      expect(res.body.metrics.myAssignedTickets).toBe(dbMyAssigned);
    });
  });

  describe("API-30: GET /api/staff/queue Query Filters and Drill-Down", () => {
    it("filters queue by group=open (matching status IN (OPEN, REOPENED))", async () => {
      const res = await request(app)
        .get("/api/staff/queue?group=open")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data;
      expect(tickets.length).toBeGreaterThanOrEqual(2);
      for (const t of tickets) {
        expect(["OPEN", "REOPENED"]).toContain(t.status);
      }
    });

    it("filters queue by ownerId=me (resolving to caller's own ID)", async () => {
      const res = await request(app)
        .get("/api/staff/queue?ownerId=me")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data;
      for (const t of tickets) {
        expect(t.owner?.id || t.ownerId).toBe(staffUser.id);
      }
    });

    it("filters queue by activeOnly=true (excluding CLOSED and CANCELLED)", async () => {
      const res = await request(app)
        .get("/api/staff/queue?activeOnly=true")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data;
      for (const t of tickets) {
        expect(["CLOSED", "CANCELLED"]).not.toContain(t.status);
      }
    });

    it("combines ownerId=me and activeOnly=true for My Assigned drill-down", async () => {
      const res = await request(app)
        .get("/api/staff/queue?ownerId=me&activeOnly=true")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data;
      for (const t of tickets) {
        expect(t.owner?.id || t.ownerId).toBe(staffUser.id);
        expect(["CLOSED", "CANCELLED"]).not.toContain(t.status);
      }
    });

    it("returns 400 VALIDATION_ERROR on invalid group, invalid activeOnly, or both group and status", async () => {
      // Invalid group
      const res1 = await request(app)
        .get("/api/staff/queue?group=all")
        .set("Cookie", staffCookie);
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe("VALIDATION_ERROR");

      // Invalid activeOnly
      const res2 = await request(app)
        .get("/api/staff/queue?activeOnly=false")
        .set("Cookie", staffCookie);
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe("VALIDATION_ERROR");

      // Both group and status
      const res3 = await request(app)
        .get("/api/staff/queue?group=open&status=OPEN")
        .set("Cookie", staffCookie);
      expect(res3.status).toBe(400);
      expect(res3.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("API-31: Backward Compatibility of GET /api/staff/queue", () => {
    it("preserves Lab 3 default behavior and pagination when new params are omitted", async () => {
      const res = await request(app)
        .get("/api/staff/queue")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });
  });
});
