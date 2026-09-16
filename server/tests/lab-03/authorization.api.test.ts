import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("API-04: Authorization & Mandatory Password Change Barrier", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);
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
  });

  it("blocks general API access with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
    // 1. Login with mustChangePassword: true user
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "req.active4@toktickit.local",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mustChangePassword).toBe(true);
    const cookie = loginRes.headers["set-cookie"][0];

    // 2. Attempt to call ticket API
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

    // GET /api/auth/me is allowed
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [cookie]);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("req.active4@toktickit.local");

    // POST /api/auth/change-password is allowed
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
