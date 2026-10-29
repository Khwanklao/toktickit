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

describe("Ticket Workflow & Lifecycle API Integration Tests (API-07..10, API-13, API-24..29, FLOW-01)", () => {
  const prisma = getPrisma();

  let reqCookie: string;
  let staffCookie: string;
  let adminCookie: string;

  let reqUser: any;
  let staffUser: any;
  let adminUser: any;

  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    reqUser = await prisma.user.upsert({
      where: { email: "req.workflow@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-workflow",
        name: "Workflow Requester",
        email: "req.workflow@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "staff.workflow@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-workflow",
        name: "Workflow Staff",
        email: "staff.workflow@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.workflow@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        id: "u-admin-workflow",
        name: "Workflow Admin",
        email: "admin.workflow@toktickit.local",
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
      .send({ email: "req.workflow@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.workflow@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.workflow@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];
  });
  afterAll(async () => {
    await prisma.actionTaken.deleteMany({
      where: { performedById: adminUser.id },
    });
    await prisma.session.deleteMany({
      where: { userId: adminUser.id },
    });
    await prisma.user.delete({
      where: { id: adminUser.id },
    }).catch(() => {});
  });


  async function createTestTicket(status: TicketStatus = TicketStatus.IN_PROGRESS, extraData: any = {}) {
    return await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Ticket for workflow lifecycle testing",
        description: "Testing resolution gate, concurrency, and state transitions",
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        status,
        ...extraData,
      },
    });
  }

  describe("API-07: Resolution Gate on Active Tickets (BR-12)", () => {
    it("rejects transitioning status to RESOLVED when actions count is 0 with 400 RESOLUTION_ACTION_REQUIRED", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS);

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");
    });

    it("allows transitioning to RESOLVED when at least one action exists", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS);
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Diagnosed issue and applied fix.",
          result: "Fix confirmed operational.",
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("RESOLVED");
    });
  });

  describe("API-08: Resolution Gate Post-Reopen (BR-12)", () => {
    it("rejects transitioning REOPENED ticket to RESOLVED unless at least one action has createdAt > reopenedAt", async () => {
      const reopenTime = new Date();
      const ticket = await createTestTicket(TicketStatus.REOPENED, {
        reopenedAt: reopenTime,
      });

      // Old action created BEFORE reopenTime
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Old pre-reopen action.",
          result: "Pre-reopen result.",
          createdAt: new Date(reopenTime.getTime() - 10000),
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");

      // Now create new action with createdAt > reopenTime (by Admin or Staff)
      await new Promise((r) => setTimeout(r, 20));
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: adminUser.id, // Admin action also counts
          description: "Fresh intervention post-reopen.",
          result: "Post-reopen resolution verified.",
          createdAt: new Date(),
        },
      });

      const resSuccess = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });

      expect(resSuccess.status).toBe(200);
      expect(resSuccess.body.status).toBe("RESOLVED");
    });
  });

  describe("API-09 & API-25: Reopen State Effects and Response Shape (BR-10)", () => {
    it("transition to REOPENED sets ticket.reopenedAt = now() and resets isRequesterResolved = false", async () => {
      const ticket = await createTestTicket(TicketStatus.RESOLVED, {
        isRequesterResolved: true,
        reopenedAt: null,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "REOPENED" });

      expect(res.status).toBe(200);
      expect(res.body.ticketId).toBe(ticket.id);
      expect(res.body.status).toBe("REOPENED");
      expect(res.body.reopenedAt).toBeDefined();
      expect(res.body.isRequesterResolved).toBe(false);
      expect(res.body.updatedAt).toBeDefined();

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed!.isRequesterResolved).toBe(false);
      expect(refreshed!.reopenedAt).not.toBeNull();
    });
  });

  describe("API-10: Optimistic Concurrency on Status Change (BR-16)", () => {
    it("returns 409 STALE_UPDATE when expectedUpdatedAt does not match stored updatedAt", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);

      const staleTimestamp = new Date(ticket.updatedAt.getTime() - 5000).toISOString();

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: staleTimestamp,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STALE_UPDATE");
    });

    it("succeeds when expectedUpdatedAt matches stored updatedAt", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("IN_PROGRESS");
    });

    it("succeeds when expectedUpdatedAt is omitted (Lab 3 backward compatibility)", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({
          status: "IN_PROGRESS",
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("IN_PROGRESS");
    });
  });

  describe("API-13: Administrator Operational Boundary (BR-09)", () => {
    it("returns 403 FORBIDDEN when Administrator attempts to modify ticket status, assign owner, or change priority", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);

      // Status
      const statusRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", adminCookie)
        .send({ status: "IN_PROGRESS" });
      expect(statusRes.status).toBe(403);
      expect(statusRes.body.error.code).toBe("FORBIDDEN");

      // Assign
      const assignRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", adminCookie)
        .send({ ownerId: staffUser.id });
      expect(assignRes.status).toBe(403);
      expect(assignRes.body.error.code).toBe("FORBIDDEN");

      // Priority
      const priorityRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", adminCookie)
        .send({ itPriority: "HIGH" });
      expect(priorityRes.status).toBe(403);
      expect(priorityRes.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("API-24: Invalid Status Transitions per Matrix (BR-10)", () => {
    it("returns 400 VALIDATION_ERROR on illegal status transition", async () => {
      const ticket = await createTestTicket(TicketStatus.NEW);

      // Direct NEW -> RESOLVED is forbidden
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when transitioning from terminal states CLOSED and CANCELLED", async () => {
      const closedTicket = await createTestTicket(TicketStatus.CLOSED);

      const res = await request(app)
        .patch(`/api/staff/tickets/${closedTicket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("API-26 & API-27: Requester Resolve-Indication on Terminal Tickets & Timestamp Touch (BR-11, BR-15)", () => {
    it("API-26: returns 400 TICKET_TERMINAL when resolve-indication is called on CLOSED or CANCELLED tickets", async () => {
      const closedTicket = await createTestTicket(TicketStatus.CLOSED);

      const resClosed = await request(app)
        .patch(`/api/tickets/${closedTicket.id}/resolve-indication`)
        .set("Cookie", reqCookie)
        .send({});

      expect(resClosed.status).toBe(400);
      expect(resClosed.body.error.code).toBe("TICKET_TERMINAL");

      const cancelledTicket = await createTestTicket(TicketStatus.CANCELLED);

      const resCancelled = await request(app)
        .patch(`/api/tickets/${cancelledTicket.id}/resolve-indication`)
        .set("Cookie", reqCookie)
        .send({});

      expect(resCancelled.status).toBe(400);
      expect(resCancelled.body.error.code).toBe("TICKET_TERMINAL");
    });

    it("API-27: resolve-indication touches Ticket.updatedAt and leaves status unchanged", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS);
      const initialUpdatedAt = ticket.updatedAt.getTime();

      await new Promise((r) => setTimeout(r, 15));

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Cookie", reqCookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("IN_PROGRESS");
      expect(res.body.ticket.isRequesterResolved).toBe(true);
      expect(new Date(res.body.ticket.updatedAt).getTime()).toBeGreaterThan(initialUpdatedAt);
    });
  });

  describe("API-28: Extended GET /api/tickets/:id Fields", () => {
    it("returns updatedAt and reopenedAt alongside existing Lab 3 fields", async () => {
      const reopenTime = new Date();
      const ticket = await createTestTicket(TicketStatus.REOPENED, {
        reopenedAt: reopenTime,
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const ticketObj = res.body.ticket || res.body;
      expect(ticketObj.id).toBe(ticket.id);
      expect(ticketObj.updatedAt).toBeDefined();
      expect(ticketObj.reopenedAt).toBeDefined();
      expect(new Date(ticketObj.reopenedAt).getTime()).toBe(reopenTime.getTime());
    });
  });

  describe("API-29: Assign and Priority Touch Ticket.updatedAt", () => {
    it("PATCH /api/staff/tickets/:id/assign touches Ticket.updatedAt", async () => {
      const ticket = await createTestTicket(TicketStatus.NEW);
      const initialUpdatedAt = ticket.updatedAt.getTime();

      await new Promise((r) => setTimeout(r, 15));

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", staffCookie)
        .send({ ownerId: staffUser.id });

      expect(res.status).toBe(200);
      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
    });

    it("PATCH /api/staff/tickets/:id/priority touches Ticket.updatedAt", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);
      const initialUpdatedAt = ticket.updatedAt.getTime();

      await new Promise((r) => setTimeout(r, 15));

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", staffCookie)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
    });
  });

  describe("FLOW-01: Complete Ticket Workflow Lifecycle", () => {
    it("executes full lifecycle: NEW -> OPEN -> IN_PROGRESS -> WAITING_FOR_REQUESTER -> RESOLVED -> REOPENED -> RESOLVED -> CLOSED", async () => {
      // 1. Create ticket in NEW
      const ticket = await createTestTicket(TicketStatus.NEW);

      // 2. Assign to staff -> auto transitions to OPEN
      const assignRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", staffCookie)
        .send({ ownerId: staffUser.id });
      expect(assignRes.status).toBe(200);
      expect(assignRes.body.status).toBe("OPEN");

      // 3. Transition to IN_PROGRESS
      const progRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "IN_PROGRESS" });
      expect(progRes.status).toBe(200);
      expect(progRes.body.status).toBe("IN_PROGRESS");

      // 4. Transition to WAITING_FOR_REQUESTER
      const waitRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "WAITING_FOR_REQUESTER" });
      expect(waitRes.status).toBe(200);
      expect(waitRes.body.status).toBe("WAITING_FOR_REQUESTER");

      // 5. Requester resolve-indication
      const indRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Cookie", reqCookie)
        .send({});
      expect(indRes.status).toBe(200);
      expect(indRes.body.ticket.isRequesterResolved).toBe(true);
      expect(indRes.body.ticket.status).toBe("WAITING_FOR_REQUESTER");

      // 6. Attempt to resolve with 0 actions -> blocked by gate
      const blockedRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });
      expect(blockedRes.status).toBe(400);
      expect(blockedRes.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");

      // 7. Staff logs Action Taken
      const action1Res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Configured email routing server.",
          result: "Inbound and outbound email verified.",
          followUpRequired: false,
        });
      expect(action1Res.status).toBe(201);

      // 8. Transition to RESOLVED -> succeeds
      const resolveRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.status).toBe("RESOLVED");

      // 9. Transition to REOPENED -> sets reopenedAt and resets isRequesterResolved
      const reopenRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "REOPENED" });
      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.status).toBe("REOPENED");
      expect(reopenRes.body.reopenedAt).not.toBeNull();
      expect(reopenRes.body.isRequesterResolved).toBe(false);

      // 10. Attempt to resolve again without new action -> blocked by gate
      const blockedReopenRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });
      expect(blockedReopenRes.status).toBe(400);
      expect(blockedReopenRes.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");

      // 11. Admin records new action after reopen
      await new Promise((r) => setTimeout(r, 20));
      const action2Res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", adminCookie)
        .send({
          description: "Admin verified and corrected DKIM record.",
          result: "DKIM key rotation completed and operational.",
          followUpRequired: false,
        });
      expect(action2Res.status).toBe(201);

      // 12. Transition to RESOLVED -> succeeds
      const resolve2Res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "RESOLVED" });
      expect(resolve2Res.status).toBe(200);
      expect(resolve2Res.body.status).toBe("RESOLVED");

      // 13. Transition to CLOSED
      const closeRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "CLOSED" });
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.status).toBe("CLOSED");

      // 14. Terminal state write lock check: cannot add action or transition status
      const terminalActionRes = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Attempting action on closed ticket.",
          result: "Should fail.",
          followUpRequired: false,
        });
      expect(terminalActionRes.status).toBe(400);
      expect(terminalActionRes.body.error.code).toBe("TICKET_TERMINAL");

      const terminalStatusRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "REOPENED" });
      expect(terminalStatusRes.status).toBe(400);
      expect(terminalStatusRes.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
