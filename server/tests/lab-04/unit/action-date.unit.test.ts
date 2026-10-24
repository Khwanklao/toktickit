import { describe, it, expect } from "vitest";
import { validateActionDate } from "../../../src/domain/action-date.js";

describe("UNIT-02: validateActionDate (BR-05)", () => {
  const baseNow = new Date("2026-10-25T10:00:00.000Z");
  const ticketCreatedAt = new Date("2026-10-25T08:00:00.000Z");

  it("passes when actionDateTime is exactly now", () => {
    const res = validateActionDate(baseNow, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(true);
  });

  it("passes when actionDateTime is within +59s drift into the future", () => {
    const future59s = new Date(baseNow.getTime() + 59 * 1000);
    const res = validateActionDate(future59s, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(true);
  });

  it("rejects when actionDateTime is +61s into the future (exceeds 60s clock drift)", () => {
    const future61s = new Date(baseNow.getTime() + 61 * 1000);
    const res = validateActionDate(future61s, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("Expected ok: false");
    expect(res.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "actionDateTime",
          code: "INVALID_ACTION_DATE",
        }),
      ])
    );
  });

  it("rejects when actionDateTime is +5 minutes into the future", () => {
    const future5m = new Date(baseNow.getTime() + 5 * 60 * 1000);
    const res = validateActionDate(future5m, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("Expected ok: false");
    expect(res.errors[0]?.code).toBe("INVALID_ACTION_DATE");
  });

  it("passes when actionDateTime is exactly at ticket creation time", () => {
    const res = validateActionDate(ticketCreatedAt, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(true);
  });

  it("rejects when actionDateTime is 1 ms before ticket creation time", () => {
    const before1ms = new Date(ticketCreatedAt.getTime() - 1);
    const res = validateActionDate(before1ms, ticketCreatedAt, baseNow);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("Expected ok: false");
    expect(res.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "actionDateTime",
          code: "INVALID_ACTION_DATE",
        }),
      ])
    );
  });

  it("accepts valid ISO date strings as input", () => {
    const res = validateActionDate(
      "2026-10-25T09:00:00.000Z",
      ticketCreatedAt.toISOString(),
      baseNow
    );
    expect(res.ok).toBe(true);
  });

  it("rejects an invalid date string with code INVALID_ACTION_DATE", () => {
    const res = validateActionDate("not-a-date", ticketCreatedAt, baseNow);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("Expected ok: false");
    expect(res.errors[0]?.code).toBe("INVALID_ACTION_DATE");
  });
});
