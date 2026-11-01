import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import {
  calculateStaffMetrics,
  calculateRequesterMetrics,
  checkNeedsAttention,
  TicketSummary,
} from "../../../src/domain/dashboard-metrics.js";

describe("UNIT-06 & UNIT-07: Dashboard Metrics (BR-13, BR-14, Sec 5.3)", () => {
  const staffUserId = "staff-user-1";
  const otherUserId = "staff-user-2";

  const sampleTickets: TicketSummary[] = [
    { id: 1, status: TicketStatus.NEW, ownerId: null },
    { id: 2, status: TicketStatus.NEW, ownerId: staffUserId },
    { id: 3, status: TicketStatus.OPEN, ownerId: staffUserId },
    { id: 4, status: TicketStatus.OPEN, ownerId: otherUserId },
    { id: 5, status: TicketStatus.REOPENED, ownerId: staffUserId },
    { id: 6, status: TicketStatus.IN_PROGRESS, ownerId: staffUserId },
    { id: 7, status: TicketStatus.IN_PROGRESS, ownerId: otherUserId },
    { id: 8, status: TicketStatus.WAITING_FOR_REQUESTER, ownerId: staffUserId },
    { id: 9, status: TicketStatus.RESOLVED, ownerId: staffUserId },
    { id: 10, status: TicketStatus.CLOSED, ownerId: staffUserId },
    { id: 11, status: TicketStatus.CANCELLED, ownerId: staffUserId },
  ];

  describe("calculateStaffMetrics (UNIT-06)", () => {
    it("calculates staff metrics correctly across mixed tickets", () => {
      const metrics = calculateStaffMetrics(sampleTickets, staffUserId);

      // new: 2 (id 1, 2)
      expect(metrics.newTickets).toBe(2);
      // open: OPEN (id 3, 4) + REOPENED (id 5) = 3
      expect(metrics.openTickets).toBe(3);
      // inProgress: 2 (id 6, 7)
      expect(metrics.inProgressTickets).toBe(2);
      // waitingRequester: 1 (id 8)
      expect(metrics.waitingRequesterTickets).toBe(1);
      // myAssigned: ownerId === staffUserId && status not CLOSED/CANCELLED:
      // (id 2 [NEW], id 3 [OPEN], id 5 [REOPENED], id 6 [IN_PROGRESS], id 8 [WAITING_FOR_REQUESTER], id 9 [RESOLVED]) = 6
      expect(metrics.myAssignedTickets).toBe(6);
    });

    it("returns all zeros for empty tickets array", () => {
      const metrics = calculateStaffMetrics([], staffUserId);
      expect(metrics).toEqual({
        newTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        waitingRequesterTickets: 0,
        myAssignedTickets: 0,
      });
    });
  });

  describe("calculateRequesterMetrics (UNIT-07)", () => {
    it("calculates requester metrics correctly across mixed tickets", () => {
      const requesterTickets: TicketSummary[] = [
        { id: 101, status: TicketStatus.NEW },
        { id: 102, status: TicketStatus.OPEN },
        { id: 103, status: TicketStatus.IN_PROGRESS },
        { id: 104, status: TicketStatus.IN_PROGRESS },
        { id: 105, status: TicketStatus.WAITING_FOR_REQUESTER },
        { id: 106, status: TicketStatus.REOPENED },
        { id: 107, status: TicketStatus.RESOLVED },
        { id: 108, status: TicketStatus.RESOLVED },
        { id: 109, status: TicketStatus.CLOSED },
        { id: 110, status: TicketStatus.CLOSED },
        { id: 111, status: TicketStatus.CANCELLED },
      ];

      const metrics = calculateRequesterMetrics(requesterTickets);

      // activeTickets: NEW (1), OPEN (1), IN_PROGRESS (2), WAITING_FOR_REQUESTER (1), REOPENED (1) = 6
      expect(metrics.activeTickets).toBe(6);
      // inProgress: 2
      expect(metrics.inProgressTickets).toBe(2);
      // resolved: 2
      expect(metrics.resolvedTickets).toBe(2);
      // closed: 2
      expect(metrics.closedTickets).toBe(2);
    });

    it("returns all zeros for empty tickets array", () => {
      const metrics = calculateRequesterMetrics([]);
      expect(metrics).toEqual({
        activeTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
      });
    });
  });

  describe("checkNeedsAttention (UNIT-06 / UNIT-07)", () => {
    it("returns true only for WAITING_FOR_REQUESTER", () => {
      expect(checkNeedsAttention({ status: TicketStatus.WAITING_FOR_REQUESTER })).toBe(true);
    });

    it("returns false for all other 7 statuses", () => {
      const otherStatuses: TicketStatus[] = [
        TicketStatus.NEW,
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.REOPENED,
        TicketStatus.CANCELLED,
      ];

      for (const st of otherStatuses) {
        expect(checkNeedsAttention({ status: st })).toBe(false);
      }
    });
  });
});
