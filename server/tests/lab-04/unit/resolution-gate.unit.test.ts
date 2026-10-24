import { describe, it, expect } from "vitest";
import { canResolve } from "../../../src/domain/resolution-gate.js";

describe("UNIT-03: canResolve (BR-12 Resolution Gate)", () => {
  const reopenTime = new Date("2026-10-25T12:00:00.000Z");

  it("returns false when ticket has 0 actions", () => {
    expect(canResolve([], null)).toBe(false);
    expect(canResolve([], undefined)).toBe(false);
    expect(canResolve([], reopenTime)).toBe(false);
  });

  it("returns true when reopenedAt is null and at least 1 action exists", () => {
    const actions = [
      {
        createdAt: new Date("2026-10-25T10:00:00.000Z"),
        actionDateTime: new Date("2026-10-25T09:30:00.000Z"),
      },
    ];
    expect(canResolve(actions, null)).toBe(true);
    expect(canResolve(actions, undefined)).toBe(true);
  });

  it("returns true when reopenedAt is set and at least 1 action has createdAt > reopenedAt", () => {
    const actions = [
      {
        createdAt: new Date("2026-10-25T11:00:00.000Z"), // before reopen
        actionDateTime: new Date("2026-10-25T11:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-10-25T12:05:00.000Z"), // after reopen
        actionDateTime: new Date("2026-10-25T12:05:00.000Z"),
      },
    ];
    expect(canResolve(actions, reopenTime)).toBe(true);
  });

  it("returns false when reopenedAt is set and all actions have createdAt <= reopenedAt", () => {
    const actions = [
      {
        createdAt: new Date("2026-10-25T11:00:00.000Z"),
        actionDateTime: new Date("2026-10-25T11:00:00.000Z"),
      },
      {
        createdAt: reopenTime, // exactly at reopenedAt
        actionDateTime: reopenTime,
      },
    ];
    expect(canResolve(actions, reopenTime)).toBe(false);
  });

  it("returns false when actionDateTime is after reopenedAt but createdAt is before reopenedAt (never use actionDateTime)", () => {
    const actions = [
      {
        // Created in DB before reopen, but backdated or claim time after reopen
        createdAt: new Date("2026-10-25T11:55:00.000Z"),
        actionDateTime: new Date("2026-10-25T12:30:00.000Z"),
      },
    ];
    expect(canResolve(actions, reopenTime)).toBe(false);
  });

  it("handles string ISO timestamps correctly", () => {
    const actions = [
      {
        createdAt: "2026-10-25T13:00:00.000Z",
        actionDateTime: "2026-10-25T13:00:00.000Z",
      },
    ];
    expect(canResolve(actions, "2026-10-25T12:00:00.000Z")).toBe(true);
  });
});
