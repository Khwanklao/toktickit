import { describe, it, expect } from "vitest";

interface TicketSortItem {
  id: number;
  ticketNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comparator function mirroring backend tie-breaker sorting logic (BR-08, BR-17).
 * When primary field (createdAt or updatedAt) ties, orders by ticketNumber DESC.
 * When primary field is ticketNumber, orders by ticketNumber alone (asc or desc).
 */
export function compareTickets(
  a: TicketSortItem,
  b: TicketSortItem,
  sortBy: "createdAt" | "updatedAt" | "ticketNumber" = "createdAt",
  sortDir: "asc" | "desc" = "desc"
): number {
  if (sortBy === "ticketNumber") {
    const cmp = a.ticketNumber.localeCompare(b.ticketNumber);
    return sortDir === "asc" ? cmp : -cmp;
  }

  const primaryA = a[sortBy].getTime();
  const primaryB = b[sortBy].getTime();

  if (primaryA !== primaryB) {
    return sortDir === "asc" ? primaryA - primaryB : primaryB - primaryA;
  }

  // Tie-breaker: secondary order is ALWAYS ticketNumber DESC (BR-17)
  return b.ticketNumber.localeCompare(a.ticketNumber);
}

describe("UNIT-03: Secondary sort tie-breaker logic (BR-17)", () => {
  it("orders by primary field createdAt DESC when timestamps differ", () => {
    const t1: TicketSortItem = {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
    };
    const t2: TicketSortItem = {
      id: 2,
      ticketNumber: "TKT-2026-000002",
      createdAt: new Date("2026-08-01T11:00:00Z"),
      updatedAt: new Date("2026-08-01T11:00:00Z"),
    };

    const tickets = [t1, t2];
    tickets.sort((a, b) => compareTickets(a, b, "createdAt", "desc"));

    expect(tickets[0].ticketNumber).toBe("TKT-2026-000002");
    expect(tickets[1].ticketNumber).toBe("TKT-2026-000001");
  });

  it("applies ticketNumber DESC tie-breaker when createdAt is identical across rows", () => {
    const sameTime = new Date("2026-08-01T12:00:00Z");

    const t1: TicketSortItem = {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      createdAt: sameTime,
      updatedAt: sameTime,
    };
    const t2: TicketSortItem = {
      id: 2,
      ticketNumber: "TKT-2026-000005",
      createdAt: sameTime,
      updatedAt: sameTime,
    };
    const t3: TicketSortItem = {
      id: 3,
      ticketNumber: "TKT-2026-000003",
      createdAt: sameTime,
      updatedAt: sameTime,
    };

    const tickets = [t1, t2, t3];
    tickets.sort((a, b) => compareTickets(a, b, "createdAt", "desc"));

    expect(tickets.map((t) => t.ticketNumber)).toEqual([
      "TKT-2026-000005",
      "TKT-2026-000003",
      "TKT-2026-000001",
    ]);
  });

  it("applies ticketNumber DESC tie-breaker even when createdAt primary sort direction is ASC", () => {
    const sameTime = new Date("2026-08-01T12:00:00Z");

    const t1: TicketSortItem = {
      id: 1,
      ticketNumber: "TKT-2026-000010",
      createdAt: sameTime,
      updatedAt: sameTime,
    };
    const t2: TicketSortItem = {
      id: 2,
      ticketNumber: "TKT-2026-000020",
      createdAt: sameTime,
      updatedAt: sameTime,
    };

    const tickets = [t1, t2];
    tickets.sort((a, b) => compareTickets(a, b, "createdAt", "asc"));

    // Primary tied, secondary tie-breaker MUST still be ticketNumber DESC per BR-17
    expect(tickets[0].ticketNumber).toBe("TKT-2026-000020");
    expect(tickets[1].ticketNumber).toBe("TKT-2026-000010");
  });

  it("sorts strictly by ticketNumber asc/desc when sortBy is ticketNumber", () => {
    const t1: TicketSortItem = {
      id: 1,
      ticketNumber: "TKT-2026-000001",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const t2: TicketSortItem = {
      id: 2,
      ticketNumber: "TKT-2026-000002",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ticketsAsc = [t2, t1];
    ticketsAsc.sort((a, b) => compareTickets(a, b, "ticketNumber", "asc"));
    expect(ticketsAsc.map((t) => t.ticketNumber)).toEqual(["TKT-2026-000001", "TKT-2026-000002"]);

    const ticketsDesc = [t1, t2];
    ticketsDesc.sort((a, b) => compareTickets(a, b, "ticketNumber", "desc"));
    expect(ticketsDesc.map((t) => t.ticketNumber)).toEqual(["TKT-2026-000002", "TKT-2026-000001"]);
  });
});
