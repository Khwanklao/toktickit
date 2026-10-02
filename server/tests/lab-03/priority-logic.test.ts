import { describe, it, expect } from "vitest";
import { Priority } from "@prisma/client";
import { updateItPriority, isValidPriority } from "../../src/utils/priority-logic.js";

describe("UNIT-02: Priority Decoupling Logic (BR-12)", () => {
  it("preserves original requestedPriority when updating itPriority", () => {
    const initialRequested: Priority = Priority.LOW;
    const result = updateItPriority(initialRequested, Priority.URGENT);

    expect(result.requestedPriority).toBe(Priority.LOW);
    expect(result.itPriority).toBe(Priority.URGENT);
  });

  it("validates priority enums correctly", () => {
    expect(isValidPriority("LOW")).toBe(true);
    expect(isValidPriority("MEDIUM")).toBe(true);
    expect(isValidPriority("HIGH")).toBe(true);
    expect(isValidPriority("URGENT")).toBe(true);
    expect(isValidPriority("SUPER_HIGH")).toBe(false);
    expect(isValidPriority("CRITICAL")).toBe(false);
  });
});
