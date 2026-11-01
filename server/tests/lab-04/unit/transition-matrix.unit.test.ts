import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { canTransition } from "../../../src/domain/transition-matrix.js";

describe("UNIT-05: canTransition (BR-10 State Transition Matrix)", () => {
  const allStatuses: TicketStatus[] = [
    TicketStatus.NEW,
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
    TicketStatus.REOPENED,
    TicketStatus.CANCELLED,
  ];

  const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
    NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
    OPEN: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.CANCELLED,
    ],
    IN_PROGRESS: [
      TicketStatus.WAITING_FOR_REQUESTER,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    WAITING_FOR_REQUESTER: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
    REOPENED: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    CLOSED: [],
    CANCELLED: [],
  };

  it("tests all 64 status transition pairs against BR-10", () => {
    let testedCount = 0;

    for (const current of allStatuses) {
      for (const target of allStatuses) {
        testedCount++;
        const shouldBeAllowed = allowedTransitions[current].includes(target);
        const result = canTransition(current, target);

        expect(result).toBe(shouldBeAllowed);
      }
    }

    expect(testedCount).toBe(64);
  });

  it("rejects all same-status transitions (current === target)", () => {
    for (const status of allStatuses) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("confirms CLOSED has no exits", () => {
    for (const target of allStatuses) {
      expect(canTransition(TicketStatus.CLOSED, target)).toBe(false);
    }
  });

  it("confirms CANCELLED has no exits", () => {
    for (const target of allStatuses) {
      expect(canTransition(TicketStatus.CANCELLED, target)).toBe(false);
    }
  });
});
