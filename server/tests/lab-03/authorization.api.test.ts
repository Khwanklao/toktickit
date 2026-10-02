import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("API-04: Authorization, RBAC & Mandatory Password Change Barrier", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    // Requester with mustChangePassword = true
    await prisma.user.upsert({
      where: { email: "req.active4@toktickit.local" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        id: "4",
        name: "Active Requester 4",
        email: "req.active4@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Active IT Staff User
    await prisma.user.upsert({
      where: { email: "staff.alex@toktickit.local" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: false,
        role: "IT_STAFF",
      },
      create: {
        id: "101",
        name: "Alex Staff",
        email: "staff.alex@toktickit.local",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Active Administrator User
    await prisma.user.upsert({
      where: { email: "admin.main@toktickit.local" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: false,
        role: "ADMINISTRATOR",
      },
      create: {
        id: "201",
        name: "Main Admin",
        email: "admin.main@toktickit.local",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });
  });

  describe("BR-02: Mandatory Password Change Interception", () => {
    it("blocks general API access with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active4@toktickit.local",
          password: "Password123!",
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.mustChangePassword).toBe(true);
      const cookie = loginRes.headers["set-cookie"][0];

      const ticketRes = await request(app)
        .get("/api/tickets")
        .set("Cookie", [cookie]);

      expect(ticketRes.status).toBe(403);
      expect(ticketRes.body).toEqual({
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Password change required before accessing the system.",
        },
      });
    });

    it("allows /api/auth/me, /api/auth/logout, and /api/auth/change-password when mustChangePassword is true", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active4@toktickit.local",
          password: "Password123!",
        });
      const cookie = loginRes.headers["set-cookie"][0];

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [cookie]);
      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe("req.active4@toktickit.local");

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", [cookie])
        .send({
          currentPassword: "Password123!",
          newPassword: "NewSecur3#Password",
        });
      expect(changeRes.status).toBe(200);
      expect(changeRes.body.mustChangePassword).toBe(false);
    });
  });

  describe("Unauthenticated Access Restrictions (401 Unauthorized)", () => {
    it("returns 401 Unauthorized when accessing /api/auth/me without valid token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when accessing /api/auth/change-password without valid token", async () => {
      const res = await request(app).post("/api/auth/change-password").send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when creating ticket (POST /api/tickets) with invalid token", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", ["toktickit_session=invalid_token_123"])
        .send({
          summary: "Test Summary",
          description: "Test description long enough",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
        });
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when retrieving tickets (GET /api/tickets) with invalid token", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", ["toktickit_session=invalid_token_123"]);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when retrieving ticket detail (GET /api/tickets/:id) with invalid token", async () => {
      const res = await request(app)
        .get("/api/tickets/1")
        .set("Cookie", ["toktickit_session=invalid_token_123"]);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when uploading attachment (POST /api/tickets/:id/attachments) with invalid token", async () => {
      const res = await request(app)
        .post("/api/tickets/1/attachments")
        .set("Cookie", ["toktickit_session=invalid_token_123"]);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when accessing attachment metadata (GET /api/attachments/:id) with invalid token", async () => {
      const res = await request(app)
        .get("/api/attachments/1")
        .set("Cookie", ["toktickit_session=invalid_token_123"]);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when downloading attachment (GET /api/attachments/:id/download) with invalid token", async () => {
      const res = await request(app)
        .get("/api/attachments/1/download")
        .set("Cookie", ["toktickit_session=invalid_token_123"]);
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when removing attachment (DELETE /api/attachments/:id) with invalid token", async () => {
      const res = await request(app)
        .delete("/api/attachments/1")
        .set("Cookie", ["toktickit_session=invalid_token_123"])
        .send({ reason: "Testing removal" });
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Role-Based Authorization Restrictions (403 Forbidden)", () => {
    let staffCookie: string;
    let adminCookie: string;

    beforeEach(async () => {
      const staffLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "staff.alex@toktickit.local", password: "Password123!" });
      staffCookie = staffLogin.headers["set-cookie"][0];

      const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin.main@toktickit.local", password: "Password123!" });
      adminCookie = adminLogin.headers["set-cookie"][0];
    });

    it("returns 403 Forbidden when IT Staff attempts to create ticket (POST /api/tickets)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", [staffCookie])
        .send({
          summary: "Staff ticket attempt",
          description: "This should be forbidden for staff role",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when Administrator attempts to create ticket (POST /api/tickets)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", [adminCookie])
        .send({
          summary: "Admin ticket attempt",
          description: "This should be forbidden for admin role",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when IT Staff attempts to access requester ticket list (GET /api/tickets)", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when Administrator attempts to access requester ticket list (GET /api/tickets)", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", [adminCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when IT Staff attempts to upload attachment (POST /api/tickets/:id/attachments)", async () => {
      const res = await request(app)
        .post("/api/tickets/1/attachments")
        .set("Cookie", [staffCookie]);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when Administrator attempts to remove attachment (DELETE /api/attachments/:id)", async () => {
      const res = await request(app)
        .delete("/api/attachments/1")
        .set("Cookie", [adminCookie])
        .send({ reason: "Admin attempt" });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("API-19: returns 403 Forbidden when Requester attempts to view or post internal notes (GET/POST /api/tickets/:id/internal-notes)", async () => {
      const reqLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "req.active4@toktickit.local", password: "Password123!" });
      
      // First clear password change barrier if needed
      const reqCookie = reqLogin.headers["set-cookie"][0];
      await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", [reqCookie])
        .send({ currentPassword: "Password123!", newPassword: "NewSecur3#Password" });

      const newLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "req.active4@toktickit.local", password: "NewSecur3#Password" });
      const activeReqCookie = newLogin.headers["set-cookie"][0];

      const getRes = await request(app)
        .get("/api/tickets/1/internal-notes")
        .set("Cookie", [activeReqCookie]);

      expect(getRes.status).toBe(403);
      expect(getRes.body.error?.code).toBe("FORBIDDEN");

      const postRes = await request(app)
        .post("/api/tickets/1/internal-notes")
        .set("Cookie", [activeReqCookie])
        .send({ content: "Unauthorized note attempt" });

      expect(postRes.status).toBe(403);
      expect(postRes.body.error?.code).toBe("FORBIDDEN");
    });
  });
});

