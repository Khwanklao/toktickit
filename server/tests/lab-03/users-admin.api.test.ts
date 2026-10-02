import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Administrator User Management API (API-20 to API-25)", () => {
  const prisma = getPrisma();
  let adminCookie: string;
  let secondaryAdminCookie: string;
  let staffCookie: string;
  let requesterCookie: string;
  let mustChangeAdminCookie: string;

  let mainAdminUser: any;
  let secondaryAdminUser: any;
  let mustChangeAdminUser: any;
  let staffUser: any;
  let requesterUser: any;

  afterAll(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "req.active1@toktickit.local",
            "staff.alex@toktickit.local",
            "admin.main@toktickit.local",
            "admin.secondary@toktickit.local",
          ],
        },
      },
      data: {
        passwordHash: hash,
        mustChangePassword: false,
      },
    });
  });

  beforeEach(async () => {
    const hash = bcrypt.hashSync("Password123!", 10);

    // Clean up test created users if needed
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["created.user@toktickit.local", "patch.user@toktickit.local", "dup.email@toktickit.local"],
        },
      },
    });

    // Active Main Admin
    mainAdminUser = await prisma.user.upsert({
      where: { email: "admin.main@toktickit.local" },
      update: {
        name: "Main Admin",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Main Admin",
        email: "admin.main@toktickit.local",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Active Secondary Admin
    secondaryAdminUser = await prisma.user.upsert({
      where: { email: "admin.secondary@toktickit.local" },
      update: {
        name: "Secondary Admin",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Secondary Admin",
        email: "admin.secondary@toktickit.local",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Admin with mustChangePassword = true
    mustChangeAdminUser = await prisma.user.upsert({
      where: { email: "admin.mustchange@toktickit.local" },
      update: {
        name: "Must Change Admin",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        name: "Must Change Admin",
        email: "admin.mustchange@toktickit.local",
        passwordHash: hash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Active IT Staff
    staffUser = await prisma.user.upsert({
      where: { email: "staff.alex@toktickit.local" },
      update: {
        name: "Alex Staff",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Alex Staff",
        email: "staff.alex@toktickit.local",
        passwordHash: hash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Active Requester
    requesterUser = await prisma.user.upsert({
      where: { email: "req.active1@toktickit.local" },
      update: {
        name: "Active Requester 1",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Active Requester 1",
        email: "req.active1@toktickit.local",
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // Login users to acquire session cookies
    const loginAdmin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.main@toktickit.local", password: "Password123!" });
    adminCookie = loginAdmin.headers["set-cookie"][0];

    const loginSecondaryAdmin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.secondary@toktickit.local", password: "Password123!" });
    secondaryAdminCookie = loginSecondaryAdmin.headers["set-cookie"][0];

    const loginStaff = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.alex@toktickit.local", password: "Password123!" });
    staffCookie = loginStaff.headers["set-cookie"][0];

    const loginReq = await request(app)
      .post("/api/auth/login")
      .send({ email: "req.active1@toktickit.local", password: "Password123!" });
    requesterCookie = loginReq.headers["set-cookie"][0];

    const loginMustChange = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.mustchange@toktickit.local", password: "Password123!" });
    mustChangeAdminCookie = loginMustChange.headers["set-cookie"][0];
  });

  describe("API-20: GET /api/admin/users (AC-13)", () => {
    it("returns 401 Unauthorized when unauthenticated", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when accessed by IT Staff or Requester", async () => {
      const staffRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", [staffCookie]);
      expect(staffRes.status).toBe(403);
      expect(staffRes.body.error?.code).toBe("FORBIDDEN");

      const reqRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", [requesterCookie]);
      expect(reqRes.status).toBe(403);
      expect(reqRes.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 PASSWORD_CHANGE_REQUIRED when admin has mustChangePassword = true", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", [mustChangeAdminCookie]);
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("returns 200 OK with list of users excluding passwordHash for valid Administrator", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);

      const firstUser = res.body.users[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("name");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("role");
      expect(firstUser).toHaveProperty("isActive");
      expect(firstUser).toHaveProperty("mustChangePassword");
      expect(firstUser).toHaveProperty("createdAt");
      expect(firstUser).not.toHaveProperty("passwordHash");
    });

    it("filters users by case-insensitive search parameter matching name or email", async () => {
      const searchRes = await request(app)
        .get("/api/admin/users?search=MAIN")
        .set("Cookie", [adminCookie]);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.users.length).toBe(1);
      expect(searchRes.body.users[0].email).toBe("admin.main@toktickit.local");
    });

    it("filters users by role parameter", async () => {
      const roleRes = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Cookie", [adminCookie]);

      expect(roleRes.status).toBe(200);
      expect(roleRes.body.users.every((u: any) => u.role === "IT_STAFF")).toBe(true);
    });

    it("returns 400 Bad Request when invalid role query parameter is submitted", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=INVALID_ROLE")
        .set("Cookie", [adminCookie]);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("API-21 & API-22: POST /api/admin/users (AC-14, AC-15)", () => {
    it("creates a new user account with mustChangePassword = true (201 Created)", async () => {
      const newUserPayload = {
        name: "Created User",
        email: "created.user@toktickit.local",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", [adminCookie])
        .send(newUserPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.name).toBe("Created User");
      expect(res.body.user.email).toBe("created.user@toktickit.local");
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user.isActive).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.user).not.toHaveProperty("passwordHash");

      // Check DB record
      const dbUser = await prisma.user.findUnique({ where: { email: "created.user@toktickit.local" } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.mustChangePassword).toBe(true);
      expect(bcrypt.compareSync("InitialPassword123!", dbUser!.passwordHash)).toBe(true);
    });

    it("API-21: rejects creation when email is a duplicate (case-insensitive, 409 Conflict)", async () => {
      const dupPayload = {
        name: "Duplicate User",
        email: "ADMIN.MAIN@toktickit.local", // uppercase variant of existing email
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", [adminCookie])
        .send(dupPayload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it("API-22: rejects creation when role value does not match enum (400 Bad Request)", async () => {
      const invalidRolePayload = {
        name: "Invalid Role User",
        email: "invalid.role@toktickit.local",
        role: "SUPERADMIN",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", [adminCookie])
        .send(invalidRolePayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("rejects creation when initialPassword fails password complexity rules (400 Bad Request)", async () => {
      const weakPasswordPayload = {
        name: "Weak Password User",
        email: "weak.pass@toktickit.local",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "simplepassword", // missing uppercase, number, special char
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", [adminCookie])
        .send(weakPasswordPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe("API-23 & API-24: PATCH /api/admin/users/:id (AC-16, AC-17)", () => {
    it("updates basic user info successfully (200 OK)", async () => {
      const updatePayload = {
        name: "Alex Staff Updated",
        role: "REQUESTER",
      };

      const res = await request(app)
        .patch(`/api/admin/users/${staffUser.id}`)
        .set("Cookie", [adminCookie])
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Alex Staff Updated");
      expect(res.body.user.role).toBe("REQUESTER");
    });

    it("returns 404 Not Found when updating a non-existent user ID", async () => {
      const res = await request(app)
        .patch("/api/admin/users/non-existent-uuid")
        .set("Cookie", [adminCookie])
        .send({ name: "Non Existent" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it("returns 409 Conflict when updating email to an existing email (case-insensitive)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${staffUser.id}`)
        .set("Cookie", [adminCookie])
        .send({ email: "ADMIN.MAIN@TOKTICKIT.LOCAL" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it("API-23: prevents Administrator from deactivating their own account (400 Bad Request)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${mainAdminUser.id}`) // logged in as mainAdminUser
        .set("Cookie", [adminCookie])
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();

      // Verify DB state unchanged
      const adminDb = await prisma.user.findUnique({ where: { id: mainAdminUser.id } });
      expect(adminDb?.isActive).toBe(true);
    });

    it("API-24: prevents deactivating or demoting the last active Administrator (400 Bad Request)", async () => {
      // Deactivate secondary admin and mustChange admin so only mainAdminUser (201) is active admin
      await prisma.user.update({
        where: { id: secondaryAdminUser.id },
        data: { isActive: false },
      });

      await prisma.user.update({
        where: { id: mustChangeAdminUser.id },
        data: { isActive: false },
      });

      // Main admin (who is active) attempts to demote their own role to IT_STAFF when they are the last active admin
      const resDemote = await request(app)
        .patch(`/api/admin/users/${mainAdminUser.id}`)
        .set("Cookie", [adminCookie])
        .send({ role: "IT_STAFF" });

      expect(resDemote.status).toBe(400);
      expect(resDemote.body.error).toBeDefined();
      expect(resDemote.body.error.message).toMatch(/at least one active/i);
    });
  });

  describe("API-25: POST /api/admin/users/:id/reset-password (AC-18)", () => {
    it("resets initial password and sets mustChangePassword = true (200 OK)", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${staffUser.id}/reset-password`)
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "ResetPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Initial password reset successfully.",
        userId: staffUser.id,
        mustChangePassword: true,
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: staffUser.id } });
      expect(updatedUser?.mustChangePassword).toBe(true);
      expect(bcrypt.compareSync("ResetPassword123!", updatedUser!.passwordHash)).toBe(true);
    });

    it("returns 404 Not Found when resetting password for non-existent user ID", async () => {
      const res = await request(app)
        .post("/api/admin/users/non-existent-uuid/reset-password")
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "ResetPassword123!" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it("returns 400 Bad Request when newInitialPassword fails complexity rules", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${staffUser.id}/reset-password`)
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "short" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("revokes target user's existing sessions so old cookie returns 401 while admin session remains valid", async () => {
      // 1. Staff logs in to obtain an active session cookie
      const staffLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "staff.alex@toktickit.local", password: "Password123!" });
      const staffLoginCookie = staffLogin.headers["set-cookie"][0];

      // 2. Verify staff session is valid
      const meBefore = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [staffLoginCookie]);
      expect(meBefore.status).toBe(200);

      // 3. Admin resets staff's password
      const resetRes = await request(app)
        .post(`/api/admin/users/${staffUser.id}/reset-password`)
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "NewResetPass123!" });
      expect(resetRes.status).toBe(200);

      // 4. Staff's old session cookie must now return 401 Unauthorized
      const meAfter = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [staffLoginCookie]);
      expect(meAfter.status).toBe(401);
      expect(meAfter.body.error?.code).toBe("UNAUTHORIZED");

      // 5. Admin's own session must remain valid
      const adminMe = await request(app)
        .get("/api/admin/users")
        .set("Cookie", [adminCookie]);
      expect(adminMe.status).toBe(200);
    });

    it("allows target user to log in again with new initial password and receive new session with mustChangePassword = true", async () => {
      // Admin resets staff password
      await request(app)
        .post(`/api/admin/users/${staffUser.id}/reset-password`)
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "NewResetPass123!" });

      // Staff logs in with new password
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "staff.alex@toktickit.local", password: "NewResetPass123!" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.mustChangePassword).toBe(true);
      expect(loginRes.headers["set-cookie"]).toBeDefined();
    });

    it("succeeds normally without error when resetting password for a target user with no existing active sessions", async () => {
      // Ensure target user has no sessions in DB
      await prisma.session.deleteMany({ where: { userId: requesterUser.id } });

      const res = await request(app)
        .post(`/api/admin/users/${requesterUser.id}/reset-password`)
        .set("Cookie", [adminCookie])
        .send({ newInitialPassword: "NewResetPass123!" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Initial password reset successfully.");
      expect(res.body.mustChangePassword).toBe(true);
    });
  });
});
