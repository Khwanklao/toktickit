import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Staff Ticket Detail & Operations Integration Tests (API-11 to API-15)", () => {
  const prisma = getPrisma();
  let staffCookie: string;
  let adminCookie: string;
  let reqCookie: string;
  let testTicketId: number;
  let staffUserId: string;
  let requesterUserId: string;
  let inactiveStaffUserId: string;

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    // Active IT Staff
    const staff = await prisma.user.upsert({
      where: { email: "staff.alex@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: "IT_STAFF" },
      create: {
        id: "staff-101",
        name: "Alex Staff",
        email: "staff.alex@toktickit.local",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
      },
    });
    staffUserId = staff.id;

    // Active Admin
    await prisma.user.upsert({
      where: { email: "admin.main@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: "ADMINISTRATOR" },
      create: {
        id: "admin-201",
        name: "Main Admin",
        email: "admin.main@toktickit.local",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
      },
    });

    // Active Requester
    const requester = await prisma.user.upsert({
      where: { email: "req.active1@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: "REQUESTER" },
      create: {
        id: "req-101",
        name: "Alex Requester",
        email: "req.active1@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
      },
    });
    requesterUserId = requester.id;

    // Inactive Staff
    const inactiveStaff = await prisma.user.upsert({
      where: { email: "staff.inactive@toktickit.local" },
      update: { passwordHash: hash, isActive: false, role: "IT_STAFF" },
      create: {
        id: "staff-inactive",
        name: "Inactive Staff",
        email: "staff.inactive@toktickit.local",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: false,
      },
    });
    inactiveStaffUserId = inactiveStaff.id;

    // Ensure category and system exist
    const category = await prisma.category.upsert({
      where: { name: "Software" },
      update: { isActive: true },
      create: { name: "Software", isActive: true },
    });

    const system = await prisma.relatedSystem.upsert({
      where: { name: "Email Client" },
      update: { isActive: true },
      create: { name: "Email Client", isActive: true },
    });

    // Create a new ticket with status NEW
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Test Staff Ticket Ops",
        description: "Testing staff ticket assignment, priority, and status transitions.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "NEW",
        ownerId: null,
      },
    });
    testTicketId = ticket.id;

    // Logins
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.alex@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.main@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active1@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];
  });

  describe("API-11: PATCH /api/staff/tickets/:id/assign", () => {
    it("assigns owner to active IT Staff and auto-transitions NEW ticket to OPEN", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/assign`)
        .set("Cookie", [staffCookie])
        .send({ ownerId: staffUserId });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(staffUserId);
      expect(res.body.status).toBe("OPEN");
    });

    it("returns 403 Forbidden when Administrator attempts to assign owner", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/assign`)
        .set("Cookie", [adminCookie])
        .send({ ownerId: staffUserId });

      expect(res.status).toBe(403);
    });
  });

  describe("API-12: Reject invalid assignment targets", () => {
    it("returns 400 Bad Request when attempting to assign a Requester user", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/assign`)
        .set("Cookie", [staffCookie])
        .send({ ownerId: requesterUserId });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("BAD_REQUEST");
    });

    it("returns 400 Bad Request when attempting to assign an inactive user", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/assign`)
        .set("Cookie", [staffCookie])
        .send({ ownerId: inactiveStaffUserId });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("BAD_REQUEST");
    });
  });

  describe("API-13: PATCH /api/staff/tickets/:id/priority", () => {
    it("updates itPriority while leaving requestedPriority unchanged", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/priority`)
        .set("Cookie", [staffCookie])
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("URGENT");
      expect(res.body.requestedPriority).toBe("LOW");
    });
  });

  describe("API-14 & API-15: PATCH /api/staff/tickets/:id/status", () => {
    it("allows valid status transitions (NEW -> OPEN -> IN_PROGRESS)", async () => {
      // NEW -> OPEN
      const res1 = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Cookie", [staffCookie])
        .send({ status: "OPEN" });
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe("OPEN");

      // OPEN -> IN_PROGRESS
      const res2 = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Cookie", [staffCookie])
        .send({ status: "IN_PROGRESS" });
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe("IN_PROGRESS");
    });

    it("API-15: rejects invalid status transitions (NEW -> RESOLVED)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicketId}/status`)
        .set("Cookie", [staffCookie])
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("BAD_REQUEST");
    });
  });
});
