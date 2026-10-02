import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { isValidStatusTransition } from "../../src/utils/status-transition.js";

describe("UNIT-03: State Machine Transition Logic (BR-14)", () => {
  it("allows valid transitions from NEW", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
  });

  it("allows valid transitions from OPEN", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
  });

  it("allows valid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
  });

  it("allows valid transitions from WAITING_FOR_REQUESTER", () => {
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CLOSED)).toBe(false);
  });

  it("allows valid transitions from RESOLVED", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
  });

  it("allows valid transitions from REOPENED (BR-14 outgoing workflow continuation)", () => {
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CLOSED)).toBe(false);
  });

  it("disallows any transition from terminal states (CLOSED & CANCELLED)", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.REOPENED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.OPEN)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.IN_PROGRESS)).toBe(false);
  });

  it("disallows transitioning to the same status", () => {
    expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
  });
});
