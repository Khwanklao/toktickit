import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Authentication API Integration Tests (lab-03)", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    // Ensure test user states are predictable
    const hash = bcrypt.hashSync("Password123!", 10);
    await prisma.user.upsert({
      where: { email: "req.active1@toktickit.local" },
      update: {
        passwordHash: hash,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        id: "1",
        name: "Active Requester 1",
        email: "req.active1@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    await prisma.user.upsert({
      where: { email: "req.inactive@toktickit.local" },
      update: {
        passwordHash: hash,
        isActive: false,
        mustChangePassword: false,
      },
      create: {
        id: "5",
        name: "Inactive Requester",
        email: "req.inactive@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: false,
        mustChangePassword: false,
      },
    });
  });

  describe("API-01: Login with valid credentials", () => {
    it("authenticates active user, issues session cookie and returns user profile", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "1");
      expect(res.body).toHaveProperty("email", "req.active1@toktickit.local");
      expect(res.body).toHaveProperty("role", "REQUESTER");
      expect(res.body).toHaveProperty("mustChangePassword", false);

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("toktickit_session=");
    });
  });

  describe("API-02: Login with invalid credentials", () => {
    it("returns 401 Unauthorized with generic envelope for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("returns 401 Unauthorized with generic envelope for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    });
  });

  describe("API-03: Login with inactive account", () => {
    it("returns 401 Unauthorized with generic envelope for inactive user", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.inactive@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    });
  });

  describe("API-05 & API-05b: Change password", () => {
    it("API-05: successfully updates password when current password is correct", async () => {
      // 1. Login to get cookie
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "Password123!",
        });
      const cookie = loginRes.headers["set-cookie"][0];

      // 2. Change password
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", [cookie])
        .send({
          currentPassword: "Password123!",
          newPassword: "NewSecur3#Password",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body).toHaveProperty("mustChangePassword", false);

      // 3. Verify login with new password
      const newLoginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "NewSecur3#Password",
        });

      expect(newLoginRes.status).toBe(200);
    });

    it("API-05b: returns 400 Bad Request when current password is incorrect", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "Password123!",
        });
      const cookie = loginRes.headers["set-cookie"][0];

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", [cookie])
        .send({
          currentPassword: "WrongCurrentPassword!",
          newPassword: "NewSecur3#Password",
        });

      expect(changeRes.status).toBe(400);
      expect(changeRes.body).toEqual({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect. Please try again.",
        },
      });
    });
  });

  describe("API-06: Logout & session invalidation", () => {
    it("invalidates session on logout and clears session cookie", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.active1@toktickit.local",
          password: "Password123!",
        });
      const cookie = loginRes.headers["set-cookie"][0];

      // Verify /me works before logout
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [cookie]);
      expect(meRes.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [cookie]);
      expect(logoutRes.status).toBe(200);

      // Verify /me now fails with 401 Unauthorized
      const meResAfter = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [cookie]);
      expect(meResAfter.status).toBe(401);
    });
  });
});
