import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Staff Queue API Integration Tests (API-09, API-10)", () => {
  const prisma = getPrisma();
  let staffCookie: string;
  let reqCookie: string;

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    // Create staff user
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

    // Create requester user
    await prisma.user.upsert({
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

    // Login staff
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.sarah@toktickit.local", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"][0];

    // Login requester
    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active1@toktickit.local", password: "Password123!" });
    reqCookie = reqLogin.headers["set-cookie"][0];
  });

  describe("API-09: GET /api/staff/queue search, filter, sort, pagination", () => {
    it("returns 200 OK with data array and pagination envelope for staff", async () => {
      const res = await request(app)
        .get("/api/staff/queue?page=1&limit=10")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination).toHaveProperty("totalRecords");
      expect(res.body.pagination).toHaveProperty("totalPages");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("filters queue by search keyword, status, and itPriority", async () => {
      const res = await request(app)
        .get("/api/staff/queue?search=VPN&status=OPEN&itPriority=HIGH")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
    });

    it("returns 403 Forbidden for Requester trying to access queue", async () => {
      const res = await request(app)
        .get("/api/staff/queue")
        .set("Cookie", [reqCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });
  });

  describe("API-10: GET /api/staff/queue invalid query parameters", () => {
    it("returns 400 Bad Request when submitting invalid status enum", async () => {
      const res = await request(app)
        .get("/api/staff/queue?status=INVALID_STATUS")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("BAD_REQUEST");
    });

    it("returns 400 Bad Request when page < 1 or limit < 1", async () => {
      const res = await request(app)
        .get("/api/staff/queue?page=0&limit=10")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("BAD_REQUEST");
    });
  });
});
