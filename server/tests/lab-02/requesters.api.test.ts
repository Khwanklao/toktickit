import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/dev/requesters API Integration Tests (API-13)", () => {
  describe("API-13: Fetch active development requesters (BR-05, BR-18, BR-19, AC-17)", () => {
    it("returns 200 OK with active requesters only and strictly the 4 allowed fields (id, name, email, department)", async () => {
      const res = await request(app).get("/api/dev/requesters");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const allowedKeys = ["id", "name", "email", "department"];
      for (const requester of res.body) {
        expect(Object.keys(requester).sort()).toEqual(allowedKeys.sort());
        expect(typeof requester.id).toBe("number");
        expect(typeof requester.name).toBe("string");
        expect(typeof requester.email).toBe("string");
        expect(typeof requester.department).toBe("string");
        expect(requester).not.toHaveProperty("isActive");
        expect(requester).not.toHaveProperty("createdAt");
        expect(requester).not.toHaveProperty("updatedAt");
      }
    });

    it("returns 200 OK with [] when zero active requesters exist", async () => {
      const prisma = getPrisma();
      vi.spyOn(prisma.requesterUser, "findMany").mockResolvedValueOnce([]);

      const res = await request(app).get("/api/dev/requesters");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);

      vi.restoreAllMocks();
    });

    it("returns 500 Internal Server Error when database query throws a DB error (mocked failure)", async () => {
      const prisma = getPrisma();
      vi.spyOn(prisma.requesterUser, "findMany").mockRejectedValueOnce(new Error("Database connection connection error / raw query failure stack trace"));

      const res = await request(app).get("/api/dev/requesters");

      expect(res.status).toBe(500);
      expect(res.body.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal Server Error");
      expect(res.body.message).toBe("Failed to fetch development requesters");
      expect(res.body).not.toHaveProperty("stack");
      expect(JSON.stringify(res.body)).not.toContain("raw query failure stack trace");

      vi.restoreAllMocks();
    });
  });
});
