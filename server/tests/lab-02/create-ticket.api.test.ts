import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("POST /api/tickets API Integration Tests", () => {
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
        .set("x-requester-id", "1")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res.body.requesterId).toBe(1);
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
        .set("x-requester-id", "1")
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
        .set("x-requester-id", "1")
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

  describe("API-03a: Missing or invalid x-requester-id header (BR-04, BR-13)", () => {
    it("returns 400 Bad Request when x-requester-id header is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe("Bad Request");
    });

    it("returns 400 Bad Request when x-requester-id header is not a valid integer", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "not-an-int")
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe("Bad Request");
    });
  });

  describe("API-03b: Inactive or non-existent requester ID (BR-05)", () => {
    it("returns 403 Forbidden when requester ID is inactive (requester 5)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "5") // Seeded inactive user
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(403);
      expect(res.body.statusCode).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });

    it("returns 403 Forbidden when requester ID does not exist in DB", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "999999")
        .send({
          categoryId: 2,
          relatedSystemId: 7,
          summary: "Laptop battery drains quickly",
          description: "My laptop battery is draining much faster than usual even when idle.",
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(403);
      expect(res.body.statusCode).toBe(403);
      expect(res.body.error).toBe("Forbidden");
    });
  });
});
