import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";
import { Role, TicketStatus, Priority } from "@prisma/client";

// Safety Assertion
const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl.includes("toktickit_test")) {
  throw new Error(`Safety check failed: DATABASE_URL must point to toktickit_test, got: ${dbUrl}`);
}

describe("Actions Taken API Integration Tests (API-01..06, API-11, API-12, API-16, API-20..23)", () => {
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

  beforeAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    // Upsert test users
    reqUser = await prisma.user.upsert({
      where: { email: "req.action.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-action-test",
        name: "Action Requester",
        email: "req.action.test@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    otherReqUser = await prisma.user.upsert({
      where: { email: "req.action.other@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.REQUESTER },
      create: {
        id: "u-req-action-other",
        name: "Other Requester",
        email: "req.action.other@toktickit.local",
        passwordHash: hash,
        role: Role.REQUESTER,
        isActive: true,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "staff.action.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.IT_STAFF },
      create: {
        id: "u-staff-action-test",
        name: "Action Staff",
        email: "staff.action.test@toktickit.local",
        passwordHash: hash,
        role: Role.IT_STAFF,
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.action.test@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: Role.ADMINISTRATOR },
      create: {
        id: "u-admin-action-test",
        name: "Action Admin",
        email: "admin.action.test@toktickit.local",
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
      where: { name: "Corporate Laptop" },
      update: { isActive: true },
      create: { name: "Corporate Laptop", isActive: true },
    });

    // Obtain session cookies
    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.action.test@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const otherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.action.other@toktickit.local", password: "Password123!" });
    otherReqCookie = otherLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.action.test@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.action.test@toktickit.local", password: "Password123!" });
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


  async function createTestTicket(status: TicketStatus = TicketStatus.OPEN, requesterId: string = reqUser.id) {
    return await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        requesterId,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Ticket for Action Taken testing",
        description: "Testing actions taken workflow and boundaries",
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.HIGH,
        status,
      },
    });
  }

  describe("API-01: Create Action Taken (POST /api/tickets/:id/actions)", () => {
    it("creates an Action Taken by Staff, populates performedById from session, touches ticket updatedAt, and returns 201 Created", async () => {
      const ticket = await createTestTicket(TicketStatus.IN_PROGRESS);
      const initialUpdatedAt = ticket.updatedAt.getTime();

      // Wait 10ms to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 15));

      const payload = {
        actionDateTime: new Date().toISOString(),
        description: "Replaced faulty RAM module and ran memory diagnostics.",
        result: "4 passes of MemTest86 completed with 0 errors found.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "See memory_test_report.pdf",
        // Client tries to spoof performedById
        performedById: "spoofed-user-id",
      };

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.action).toBeDefined();
      expect(res.body.action.id).toBeDefined();
      expect(res.body.action.ticketId).toBe(ticket.id);
      expect(res.body.action.description).toBe(payload.description);
      expect(res.body.action.result).toBe(payload.result);
      expect(res.body.action.performedBy).toEqual({
        id: staffUser.id,
        name: staffUser.name,
        role: staffUser.role,
      });
      expect(res.body.action.performedBy.email).toBeUndefined();
      expect(res.body.ticketUpdatedAt).toBeDefined();

      // Verify Ticket.updatedAt was touched
      const refreshedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshedTicket!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
      expect(new Date(res.body.ticketUpdatedAt).getTime()).toBe(refreshedTicket!.updatedAt.getTime());
    });

    it("allows Administrator to create an Action Taken (AC-13)", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", adminCookie)
        .send({
          description: "Admin intervention and remote firmware update applied.",
          result: "Firmware version 2.4 verified.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.action.performedBy).toEqual({
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
      });
    });
  });

  describe("API-02: Action Follow-Up Note & Field Validation", () => {
    it("returns 400 VALIDATION_ERROR when followUpRequired is true but followUpNote is missing or < 5 chars", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Performed diagnostic check on cooling unit.",
          result: "Thermal paste reapplied successfully.",
          followUpRequired: true,
          followUpNote: "bad", // < 5 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "followUpNote" }),
        ])
      );
    });

    it("returns 400 VALIDATION_ERROR when description or result is invalid / whitespace-only", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "   ", // whitespace only
          result: "ok", // < 5 chars
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("API-03: Role Restriction on Action Creation and Update", () => {
    it("rejects Requester attempting to create an Action Taken with 403 FORBIDDEN", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, reqUser.id);

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", reqCookie)
        .send({
          description: "Requester attempt to write an action record.",
          result: "Should be forbidden.",
          followUpRequired: false,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects Requester attempting to update an Action Taken with 403 FORBIDDEN", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, reqUser.id);
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Existing staff diagnostic.",
          result: "Normal status verified.",
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", reqCookie)
        .send({
          description: "Unauthorized edit attempt.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("API-04 & API-20: Actions Taken Retrieval Permissions", () => {
    it("allows owning Requester to retrieve actions on owned ticket (200 OK)", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, reqUser.id);
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Checked motherboard capacitors.",
          result: "All capacitors in good shape.",
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", reqCookie);

      expect(res.status).toBe(200);
      expect(res.body.ticketId).toBe(ticket.id);
      expect(res.body.actions).toHaveLength(1);
      expect(res.body.actions[0].description).toBe("Checked motherboard capacitors.");
    });

    it("returns 404 NOT_FOUND when Requester accesses another user's ticket actions", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, otherReqUser.id);

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", reqCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("API-20: allows Staff and Admin to retrieve actions on any ticket", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN, reqUser.id);

      const staffRes = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie);
      expect(staffRes.status).toBe(200);

      const adminRes = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", adminCookie);
      expect(adminRes.status).toBe(200);
    });
  });

  describe("API-05: Terminal Ticket Write Lock (CLOSED and CANCELLED)", () => {
    it("returns 400 TICKET_TERMINAL when creating action on CLOSED ticket", async () => {
      const ticket = await createTestTicket(TicketStatus.CLOSED);

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Attempted action on closed ticket.",
          result: "Should fail.",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL");
    });

    it("returns 400 TICKET_TERMINAL when updating action on CANCELLED ticket", async () => {
      const ticket = await createTestTicket(TicketStatus.OPEN);
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Initial action before cancellation.",
          result: "Done.",
        },
      });

      // Transition ticket to CANCELLED
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.CANCELLED },
      });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Updating description on cancelled ticket.",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL");
    });
  });

  describe("API-06: Action Datetime Boundaries (BR-05)", () => {
    it("accepts actionDateTime within +60s clock drift tolerance", async () => {
      const ticket = await createTestTicket();
      const futureDate = new Date(Date.now() + 30 * 1000); // +30s

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          actionDateTime: futureDate.toISOString(),
          description: "Action with slight clock drift into future.",
          result: "Accepted under 60s tolerance.",
          followUpRequired: false,
        });

      expect(res.status).toBe(201);
    });

    it("rejects actionDateTime preceding ticket creation with 400 INVALID_ACTION_DATE", async () => {
      const ticket = await createTestTicket();
      const pastDate = new Date(ticket.createdAt.getTime() - 60 * 1000); // 1 min before ticket creation

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          actionDateTime: pastDate.toISOString(),
          description: "Action supposedly done before ticket existed.",
          result: "Should be rejected.",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ACTION_DATE");
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "actionDateTime" }),
        ])
      );
    });

    it("rejects actionDateTime more than 60s in the future with 400 INVALID_ACTION_DATE", async () => {
      const ticket = await createTestTicket();
      const farFutureDate = new Date(Date.now() + 5 * 60 * 1000); // +5 min

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          actionDateTime: farFutureDate.toISOString(),
          description: "Future prediction action.",
          result: "Should be rejected.",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ACTION_DATE");
    });
  });

  describe("API-11: Optimistic Concurrency on Action Update (BR-16)", () => {
    it("returns 409 STALE_UPDATE when expectedUpdatedAt does not match stored action updatedAt", async () => {
      const ticket = await createTestTicket();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Initial action log.",
          result: "Initial test result.",
        },
      });

      const staleTime = new Date(action.updatedAt.getTime() - 10000).toISOString();

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Concurrent edit with stale token.",
          expectedUpdatedAt: staleTime,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STALE_UPDATE");
    });

    it("succeeds when expectedUpdatedAt matches action updatedAt", async () => {
      const ticket = await createTestTicket();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Initial action log.",
          result: "Initial test result.",
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Updated action description with matching token.",
          expectedUpdatedAt: action.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.action.description).toBe("Updated action description with matching token.");
      expect(res.body.ticketUpdatedAt).toBeDefined();
    });
  });

  describe("API-12: Action Operation on Non-Existent Ticket or Action", () => {
    it("returns 404 NOT_FOUND when ticketId does not exist on POST", async () => {
      const res = await request(app)
        .post("/api/tickets/999999/actions")
        .set("Cookie", staffCookie)
        .send({
          description: "Action on missing ticket.",
          result: "Should 404.",
          followUpRequired: false,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 NOT_FOUND when actionId does not exist on PATCH", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/00000000-0000-0000-0000-000000000000`)
        .set("Cookie", staffCookie)
        .send({
          description: "Action on non-existent actionId.",
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("API-16: Rejection of Physical DELETE (BR-07)", () => {
    it("returns 405 METHOD_NOT_ALLOWED for every role on DELETE /actions and /actions/:actionId", async () => {
      const ticket = await createTestTicket();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Permanent action record.",
          result: "Verified.",
        },
      });

      // Test Requester
      const reqRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", reqCookie);
      expect(reqRes.status).toBe(405);
      expect(reqRes.body.error.code).toBe("METHOD_NOT_ALLOWED");

      // Test Staff
      const staffRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", staffCookie);
      expect(staffRes.status).toBe(405);
      expect(staffRes.body.error.code).toBe("METHOD_NOT_ALLOWED");

      // Test Admin
      const adminRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", adminCookie);
      expect(adminRes.status).toBe(405);
      expect(adminRes.body.error.code).toBe("METHOD_NOT_ALLOWED");

      // Test collection route DELETE /api/tickets/:id/actions
      const colRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie);
      expect(colRes.status).toBe(405);
      expect(colRes.body.error.code).toBe("METHOD_NOT_ALLOWED");
      expect(colRes.body.error.message).toBe("Actions Taken records are append-only and cannot be deleted.");
    });
  });

  describe("API-21: Ordering on GET /api/tickets/:id/actions", () => {
    it("orders actions by actionDateTime DESC, then createdAt DESC", async () => {
      const ticket = await createTestTicket();

      const a1 = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          actionDateTime: new Date("2026-10-20T10:00:00Z"),
          description: "Action A1 at 10:00",
          result: "Completed A1",
        },
      });

      const a2 = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          actionDateTime: new Date("2026-10-20T12:00:00Z"),
          description: "Action A2 at 12:00",
          result: "Completed A2",
        },
      });

      const a3 = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          actionDateTime: new Date("2026-10-20T10:00:00Z"),
          description: "Action A3 at 10:00 (created later than A1)",
          result: "Completed A3",
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const ids = res.body.actions.map((a: any) => a.id);
      // a2 has actionDateTime 12:00 (latest) -> first
      // a3 and a1 have actionDateTime 10:00, but a3 was created after a1 -> a3 before a1
      expect(ids).toEqual([a2.id, a3.id, a1.id]);
    });
  });

  describe("API-22: Sanitization of PerformedBy on GET", () => {
    it("performedBy contains only { id, name, role } without email or passwordHash", async () => {
      const ticket = await createTestTicket();
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Action with performer data.",
          result: "Sanitization verified.",
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      const action = res.body.actions[0];
      expect(action.performedBy).toEqual({
        id: staffUser.id,
        name: staffUser.name,
        role: staffUser.role,
      });
      expect(action.performedBy.email).toBeUndefined();
      expect(action.performedBy.passwordHash).toBeUndefined();
    });
  });

  describe("API-23: PATCH /api/tickets/:id/actions/:actionId Immutability & Response Shape", () => {
    it("preserves ticketId, performedById, and createdAt when updating other fields", async () => {
      const ticket = await createTestTicket();
      const initialTicketUpdatedAt = ticket.updatedAt.getTime();

      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          description: "Original action text.",
          result: "Original result.",
          followUpRequired: false,
        },
      });

      // Wait a moment
      await new Promise((r) => setTimeout(r, 15));

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/actions/${action.id}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Updated action description.",
          result: "Updated result.",
          followUpRequired: true,
          followUpNote: "New mandatory follow-up note.",
          ticketId: 99999, // Should be ignored
          performedById: adminUser.id, // Should be ignored
        });

      expect(res.status).toBe(200);
      expect(res.body.action.id).toBe(action.id);
      expect(res.body.action.ticketId).toBe(ticket.id);
      expect(res.body.action.performedBy.id).toBe(staffUser.id);
      expect(res.body.action.description).toBe("Updated action description.");
      expect(res.body.action.result).toBe("Updated result.");
      expect(res.body.action.followUpRequired).toBe(true);
      expect(res.body.action.followUpNote).toBe("New mandatory follow-up note.");
      expect(new Date(res.body.action.createdAt).getTime()).toBe(action.createdAt.getTime());
      expect(res.body.ticketUpdatedAt).toBeDefined();
    });
  });
});
