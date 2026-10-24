import { describe, it, expect } from "vitest";
import { validateActionInput } from "../../../src/domain/action-validation.js";

describe("UNIT-01: validateActionInput (BR-03, BR-04)", () => {
  const validPayload = {
    description: "Replaced faulty RAM module and ran diagnostics.",
    result: "System passed all memory tests with zero errors.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "memtest_screenshot.png",
  };

  it("returns ok: true for valid action input without follow-up", () => {
    const res = validateActionInput(validPayload);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("Expected ok: true");
    expect(res.errors).toBeUndefined();
  });

  it("returns ok: true for valid action input with required follow-up note", () => {
    const res = validateActionInput({
      ...validPayload,
      followUpRequired: true,
      followUpNote: "Monitor system for 48 hours to confirm stability.",
    });
    expect(res.ok).toBe(true);
  });

  it("rejects when description is missing, empty, or whitespace-only", () => {
    const resMissing = validateActionInput({ ...validPayload, description: "" });
    expect(resMissing.ok).toBe(false);
    if (resMissing.ok) throw new Error("Expected ok: false");
    expect(resMissing.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description", code: "VALIDATION_ERROR" }),
      ])
    );

    const resWhitespace = validateActionInput({ ...validPayload, description: "    " });
    expect(resWhitespace.ok).toBe(false);
  });

  it("rejects description shorter than 5 characters or longer than 2,000 characters", () => {
    const resShort = validateActionInput({ ...validPayload, description: "1234" });
    expect(resShort.ok).toBe(false);

    const resLong = validateActionInput({
      ...validPayload,
      description: "a".repeat(2001),
    });
    expect(resLong.ok).toBe(false);

    const resExact5 = validateActionInput({ ...validPayload, description: "12345" });
    expect(resExact5.ok).toBe(true);

    const resExact2000 = validateActionInput({
      ...validPayload,
      description: "a".repeat(2000),
    });
    expect(resExact2000.ok).toBe(true);
  });

  it("rejects result shorter than 5 characters, longer than 2,000, or whitespace-only", () => {
    const resShort = validateActionInput({ ...validPayload, result: "1234" });
    expect(resShort.ok).toBe(false);

    const resWhitespace = validateActionInput({ ...validPayload, result: "     " });
    expect(resWhitespace.ok).toBe(false);

    const resLong = validateActionInput({
      ...validPayload,
      result: "b".repeat(2001),
    });
    expect(resLong.ok).toBe(false);

    const resExact5 = validateActionInput({ ...validPayload, result: "12345" });
    expect(resExact5.ok).toBe(true);
  });

  it("requires followUpNote (5 to 2,000 chars) when followUpRequired is true", () => {
    const resMissing = validateActionInput({
      ...validPayload,
      followUpRequired: true,
      followUpNote: undefined,
    });
    expect(resMissing.ok).toBe(false);
    if (resMissing.ok) throw new Error("Expected ok: false");
    expect(resMissing.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "followUpNote", code: "VALIDATION_ERROR" }),
      ])
    );

    const resWhitespace = validateActionInput({
      ...validPayload,
      followUpRequired: true,
      followUpNote: "     ",
    });
    expect(resWhitespace.ok).toBe(false);

    const resShort = validateActionInput({
      ...validPayload,
      followUpRequired: true,
      followUpNote: "1234",
    });
    expect(resShort.ok).toBe(false);

    const resLong = validateActionInput({
      ...validPayload,
      followUpRequired: true,
      followUpNote: "c".repeat(2001),
    });
    expect(resLong.ok).toBe(false);
  });

  it("allows followUpNote to be omitted or null when followUpRequired is false", () => {
    const resNull = validateActionInput({
      ...validPayload,
      followUpRequired: false,
      followUpNote: null,
    });
    expect(resNull.ok).toBe(true);

    const resUndefined = validateActionInput({
      ...validPayload,
      followUpRequired: false,
      followUpNote: undefined,
    });
    expect(resUndefined.ok).toBe(true);
  });

  it("rejects attachmentNotes longer than 500 characters and accepts up to 500 characters", () => {
    const resTooLong = validateActionInput({
      ...validPayload,
      attachmentNotes: "x".repeat(501),
    });
    expect(resTooLong.ok).toBe(false);
    if (resTooLong.ok) throw new Error("Expected ok: false");
    expect(resTooLong.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "attachmentNotes", code: "VALIDATION_ERROR" }),
      ])
    );

    const resExact500 = validateActionInput({
      ...validPayload,
      attachmentNotes: "x".repeat(500),
    });
    expect(resExact500.ok).toBe(true);
  });
});
