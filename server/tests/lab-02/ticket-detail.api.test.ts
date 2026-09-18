import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

async function getAuthCookie(email = "req.active1@toktickit.local", password = "Password123!"): Promise<string> {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return loginRes.headers["set-cookie"][0];
}

describe("GET /api/tickets/:id API Integration Tests", () => {
  let cookieReq1: string;
  let cookieReq2: string;

  beforeEach(async () => {
    cookieReq1 = await getAuthCookie("req.active1@toktickit.local");
    cookieReq2 = await getAuthCookie("req.active2@toktickit.local");
  });

  describe("API-08 & AC-14: Ticket detail & ownership isolation (BR-04, FR-11)", () => {
    it("returns 200 OK with full ticket details when accessed by ticket owner", async () => {
      const createRes = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookieReq1])
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Ticket Detail Fetch Test Summary",
          description: "Detailed description for ticket detail test",
          requestedPriority: "HIGH",
        });

      expect(createRes.status).toBe(201);
      const ticketId = createRes.body.id;

      const detailRes = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set("Cookie", [cookieReq1]);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(ticketId);
      expect(detailRes.body.ticketNumber).toBe(createRes.body.ticketNumber);
      expect(detailRes.body.summary).toBe("Ticket Detail Fetch Test Summary");
      expect(detailRes.body.description).toBe("Detailed description for ticket detail test");
      expect(detailRes.body.requestedPriority).toBe("HIGH");
      expect(detailRes.body.status).toBe("NEW");

      // Verify nested relations
      expect(detailRes.body).toHaveProperty("requester");
      expect(Number(detailRes.body.requester.id)).toBe(1);
      expect(detailRes.body.requester).toHaveProperty("name");
      expect(detailRes.body.requester).toHaveProperty("email");

      expect(detailRes.body).toHaveProperty("category");
      expect(detailRes.body.category.id).toBe(1);
      expect(detailRes.body.category).toHaveProperty("name");

      expect(detailRes.body).toHaveProperty("relatedSystem");
      expect(detailRes.body.relatedSystem.id).toBe(1);
      expect(detailRes.body.relatedSystem).toHaveProperty("name");

      expect(detailRes.body).toHaveProperty("attachments");
      expect(Array.isArray(detailRes.body.attachments)).toBe(true);
    });

    it("returns 404 Not Found (not 403) when Requester A accesses Requester B's ticket", async () => {
      // Create ticket owned by Requester 1
      const createRes = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookieReq1])
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester 1 Private Ticket",
          description: "This ticket belongs strictly to Requester 1",
          requestedPriority: "MEDIUM",
        });
      const ticketId = createRes.body.id;

      // Requester 2 attempts to fetch Requester 1's ticket
      const detailRes = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set("Cookie", [cookieReq2]);

      expect(detailRes.status).toBe(404);
      expect(detailRes.body.statusCode).toBe(404);
      expect(detailRes.body.error).toBe("Not Found");
      expect(detailRes.body.message).toBe("Ticket not found");
    });

    it("returns 404 Not Found when ticket ID does not exist in DB", async () => {
      const detailRes = await request(app)
        .get("/api/tickets/999999")
        .set("Cookie", [cookieReq1]);

      expect(detailRes.status).toBe(404);
      expect(detailRes.body.statusCode).toBe(404);
      expect(detailRes.body.error).toBe("Not Found");
      expect(detailRes.body.message).toBe("Ticket not found");
    });

    it("returns 404 Not Found for malformed ticket ID (abc, -1, 1.5)", async () => {
      const nonNumericRes = await request(app)
        .get("/api/tickets/abc")
        .set("Cookie", [cookieReq1]);
      expect(nonNumericRes.status).toBe(404);
      expect(nonNumericRes.body.error).toBe("Not Found");

      const negativeRes = await request(app)
        .get("/api/tickets/-1")
        .set("Cookie", [cookieReq1]);
      expect(negativeRes.status).toBe(404);

      const decimalRes = await request(app)
        .get("/api/tickets/1.5")
        .set("Cookie", [cookieReq1]);
      expect(decimalRes.status).toBe(404);
    });

    it("returns 401 Unauthorized when session cookie is missing or invalid", async () => {
      const missingRes = await request(app).get("/api/tickets/1");
      expect(missingRes.status).toBe(401);
      expect(missingRes.body.error?.code).toBe("UNAUTHORIZED");

      const invalidRes = await request(app)
        .get("/api/tickets/1")
        .set("Cookie", ["toktickit_session=invalid_token"]);
      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when requester is inactive", async () => {
      const inactiveRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "req.inactive@toktickit.local", password: "Password123!" });
      expect(inactiveRes.status).toBe(401);
      expect(inactiveRes.body.error?.code).toBe("INVALID_CREDENTIALS");
    });

    it("excludes soft-deleted attachments (isRemoved: true) from the detail response", async () => {
      const prisma = getPrisma();

      // Create ticket for Requester 1
      const createRes = await request(app)
        .post("/api/tickets")
        .set("Cookie", [cookieReq1])
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Ticket with Attachments Test",
          description: "Description for attachment visibility test",
          requestedPriority: "LOW",
        });
      const ticketId = createRes.body.id;

      // Seed 1 active and 1 soft-removed attachment directly via Prisma
      const activeAtt = await prisma.attachment.create({
        data: {
          ticketId,
          originalFileName: "active_log.txt",
          storedFileName: "uuid-active_log.txt",
          mimeType: "text/plain",
          fileSize: 1024,
          uploadedBy: "1",
          isRemoved: false,
        },
      });

      const removedAtt = await prisma.attachment.create({
        data: {
          ticketId,
          originalFileName: "deleted_log.txt",
          storedFileName: "uuid-deleted_log.txt",
          mimeType: "text/plain",
          fileSize: 2048,
          uploadedBy: "1",
          isRemoved: true,
          removedAt: new Date(),
          removedBy: "1",
          removalReason: "Test removal",
        },
      });

      // Fetch ticket details
      const detailRes = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set("Cookie", [cookieReq1]);

      expect(detailRes.status).toBe(200);
      const attachmentIds = detailRes.body.attachments.map((a: any) => a.id);

      expect(attachmentIds).toContain(activeAtt.id);
      expect(attachmentIds).not.toContain(removedAtt.id);
    });
  });
});

