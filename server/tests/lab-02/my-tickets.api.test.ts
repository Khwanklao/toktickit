import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/tickets API Integration Tests", () => {
  describe("API-04: Fetch tickets scoped to active requester (BR-04, FR-06)", () => {
    it("returns ONLY tickets belonging to the requester specified in x-requester-id", async () => {
      // Create ticket for Requester 1
      const res1 = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester 1 Ticket Summary",
          description: "Description for Requester 1 Ticket",
          requestedPriority: "LOW",
        });
      expect(res1.status).toBe(201);
      const ticket1Number = res1.body.ticketNumber;

      // Create ticket for Requester 2
      const res2 = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "2")
        .send({
          categoryId: 2,
          relatedSystemId: 2,
          summary: "Requester 2 Ticket Summary",
          description: "Description for Requester 2 Ticket",
          requestedPriority: "HIGH",
        });
      expect(res2.status).toBe(201);
      const ticket2Number = res2.body.ticketNumber;

      // Request tickets for Requester 1
      const getRes1 = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "1");

      expect(getRes1.status).toBe(200);
      expect(getRes1.body).toHaveProperty("data");
      expect(getRes1.body).toHaveProperty("pagination");

      const ticketNumbers1 = getRes1.body.data.map((t: any) => t.ticketNumber);
      expect(ticketNumbers1).toContain(ticket1Number);
      expect(ticketNumbers1).not.toContain(ticket2Number);

      // Request tickets for Requester 2
      const getRes2 = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "2");

      expect(getRes2.status).toBe(200);
      const ticketNumbers2 = getRes2.body.data.map((t: any) => t.ticketNumber);
      expect(ticketNumbers2).toContain(ticket2Number);
      expect(ticketNumbers2).not.toContain(ticket1Number);
    });

    it("returns 400 Bad Request when x-requester-id header is missing or malformed", async () => {
      const missingRes = await request(app).get("/api/tickets");
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.message).toBe("Missing x-requester-id header");

      const invalidRes = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "abc");
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.message).toBe("Invalid x-requester-id header");
    });

    it("returns 403 Forbidden when requester is inactive or non-existent", async () => {
      const inactiveRes = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "5"); // Inactive user
      expect(inactiveRes.status).toBe(403);
      expect(inactiveRes.body.error).toBe("Forbidden");

      const nonExistentRes = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "999999");
      expect(nonExistentRes.status).toBe(403);
      expect(nonExistentRes.body.error).toBe("Forbidden");
    });
  });

  describe("API-05: Search tickets by query string (FR-07)", () => {
    it("filters tickets matching summary or ticketNumber case-insensitively", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", "1")
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Unique Keyword Alpha Problem",
          description: "Detailed description for Unique Keyword test",
          requestedPriority: "MEDIUM",
        });
      const createdTicket = res.body;

      // Search by partial summary in lowercase
      const searchRes1 = await request(app)
        .get("/api/tickets?search=keyword%20alpha")
        .set("x-requester-id", "1");

      expect(searchRes1.status).toBe(200);
      const foundIds1 = searchRes1.body.data.map((t: any) => t.id);
      expect(foundIds1).toContain(createdTicket.id);

      // Search by exact ticket number
      const searchRes2 = await request(app)
        .get(`/api/tickets?search=${createdTicket.ticketNumber}`)
        .set("x-requester-id", "1");

      expect(searchRes2.status).toBe(200);
      const foundIds2 = searchRes2.body.data.map((t: any) => t.id);
      expect(foundIds2).toContain(createdTicket.id);
    });

    it("treats empty string or whitespace-only search param as no filter applied", async () => {
      const resAll = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "1");

      const resEmptySearch = await request(app)
        .get("/api/tickets?search=%20%20%20")
        .set("x-requester-id", "1");

      expect(resEmptySearch.status).toBe(200);
      expect(resEmptySearch.body.pagination.totalItems).toBe(resAll.body.pagination.totalItems);
    });
  });

  describe("API-06: Filter and explicit sort tickets (FR-08, FR-09)", () => {
    it("filters by categoryId, priority, and status correctly", async () => {
      const filterRes = await request(app)
        .get("/api/tickets?categoryId=1&priority=LOW&status=NEW")
        .set("x-requester-id", "1");

      expect(filterRes.status).toBe(200);
      filterRes.body.data.forEach((ticket: any) => {
        expect(ticket.category.id).toBe(1);
        expect(ticket.requestedPriority).toBe("LOW");
        expect(ticket.status).toBe("NEW");
      });
    });

    it("returns 200 OK with data: [] when categoryId yields no matching tickets", async () => {
      const nonExistentCatRes = await request(app)
        .get("/api/tickets?categoryId=999999")
        .set("x-requester-id", "1");

      expect(nonExistentCatRes.status).toBe(200);
      expect(nonExistentCatRes.body.data).toEqual([]);
      expect(nonExistentCatRes.body.pagination.totalItems).toBe(0);
    });

    it("silently ignores invalid priority or status filters and returns 200 OK", async () => {
      const invalidParamRes = await request(app)
        .get("/api/tickets?priority=INVALID_PRIORITY&status=INVALID_STATUS")
        .set("x-requester-id", "1");

      expect(invalidParamRes.status).toBe(200);
      expect(Array.isArray(invalidParamRes.body.data)).toBe(true);
    });
  });

  describe("API-07 & API-07b: Pagination and sorting fallbacks (FR-10, BR-08, BR-16, BR-17)", () => {
    it("paginates data correctly with valid page and pageSize (10, 25, 50)", async () => {
      const pageRes = await request(app)
        .get("/api/tickets?page=1&pageSize=25")
        .set("x-requester-id", "1");

      expect(pageRes.status).toBe(200);
      expect(pageRes.body.pagination.page).toBe(1);
      expect(pageRes.body.pagination.pageSize).toBe(25);
    });

    it("falls back silently to safe defaults (createdAt / desc / 10 / 1) for invalid sort or pagination params", async () => {
      const fallbackRes = await request(app)
        .get("/api/tickets?sortBy=invalidField&sortDir=invalidDir&page=-5&pageSize=100")
        .set("x-requester-id", "1");

      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.body.pagination.page).toBe(1);
      expect(fallbackRes.body.pagination.pageSize).toBe(10);
    });

    it("includes relation objects (category, relatedSystem) in ticket data items", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", "1");

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty("category");
        expect(item.category).toHaveProperty("id");
        expect(item.category).toHaveProperty("name");

        expect(item).toHaveProperty("relatedSystem");
        expect(item.relatedSystem).toHaveProperty("id");
        expect(item.relatedSystem).toHaveProperty("name");
      }
    });
  });
});
