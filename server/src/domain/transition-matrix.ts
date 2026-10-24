import { TicketStatus } from "@prisma/client";

/**
 * BR-10: State Transition Matrix
 * Permitted transitions:
 * - NEW -> OPEN, CANCELLED
 * - OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
 * - IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED -> CLOSED, REOPENED
 * - REOPENED -> IN_PROGRESS, RESOLVED, CANCELLED
 * - CLOSED -> (terminal, none)
 * - CANCELLED -> (terminal, none)
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
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

export function canTransition(
  current: TicketStatus,
  target: TicketStatus
): boolean {
  if (current === target) {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed) {
    return false;
  }
  return allowed.includes(target);
}
