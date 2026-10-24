import { describe, it, expect } from "vitest";
import { isStale } from "../../../src/domain/concurrency.js";
import { ValidationError } from "../../../src/domain/errors.js";

describe("UNIT-04: isStale (BR-16 Optimistic Concurrency Control)", () => {
  const currentUpdatedAt = new Date("2026-10-25T14:30:00.123Z");

  it("returns false (not stale) when expectedUpdatedAt is omitted, null, or undefined", () => {
    expect(isStale(undefined, currentUpdatedAt)).toBe(false);
    expect(isStale(null, currentUpdatedAt)).toBe(false);
  });

  it("returns false when epoch milliseconds are exactly equal (Date input)", () => {
    const expected = new Date("2026-10-25T14:30:00.123Z");
    expect(isStale(expected, currentUpdatedAt)).toBe(false);
  });

  it("returns false when epoch milliseconds are exactly equal (ISO string input)", () => {
    expect(isStale("2026-10-25T14:30:00.123Z", currentUpdatedAt)).toBe(false);
    expect(
      isStale("2026-10-25T14:30:00.123Z", "2026-10-25T14:30:00.123Z")
    ).toBe(false);
  });

  it("returns true (stale) when expectedUpdatedAt differs by only +1 ms", () => {
    const diffPlus1ms = new Date(currentUpdatedAt.getTime() + 1);
    expect(isStale(diffPlus1ms, currentUpdatedAt)).toBe(true);
  });

  it("returns true (stale) when expectedUpdatedAt differs by -1 ms", () => {
    const diffMinus1ms = new Date(currentUpdatedAt.getTime() - 1);
    expect(isStale(diffMinus1ms, currentUpdatedAt)).toBe(true);
  });

  it("returns true (stale) when timestamps differ significantly", () => {
    const older = new Date("2026-10-25T10:00:00.000Z");
    expect(isStale(older, currentUpdatedAt)).toBe(true);
  });

  it("throws ValidationError when expectedUpdatedAt is an invalid date string", () => {
    expect(() => isStale("invalid-date-string", currentUpdatedAt)).toThrow(ValidationError);
    try {
      isStale("invalid-date-string", currentUpdatedAt);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "expectedUpdatedAt",
            code: "VALIDATION_ERROR",
          }),
        ])
      );
    }
  });

  it("throws ValidationError when currentUpdatedAt is invalid", () => {
    expect(() => isStale("2026-10-25T14:30:00.000Z", "bad-date")).toThrow(ValidationError);
  });
});
