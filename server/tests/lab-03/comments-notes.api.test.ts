import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Comments & Internal Notes API Integration Tests (API-17, API-18)", () => {
  const prisma = getPrisma();
  let reqCookie: string;
  let staffCookie: string;
  let adminCookie: string;
  let testTicketId: number;

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

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

    await prisma.user.upsert({
      where: { email: "staff.sarah@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: "IT_STAFF" },
      create: {
        id: "staff-102",
        name: "Sarah Staff",
        email: "staff.sarah@toktickit.local",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
      },
    });

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

    const category = await prisma.category.upsert({
      where: { name: "Network" },
      update: { isActive: true },
      create: { name: "Network", isActive: true },
    });

    const system = await prisma.relatedSystem.upsert({
      where: { name: "VPN" },
      update: { isActive: true },
      create: { name: "VPN", isActive: true },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-NOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Comments and Notes test ticket",
        description: "Testing public comments and internal notes capabilities.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "OPEN",
      },
    });
    testTicketId = ticket.id;

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active1@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.sarah@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.main@toktickit.local", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"][0];
  });

  describe("API-17: Public Comments (POST/GET /api/tickets/:id/comments)", () => {
    it("allows owning Requester, IT Staff, and Admin to post and read public comments", async () => {
      // Requester posts comment
      const res1 = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", [reqCookie])
        .send({ content: "Requester initial comment" });
      expect(res1.status).toBe(201);
      expect(res1.body.comment.content).toBe("Requester initial comment");

      // IT Staff posts comment
      const res2 = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", [staffCookie])
        .send({ content: "Staff response comment" });
      expect(res2.status).toBe(201);

      // GET comments as Admin
      const res3 = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", [adminCookie]);
      expect(res3.status).toBe(200);
      expect(res3.body.comments.length).toBe(2);
    });

    it("rejects whitespace-only public comment with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", [staffCookie])
        .send({ content: "   " });

      expect(res.status).toBe(400);
    });
  });

  describe("API-18: Internal Notes (POST/GET /api/tickets/:id/internal-notes)", () => {
    it("allows IT Staff and Admin to post and read internal notes", async () => {
      const res1 = await request(app)
        .post(`/api/tickets/${testTicketId}/internal-notes`)
        .set("Cookie", [staffCookie])
        .send({ content: "Confidential staff note" });
      expect(res1.status).toBe(201);
      expect(res1.body.note.content).toBe("Confidential staff note");

      const res2 = await request(app)
        .get(`/api/tickets/${testTicketId}/internal-notes`)
        .set("Cookie", [adminCookie]);
      expect(res2.status).toBe(200);
      expect(res2.body.notes.length).toBe(1);
    });
  });
});
