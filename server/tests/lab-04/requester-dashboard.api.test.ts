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

describe("Requester Dashboard & Query API Integration Tests (API-14, API-17, API-19, API-30, API-31)", () => {
  const prisma = getPrisma();

  let reqCookie: string;
  let emptyReqCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  let reqUser: any;
  let emptyReqUser: any;
  let staffUser: any;
  let adminUser: any;

  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    reqUser = await prisma.user.upsert({
      where: { email: "req.dash.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-dash-test",
        name: "Dashboard Requester",
        email: "req.dash.test@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    emptyReqUser = await prisma.user.upsert({
      where: { email: "req.dash.empty@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-dash-empty",
        name: "Empty Dashboard Requester",
        email: "req.dash.empty@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "staff.dash.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-dash-test",
        name: "Dashboard Staff",
        email: "staff.dash.test@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.dash.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        id: "u-admin-dash-test",
        name: "Dashboard Admin",
        email: "admin.dash.test@toktickit.local",
        passwordHash: hash,
        role: Role.ADMINISTRATOR,
        isActive: true,
      },
    });

    category = await prisma.category.upsert({
      where: { name: "Software" },
      update: { isActive: true },
      create: { name: "Software", isActive: true },
    });

    relatedSystem = await prisma.relatedSystem.upsert({
      where: { name: "Email" },
      update: { isActive: true },
      create: { name: "Email", isActive: true },
    });

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.dash.test@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const emptyReqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.dash.empty@toktickit.local", password: "Password123!" });
    emptyReqCookie = emptyReqLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.dash.test@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.dash.test@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];

    // Seed specific tickets for reqUser
    // 1 NEW, 1 OPEN, 2 IN_PROGRESS, 1 WAITING_FOR_REQUESTER, 1 RESOLVED, 1 CLOSED, 1 CANCELLED
    const statuses: TicketStatus[] = [
      TicketStatus.NEW,
      TicketStatus.OPEN,
      TicketStatus.IN_PROGRESS,
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
      TicketStatus.CANCELLED,
    ];

    for (let i = 0; i < statuses.length; i++) {
      const createdTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-REQ-DASH-${Date.now()}-${i}`,
          requesterId: reqUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: `Requester dash ticket ${i} - ${statuses[i]}`,
          description: "Detailed test description",
          requestedPriority: Priority.MEDIUM,
          itPriority: Priority.MEDIUM,
          status: statuses[i],
          updatedAt: new Date(Date.now() - (10 - i) * 60000), // staggered timestamps
        },
      });

      if (statuses[i] === TicketStatus.RESOLVED || statuses[i] === TicketStatus.CLOSED) {
        await prisma.actionTaken.create({
          data: {
            ticketId: createdTicket.id,
            performedById: staffUser.id,
            description: "Resolution action taken",
            result: "Resolved successfully",
            actionDateTime: new Date(),
          },
        });
      }
    }
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: { requesterId: { in: [reqUser.id, emptyReqUser.id] } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: [reqUser.id, emptyReqUser.id, staffUser.id, adminUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [reqUser.id, emptyReqUser.id, staffUser.id, adminUser.id] } },
    });
  });

  describe("API-14: Requester Dashboard Endpoint (GET /api/requester/dashboard)", () => {
    it("returns 200 OK with accurate metrics and recentRequests for authenticated Requester", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();

      // activeTickets: NEW(1) + OPEN(1) + IN_PROGRESS(2) + WAITING_FOR_REQUESTER(1) = 5
      expect(res.body.metrics.activeTickets).toBe(5);
      expect(res.body.metrics.inProgressTickets).toBe(2);
      expect(res.body.metrics.resolvedTickets).toBe(1);
      expect(res.body.metrics.closedTickets).toBe(1);

      // recentRequests: up to 5, ordered by updatedAt DESC
      expect(res.body.recentRequests).toBeDefined();
      expect(res.body.recentRequests.length).toBe(5);

      // Verify fields on each recent request
      for (const item of res.body.recentRequests) {
        expect(item.id).toBeDefined();
        expect(item.ticketNumber).toBeDefined();
        expect(item.summary).toBeDefined();
        expect(item.status).toBeDefined();
        expect(typeof item.needsAttention).toBe("boolean");
        expect(item.updatedAt).toBeDefined();

        if (item.status === "WAITING_FOR_REQUESTER") {
          expect(item.needsAttention).toBe(true);
        } else {
          expect(item.needsAttention).toBe(false);
        }
      }
    });

    it("rejects non-Requester access with 403 FORBIDDEN and unauthenticated with 401 UNAUTHORIZED", async () => {
      // Unauthenticated
      const unauthRes = await request(app).get("/api/requester/dashboard");
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe("UNAUTHORIZED");

      // IT Staff
      const staffRes = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", staffCookie);
      expect(staffRes.status).toBe(403);
      expect(staffRes.body.error.code).toBe("FORBIDDEN");

      // Admin
      const adminRes = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", adminCookie);
      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("API-17: Dashboard Zero-State Rendering", () => {
    it("returns zero metrics and empty recentRequests for a requester with no tickets", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", emptyReqCookie);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        activeTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
      });
      expect(res.body.recentRequests).toEqual([]);
    });
  });

  describe("API-19: Comparison of Dashboard Metrics with Direct Prisma Queries", () => {
    it("matches exact counts computed by direct database count queries", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", reqCookie);

      const dbActive = await prisma.ticket.count({
        where: {
          requesterId: reqUser.id,
          status: { in: [TicketStatus.NEW, TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED] },
        },
      });

      const dbInProgress = await prisma.ticket.count({
        where: {
          requesterId: reqUser.id,
          status: TicketStatus.IN_PROGRESS,
        },
      });

      const dbResolved = await prisma.ticket.count({
        where: {
          requesterId: reqUser.id,
          status: TicketStatus.RESOLVED,
        },
      });

      const dbClosed = await prisma.ticket.count({
        where: {
          requesterId: reqUser.id,
          status: TicketStatus.CLOSED,
        },
      });

      expect(res.body.metrics.activeTickets).toBe(dbActive);
      expect(res.body.metrics.inProgressTickets).toBe(dbInProgress);
      expect(res.body.metrics.resolvedTickets).toBe(dbResolved);
      expect(res.body.metrics.closedTickets).toBe(dbClosed);
    });
  });

  describe("API-30: GET /api/tickets Query Filters and Drill-Down", () => {
    it("filters tickets by status parameter", async () => {
      const res = await request(app)
        .get("/api/tickets?status=IN_PROGRESS")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data || res.body.tickets || res.body;
      expect(tickets.length).toBe(2);
      for (const t of tickets) {
        expect(t.status).toBe("IN_PROGRESS");
        expect(t.updatedAt).toBeDefined();
      }
    });

    it("filters tickets by group=open parameter (returns NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER)", async () => {
      const res = await request(app)
        .get("/api/tickets?group=open")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data || res.body.tickets || res.body;
      expect(tickets.length).toBe(5);
      const openStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
      for (const t of tickets) {
        expect(openStatuses).toContain(t.status);
        expect(t.updatedAt).toBeDefined();
      }
    });

    it("returns 400 VALIDATION_ERROR when group is not 'open'", async () => {
      const res = await request(app)
        .get("/api/tickets?group=closed")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when both group and status are supplied simultaneously", async () => {
      const res = await request(app)
        .get("/api/tickets?group=open&status=IN_PROGRESS")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when status is an invalid enum value", async () => {
      const res = await request(app)
        .get("/api/tickets?status=NON_EXISTENT_STATUS")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("API-31: Backward Compatibility of GET /api/tickets", () => {
    it("returns full paginated list unchanged when new query params are omitted", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", reqCookie);

      expect(res.status).toBe(200);
      const tickets = res.body.data || res.body.tickets || res.body;
      expect(tickets.length).toBe(8); // all 8 tickets of reqUser
    });
  });
});

