import { ValidationResult } from "./errors.js";

/**
 * BR-05: Action Date/Time Boundaries
 * - Cannot precede ticket creation time (actionDateTime >= ticket.createdAt)
 * - Cannot be in the future relative to server time, with a tolerance window of at most 60 seconds (actionDateTime <= now + 60s)
 * - Error code: INVALID_ACTION_DATE
 */
export function validateActionDate(
  actionDateTime: Date | string,
  ticketCreatedAt: Date | string,
  now: Date = new Date()
): ValidationResult {
  const actionDate = actionDateTime instanceof Date ? actionDateTime : new Date(actionDateTime);
  const ticketDate = ticketCreatedAt instanceof Date ? ticketCreatedAt : new Date(ticketCreatedAt);
  const nowDate = now instanceof Date ? now : new Date(now);

  if (isNaN(actionDate.getTime())) {
    return {
      ok: false,
      errors: [
        {
          field: "actionDateTime",
          code: "INVALID_ACTION_DATE",
          message: "Action date/time is invalid.",
        },
      ],
    };
  }

  if (isNaN(ticketDate.getTime())) {
    return {
      ok: false,
      errors: [
        {
          field: "ticketCreatedAt",
          code: "INVALID_ACTION_DATE",
          message: "Ticket creation date is invalid.",
        },
      ],
    };
  }

  const actionTime = actionDate.getTime();
  const ticketTime = ticketDate.getTime();
  const maxAllowedTime = nowDate.getTime() + 60 * 1000; // 60s tolerance

  if (actionTime < ticketTime) {
    return {
      ok: false,
      errors: [
        {
          field: "actionDateTime",
          code: "INVALID_ACTION_DATE",
          message: "Action date/time cannot precede ticket creation time.",
        },
      ],
    };
  }

  if (actionTime > maxAllowedTime) {
    return {
      ok: false,
      errors: [
        {
          field: "actionDateTime",
          code: "INVALID_ACTION_DATE",
          message: "Action date/time cannot exceed 60 seconds into the future.",
        },
      ],
    };
  }

  return { ok: true };
}
