import { describe, it, expect } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticket-number.js";

describe("UNIT-01: Ticket Number Formatting (BR-01, AC-01)", () => {
  it("returns a string matching ^TKT-\\d{4}-\\d{6}$", () => {
    const ticketNumber = generateTicketNumber(101, new Date("2026-08-24"));
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(ticketNumber).toBe("TKT-2026-000101");
  });

  it("pads smaller sequence numbers to 6 digits", () => {
    const ticketNumber = generateTicketNumber(1, new Date("2026-01-01"));
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(ticketNumber).toBe("TKT-2026-000001");
  });

  it("handles sequence numbers already at or above 6 digits", () => {
    const ticketNumber = generateTicketNumber(1234567, new Date("2026-05-15"));
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6,}$/);
    expect(ticketNumber).toBe("TKT-2026-1234567");
  });

  it("defaults to the current date if no date is provided", () => {
    const ticketNumber = generateTicketNumber(42);
    const currentYear = new Date().getFullYear();
    expect(ticketNumber).toMatch(new RegExp(`^TKT-${currentYear}-\\d{6}$`));
  });

  it("throws an error for non-positive sequence numbers", () => {
    expect(() => generateTicketNumber(0)).toThrow();
    expect(() => generateTicketNumber(-5)).toThrow();
  });
});
