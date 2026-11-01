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

describe("Sprint 4 Authorization & Server-Side RBAC Matrix (AUTH-01..AUTH-04)", () => {
  const prisma = getPrisma();

  let reqCookie: string;
  let otherReqCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  let reqUser: any;
  let otherReqUser: any;
  let staffUser: any;
  let adminUser: any;

  let category: any;
  let relatedSystem: any;
  let ticket: any;
  let otherTicket: any;
  let action: any;

  beforeAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    reqUser = await prisma.user.upsert({
      where: { email: "req.authmatrix@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-authmatrix",
        name: "AuthMatrix Requester",
        email: "req.authmatrix@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    otherReqUser = await prisma.user.upsert({
      where: { email: "req.otherauth@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-otherauth",
        name: "Other Auth Requester",
        email: "req.otherauth@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "staff.authmatrix@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-authmatrix",
        name: "AuthMatrix Staff",
        email: "staff.authmatrix@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.authmatrix@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        id: "u-admin-authmatrix",
        name: "AuthMatrix Admin",
        email: "admin.authmatrix@toktickit.local",
        passwordHash: hash,
        role: Role.ADMINISTRATOR,
        isActive: true,
      },
    });

    category = await prisma.category.upsert({
      where: { name: "Hardware" },
      update: { isActive: true },
      create: { name: "Hardware", isActive: true },
    });

    relatedSystem = await prisma.relatedSystem.upsert({
      where: { name: "Printer" },
      update: { isActive: true },
      create: { name: "Printer", isActive: true },
    });

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.authmatrix@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const otherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.otherauth@toktickit.local", password: "Password123!" });
    otherReqCookie = otherLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.authmatrix@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.authmatrix@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];

    ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTH-${Date.now()}-1`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Auth Ticket 1",
        description: "Test description",
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        ownerId: staffUser.id,
      },
    });

    otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTH-${Date.now()}-2`,
        requesterId: otherReqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Auth Ticket 2",
        description: "Test description",
        requestedPriority: Priority.LOW,
        itPriority: Priority.LOW,
        status: TicketStatus.OPEN,
        ownerId: staffUser.id,
      },
    });

    action = await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        performedById: staffUser.id,
        description: "Initial action by staff for auth tests.",
        result: "Verified.",
      },
    });
  });

  afterAll(async () => {
    await prisma.actionTaken.deleteMany({
      where: { ticketId: { in: [ticket?.id, otherTicket?.id] } },
    });
    await prisma.ticket.deleteMany({
      where: { id: { in: [ticket?.id, otherTicket?.id] } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: [reqUser.id, otherReqUser.id, staffUser.id, adminUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [reqUser.id, otherReqUser.id, staffUser.id, adminUser.id] } },
    });
  });

  describe("AUTH-01: Requester Role Boundaries", () => {
    it("denies Requester from writing or modifying actions (403 FORBIDDEN)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", reqCookie)
        .send({
          description: "Illegal action write attempt.",
          result: "Should fail.",
          followUpRequired: false,
        });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe("FORBIDDEN");

      const patchRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", reqCookie)
        .send({
          description: "Illegal action edit attempt.",
        });
      expect(patchRes.status).toBe(403);
      expect(patchRes.body.error.code).toBe("FORBIDDEN");
    });

    it("denies Requester from staff operations and queues (403 FORBIDDEN)", async () => {
      // Status
      const statusRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", reqCookie)
        .send({ status: "RESOLVED" });
      expect(statusRes.status).toBe(403);
      expect(statusRes.body.error.code).toBe("FORBIDDEN");

      // Assign
      const assignRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", reqCookie)
        .send({ ownerId: staffUser.id });
      expect(assignRes.status).toBe(403);
      expect(assignRes.body.error.code).toBe("FORBIDDEN");

      // Priority
      const priorityRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", reqCookie)
        .send({ itPriority: "URGENT" });
      expect(priorityRes.status).toBe(403);
      expect(priorityRes.body.error.code).toBe("FORBIDDEN");

      // Queue
      const queueRes = await request(app)
        .get("/api/staff/queue")
        .set("Cookie", reqCookie);
      expect(queueRes.status).toBe(403);
      expect(queueRes.body.error.code).toBe("FORBIDDEN");

      // Staff Dashboard
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", reqCookie);
      expect(dashRes.status).toBe(403);
      expect(dashRes.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 404 NOT_FOUND when Requester accesses actions or resolve-indication on another user's ticket", async () => {
      // Actions on other ticket
      const actionsRes = await request(app)
        .get(`/api/tickets/${otherTicket.id}/actions`)
        .set("Cookie", reqCookie);
      expect(actionsRes.status).toBe(404);
      expect(actionsRes.body.error.code).toBe("NOT_FOUND");

      // Resolve indication on other ticket
      const resolveRes = await request(app)
        .patch(`/api/tickets/${otherTicket.id}/resolve-indication`)
        .set("Cookie", reqCookie)
        .send({});
      expect(resolveRes.status).toBe(404);
      expect(resolveRes.body.error.code).toBe("NOT_FOUND");
    });

    it("allows Requester to view own actions, own ticket, and own dashboard", async () => {
      const actionsRes = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", reqCookie);
      expect(actionsRes.status).toBe(200);

      const dashRes = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", reqCookie);
      expect(dashRes.status).toBe(200);
    });
  });

  describe("AUTH-02: IT Staff Role Permissions", () => {
    it("allows IT Staff full operational access to actions, ticket status, assign, priority, queue, and staff dashboard", async () => {
      // Action write
      const actionRes = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Staff action creation authorized.",
          result: "Staff operation confirmed.",
          followUpRequired: false,
        });
      expect(actionRes.status).toBe(201);

      // Staff queue
      const queueRes = await request(app)
        .get("/api/staff/queue")
        .set("Cookie", staffCookie);
      expect(queueRes.status).toBe(200);

      // Staff dashboard
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", staffCookie);
      expect(dashRes.status).toBe(200);

      // Priority
      const priorityRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", staffCookie)
        .send({ itPriority: "HIGH" });
      expect(priorityRes.status).toBe(200);
    });

    it("denies IT Staff from accessing Requester Dashboard (403 FORBIDDEN)", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", staffCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("AUTH-03: Administrator Operational Boundary (BR-09)", () => {
    it("allows Administrator to create, update, and view Actions Taken, queue, and staff dashboard", async () => {
      const actionRes = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", adminCookie)
        .send({
          description: "Admin intervention on server hardware.",
          result: "Hardware operational.",
          followUpRequired: false,
        });
      expect(actionRes.status).toBe(201);

      const queueRes = await request(app)
        .get("/api/staff/queue")
        .set("Cookie", adminCookie);
      expect(queueRes.status).toBe(200);

      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", adminCookie);
      expect(dashRes.status).toBe(200);
    });

    it("strictly forbids Administrator from modifying status, assign, or priority (403 FORBIDDEN)", async () => {
      const statusRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "RESOLVED" });
      expect(statusRes.status).toBe(403);
      expect(statusRes.body.error.code).toBe("FORBIDDEN");

      const assignRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", adminCookie)
        .send({ ownerId: staffUser.id });
      expect(assignRes.status).toBe(403);
      expect(assignRes.body.error.code).toBe("FORBIDDEN");

      const priorityRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", adminCookie)
        .send({ itPriority: "LOW" });
      expect(priorityRes.status).toBe(403);
      expect(priorityRes.body.error.code).toBe("FORBIDDEN");

      const reqDashRes = await request(app)
        .get("/api/requester/dashboard")
        .set("Cookie", adminCookie);
      expect(reqDashRes.status).toBe(403);
      expect(reqDashRes.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("AUTH-04: Unauthenticated Requests (401 UNAUTHORIZED)", () => {
    it("rejects unauthenticated requests with 401 UNAUTHORIZED across all protected endpoints", async () => {
      const endpoints = [
        { method: "get", path: `/api/tickets/${ticket.id}/actions` },
        { method: "post", path: `/api/tickets/${ticket.id}/actions`, body: { description: "x", result: "y" } },
        { method: "patch", path: `/api/tickets/${ticket.id}/actions/${action.id}`, body: { description: "x" } },
        { method: "patch", path: `/api/staff/tickets/${ticket.id}/status`, body: { status: "RESOLVED" } },
        { method: "patch", path: `/api/staff/tickets/${ticket.id}/assign`, body: { ownerId: staffUser.id } },
        { method: "patch", path: `/api/staff/tickets/${ticket.id}/priority`, body: { itPriority: "HIGH" } },
        { method: "get", path: "/api/staff/queue" },
        { method: "get", path: "/api/staff/dashboard" },
        { method: "get", path: "/api/requester/dashboard" },
        { method: "patch", path: `/api/tickets/${ticket.id}/resolve-indication`, body: {} },
      ];

      for (const ep of endpoints) {
        const reqBuilder = (request(app) as any)[ep.method](ep.path);
        if (ep.body) {
          reqBuilder.send(ep.body);
        }
        const res = await reqBuilder;
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      }
    });
  });
});

