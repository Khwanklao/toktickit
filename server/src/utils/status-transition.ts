import { TicketStatus } from "@prisma/client";

/**
 * BR-14: State Transition Matrix
 * Explicit lookup table defining allowed target statuses from a given current status.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

/**
 * Returns true if changing ticket status from `currentStatus` to `targetStatus` is permitted by BR-14.
 */
export function isValidStatusTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus
): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(targetStatus);
}
