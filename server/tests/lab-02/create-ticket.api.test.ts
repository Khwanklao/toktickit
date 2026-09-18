import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

async function getAuthCookie(email = "req.active1@toktickit.local", password = "Password123!"): Promise<string> {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return loginRes.headers["set-cookie"][0];
}

describe("POST /api/tickets API Integration Tests", () => {
  let cookie: string;

  beforeEach(async () => {
    cookie = await getAuthCookie("req.active1@toktickit.local");
  });

  describe("API-01: Create ticket with valid data (BR-01, BR-02, AC-01)", () => {
    it("creates a ticket and returns 201 Created with status NEW and formatted ticketNumber", async () => {
      const payload = {
        categoryId: 2,
        relatedSystemId: 7,
        summary: "Laptop battery drains quickly",
        description: "My laptop battery is draining much faster than usual even when idle.",
        requestedPriority: "MEDIUM",
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookie])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(Number(res.body.requesterId)).toBe(1);
      expect(res.body.categoryId).toBe(2);
      expect(res.body.relatedSystemId).toBe(7);
      expect(res.body.summary).toBe(payload.summary);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.requestedPriority).toBe("MEDIUM");
      expect(res.body.itPriority).toBeNull();
      expect(res.body.status).toBe("NEW");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });
  });

  describe("API-02: Field validation failures (BR-09, AC-07)", () => {
    it("returns 400 Bad Request with field errors when summary or description are invalid", async () => {
      const payload = {
        categoryId: 2,
        relatedSystemId: 7,
        summary: "   Short  ", // 5 chars trimmed, but let's test < 5
        description: "Too short", // 9 chars < 10
        requestedPriority: "INVALID_PRIORITY",
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookie])
        .send({
          ...payload,
          summary: "Abc", // 3 chars < 5
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe("Bad Request");
      expect(res.body.message).toBe("Validation failed");
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldNames = res.body.errors.map((e: { field: string }) => e.field);
      expect(fieldNames).toContain("summary");
      expect(fieldNames).toContain("description");
      expect(fieldNames).toContain("requestedPriority");
    });

    it("returns 400 Bad Request with field error when categoryId or relatedSystemId is non-existent or inactive", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookie])
        .send({
          categoryId: 999999, // non-existent
          relatedSystemId: 999999, // non-existent
          summary: "Valid summary for ticket creation test",
          description: "Valid description containing more than 10 characters.",
          requestedPriority: "HIGH",
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe("Bad Request");
      expect(res.body.message).toBe("Validation failed");
      expect(Array.isArray(res.body.errors)).toBe(true);

      const fieldNames = res.body.errors.map((e: { field: string }) => e.field);
      expect(fieldNames).toContain("categoryId");
      expect(fieldNames).toContain("relatedSystemId");
    });
  });

  describe("API-03a: Missing or invalid authentication (BR-04, BR-13)", () => {
    it("returns 401 Unauthorized when session cookie is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when session cookie is invalid", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", ["toktickit_session=invalid_token_123"])
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("API-03b: Inactive or non-existent requester credentials (BR-05)", () => {
    it("returns 401 Unauthorized when attempting to authenticate with inactive requester account", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "req.inactive@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 401 Unauthorized when user account does not exist in DB", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@toktickit.local",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });
});

