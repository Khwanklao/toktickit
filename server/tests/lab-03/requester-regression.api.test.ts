import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Requester Operations & Regression API Tests (API-16, REGR-01)", () => {
  const prisma = getPrisma();
  let reqCookie: string;
  let otherReqCookie: string;
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
      where: { email: "req.active2@toktickit.local" },
      update: { passwordHash: hash, isActive: true, role: "REQUESTER" },
      create: {
        id: "req-102",
        name: "Beth Requester",
        email: "req.active2@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
      },
    });

    const category = await prisma.category.upsert({
      where: { name: "Network" },
      update: { isActive: true },
      create: { name: "Network", isActive: true },
    });

    const system = await prisma.relatedSystem.upsert({
      where: { name: "Wi-Fi" },
      update: { isActive: true },
      create: { name: "Wi-Fi", isActive: true },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-REGR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requesterId: requester.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Regression test ticket",
        description: "Testing requester resolve indication and regression.",
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "IN_PROGRESS",
      },
    });
    testTicketId = ticket.id;

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active1@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];

    const otherReqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active2@toktickit.local", password: "Password123!" });
    otherReqCookie = otherReqLogin.headers["set-cookie"][0];
  });

  describe("API-16: PATCH /api/tickets/:id/resolve-indication", () => {
    it("owning Requester signals resolve indication, setting flag and system comment without changing status", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indication`)
        .set("Cookie", [reqCookie])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.ticket.isRequesterResolved).toBe(true);
      expect(res.body.ticket.status).toBe("IN_PROGRESS");

      // Verify system comment was created
      const commentsRes = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", [reqCookie]);

      expect(commentsRes.status).toBe(200);
      expect(
        commentsRes.body.comments.some((c: any) =>
          c.content.includes("[System] Requester indicated that the problem appears resolved.")
        )
      ).toBe(true);
    });

    it("returns 404 Not Found when a non-owning Requester attempts to signal resolve indication", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indication`)
        .set("Cookie", [otherReqCookie])
        .send({});

      expect(res.status).toBe(404);
    });
  });
});
