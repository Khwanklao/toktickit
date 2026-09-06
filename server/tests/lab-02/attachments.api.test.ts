import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Attachment Management APIs Integration Tests", () => {
  // Helper to create a ticket for testing
  async function createTestTicket(requesterId: number = 1, summary: string = "Attachment Test Ticket") {
    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", String(requesterId))
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary,
        description: "Detailed description for attachment testing",
        requestedPriority: "MEDIUM",
      });
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  describe("API-09 & API-10: File Upload (POST /api/tickets/:id/attachments)", () => {
    it("successfully uploads a valid attachment (PNG) and returns 201 Created with public metadata", async () => {
      const ticketId = await createTestTicket(1, "PNG Upload Test Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("fake-png-content"), "screenshot.png");

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.ticketId).toBe(ticketId);
      expect(uploadRes.body.originalFileName).toBe("screenshot.png");
      expect(uploadRes.body.mimeType).toBe("image/png");
      expect(uploadRes.body.fileSize).toBeGreaterThan(0);
      expect(uploadRes.body.isRemoved).toBe(false);
      expect(uploadRes.body).toHaveProperty("id");
      expect(uploadRes.body).toHaveProperty("createdAt");
      // Must NOT expose internal storedFileName or paths
      expect(uploadRes.body).not.toHaveProperty("storedFileName");
      expect(uploadRes.body).not.toHaveProperty("filePath");
    });

    it("successfully uploads a valid PDF attachment", async () => {
      const ticketId = await createTestTicket(1, "PDF Upload Test Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("%PDF-1.4 fake content"), "report.pdf");

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.originalFileName).toBe("report.pdf");
      expect(uploadRes.body.mimeType).toBe("application/pdf");
    });

    it("rejects invalid MIME types (e.g. text/plain, zip) with 400 Bad Request", async () => {
      const ticketId = await createTestTicket(1, "Invalid MIME Test Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("plain text content"), "info.txt");

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.statusCode).toBe(400);
      expect(uploadRes.body.error).toBe("Bad Request");
      expect(uploadRes.body.message).toBeDefined();
    });

    it("rejects empty files (0 bytes) with 400 Bad Request", async () => {
      const ticketId = await createTestTicket(1, "Empty File Test Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from(""), "empty.png");

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.statusCode).toBe(400);
      expect(uploadRes.body.error).toBe("Bad Request");
      expect(uploadRes.body.message).toContain("empty");
    });

    it("rejects oversized files (>5MB) with 400 Bad Request", async () => {
      const ticketId = await createTestTicket(1, "Oversized File Test Ticket");
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100); // > 5MB

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", largeBuffer, "large.png");

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.statusCode).toBe(400);
      expect(uploadRes.body.error).toBe("Bad Request");
      expect(uploadRes.body.message).toContain("5MB");
    });

    it("API-10: returns 409 Conflict when attempting to upload 6th active attachment", async () => {
      const ticketId = await createTestTicket(1, "5 Attachment Limit Ticket");

      // Upload 5 valid attachments
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post(`/api/tickets/${ticketId}/attachments`)
          .set("x-requester-id", "1")
          .attach("file", Buffer.from(`file-${i}`), `doc${i}.pdf`);
        expect(res.status).toBe(201);
      }

      // 6th upload attempt
      const sixthRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("file-6"), "doc6.pdf");

      expect(sixthRes.status).toBe(409);
      expect(sixthRes.body.statusCode).toBe(409);
      expect(sixthRes.body.error).toBe("Conflict");
      expect(sixthRes.body.message).toContain("5");

      // Verify DB count remains 5
      const prisma = getPrisma();
      const count = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });
      expect(count).toBe(5);
    });

    it("returns 404 Not Found when uploading attachment to non-existent or unowned ticket", async () => {
      // Non-existent ticket
      const notFoundRes = await request(app)
        .post("/api/tickets/999999/attachments")
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("test"), "test.png");
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error).toBe("Not Found");

      // Malformed ticket ID
      const malformedRes = await request(app)
        .post("/api/tickets/abc/attachments")
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("test"), "test.png");
      expect(malformedRes.status).toBe(404);

      // Unowned ticket (created by Requester 1, accessed by Requester 2)
      const ticketId = await createTestTicket(1, "Requester 1 Ticket");
      const unownedRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "2")
        .attach("file", Buffer.from("test"), "test.png");
      expect(unownedRes.status).toBe(404);
    });
  });

  describe("API-11b: Metadata Fetch (GET /api/attachments/:id)", () => {
    it("returns 200 OK with metadata for active attachment", async () => {
      const ticketId = await createTestTicket(1, "Metadata Fetch Active Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("content"), "metadata_test.png");

      const attachmentId = uploadRes.body.id;

      const metaRes = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1");

      expect(metaRes.status).toBe(200);
      expect(metaRes.body.id).toBe(attachmentId);
      expect(metaRes.body.ticketId).toBe(ticketId);
      expect(metaRes.body.originalFileName).toBe("metadata_test.png");
      expect(metaRes.body.isRemoved).toBe(false);
      expect(metaRes.body.removedAt).toBeNull();
      expect(metaRes.body.removalReason).toBeNull();
      expect(metaRes.body).not.toHaveProperty("storedFileName");
    });

    it("returns 200 OK with metadata for soft-removed attachment (BR-21, API-11b)", async () => {
      const ticketId = await createTestTicket(1, "Metadata Fetch Removed Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("content"), "to_be_removed.png");

      const attachmentId = uploadRes.body.id;

      // Soft remove
      await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({ reason: "No longer needed for audit" });

      // Fetch metadata
      const metaRes = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1");

      expect(metaRes.status).toBe(200);
      expect(metaRes.body.id).toBe(attachmentId);
      expect(metaRes.body.isRemoved).toBe(true);
      expect(metaRes.body.removedAt).not.toBeNull();
      expect(metaRes.body.removalReason).toBe("No longer needed for audit");
      expect(metaRes.body).not.toHaveProperty("storedFileName");
    });
  });

  describe("API-11, API-12 & API-15: Soft-Remove (DELETE /api/attachments/:id)", () => {
    it("API-11: soft-removes attachment with valid reason and subsequent download returns 410 Gone", async () => {
      const ticketId = await createTestTicket(1, "Soft Remove Test Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("binary-data"), "remove_me.pdf");

      const attachmentId = uploadRes.body.id;

      // Soft remove
      const deleteRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({ reason: "Uploaded incorrect document" });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.isRemoved).toBe(true);
      expect(deleteRes.body.removedBy).toBe(1);
      expect(deleteRes.body.removalReason).toBe("Uploaded incorrect document");
      expect(deleteRes.body.removedAt).toBeDefined();

      // Subsequent download returns 410 Gone
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("x-requester-id", "1");

      expect(downloadRes.status).toBe(410);
      expect(downloadRes.body.statusCode).toBe(410);
      expect(downloadRes.body.error).toBe("Gone");
    });

    it("API-12: rejects soft-remove when reason is missing or empty/whitespace-only", async () => {
      const ticketId = await createTestTicket(1, "Soft Remove Missing Reason Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("binary-data"), "keep_me.pdf");

      const attachmentId = uploadRes.body.id;

      // Missing reason body
      const missingReasonRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({});

      expect(missingReasonRes.status).toBe(400);
      expect(missingReasonRes.body.statusCode).toBe(400);

      // Whitespace only reason
      const emptyReasonRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({ reason: "   " });

      expect(emptyReasonRes.status).toBe(400);

      // Verify attachment is STILL active in DB
      const prisma = getPrisma();
      const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      expect(att?.isRemoved).toBe(false);
    });

    it("API-15: repeat DELETE on an already soft-removed file returns 409 Conflict without overwriting original removal details", async () => {
      const ticketId = await createTestTicket(1, "Repeat Delete Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("data"), "double_delete.png");

      const attachmentId = uploadRes.body.id;

      // First delete
      const firstDelete = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({ reason: "First removal reason" });

      expect(firstDelete.status).toBe(200);
      const originalRemovedAt = firstDelete.body.removedAt;

      // Second delete attempt
      const secondDelete = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "1")
        .send({ reason: "Second removal reason attempt" });

      expect(secondDelete.status).toBe(409);
      expect(secondDelete.body.statusCode).toBe(409);
      expect(secondDelete.body.error).toBe("Conflict");

      // Verify DB retained original removal details
      const prisma = getPrisma();
      const att = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      expect(att?.removalReason).toBe("First removal reason");
      expect(att?.removedAt?.toISOString()).toBe(originalRemovedAt);
    });
  });

  describe("API-16 & API-08b: Download Endpoint & Ownership Isolation", () => {
    it("successfully downloads active attachment file with correct content type & disposition", async () => {
      const ticketId = await createTestTicket(1, "Download Ticket");
      const fileContent = "Downloadable attachment content";

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from(fileContent), "download_test.png");

      const attachmentId = uploadRes.body.id;

      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("x-requester-id", "1");

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers["content-type"]).toContain("image/png");
      expect(downloadRes.headers["content-disposition"]).toContain("download_test.png");
      expect(downloadRes.body.toString()).toBe(fileContent);
    });

    it("API-08b: returns 404 Not Found when Requester 2 attempts to fetch metadata, download, or delete Requester 1's attachment", async () => {
      const ticketId = await createTestTicket(1, "Requester 1 Private Attachment Ticket");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("secret"), "secret.pdf");

      const attachmentId = uploadRes.body.id;

      // Requester 2 fetches metadata
      const metaRes = await request(app)
        .get(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "2");
      expect(metaRes.status).toBe(404);

      // Requester 2 attempts download
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set("x-requester-id", "2");
      expect(downloadRes.status).toBe(404);

      // Requester 2 attempts delete
      const deleteRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set("x-requester-id", "2")
        .send({ reason: "Unauthorized delete" });
      expect(deleteRes.status).toBe(404);
    });

    it("API-16: download returns 404 Not Found for non-existent attachment ID", async () => {
      const downloadRes = await request(app)
        .get("/api/attachments/999999/download")
        .set("x-requester-id", "1");

      expect(downloadRes.status).toBe(404);
      expect(downloadRes.body.error).toBe("Not Found");
    });
  });

  describe("API-14: Ticket Preservation on Attachment Upload Failure (BR-20, BR-24)", () => {
    it("preserves ticket when attachment upload fails, and retrying upload succeeds on existing ticket", async () => {
      const summaryText = `Preservation Ticket ${Date.now()}`;
      // Step 1: Create Ticket
      const ticketId = await createTestTicket(1, summaryText);

      // Step 2: Failed attachment upload attempt (e.g. invalid file type)
      const failedUploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("invalid data"), "script.exe"); // unsupported MIME

      expect(failedUploadRes.status).toBe(400);

      // Step 3: Verify Ticket STILL exists and was not modified/deleted
      const prisma = getPrisma();
      const ticketInDb = await prisma.ticket.findUnique({ where: { id: ticketId } });
      expect(ticketInDb).not.toBeNull();
      expect(ticketInDb?.summary).toBe(summaryText);

      // Step 4: Retry upload with valid file on the SAME ticket ID
      const retryUploadRes = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("x-requester-id", "1")
        .attach("file", Buffer.from("valid content"), "valid_retry.pdf");

      expect(retryUploadRes.status).toBe(201);
      expect(retryUploadRes.body.ticketId).toBe(ticketId);

      // Verify exactly 1 ticket exists for this summary
      const ticketCount = await prisma.ticket.count({
        where: { summary: summaryText },
      });
      expect(ticketCount).toBe(1);
    });
  });
});
