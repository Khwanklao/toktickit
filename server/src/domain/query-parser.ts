import { TicketStatus } from "@prisma/client";
import { ValidationError, ValidationErrorDetail } from "./errors.js";

export interface QueueFilterQuery {
  status?: string;
  group?: string;
  ownerId?: string;
  activeOnly?: string;
  [key: string]: any;
}

export interface ParsedQueueFilters {
  status?: TicketStatus;
  group?: "open";
  ownerId?: string;
  activeOnly?: boolean;
}

/**
 * UNIT-08 / Sec 5.3: Queue Query Filter Parser
 * - status: valid enum only
 * - group: only 'open'
 * - ownerId: 'me' resolves to currentUserId; 'unassigned' and UUID pass through
 * - activeOnly: only 'true'
 * - Throws ValidationError when:
 *   - group and status are both present
 *   - group is not 'open'
 *   - status is invalid
 *   - activeOnly is any value other than 'true'
 */
export function parseQueueFilters(
  query: QueueFilterQuery = {},
  currentUserId: string
): ParsedQueueFilters {
  const errors: ValidationErrorDetail[] = [];
  const result: ParsedQueueFilters = {};

  // Check mutually exclusive group and status
  if (query.group !== undefined && query.status !== undefined) {
    errors.push({
      field: "group",
      code: "VALIDATION_ERROR",
      message: "Cannot provide both 'group' and 'status' filters simultaneously.",
    });
  }

  // Parse group
  if (query.group !== undefined) {
    if (query.group === "open") {
      result.group = "open";
    } else {
      errors.push({
        field: "group",
        code: "VALIDATION_ERROR",
        message: "Group filter supports only the value 'open'.",
      });
    }
  }

  // Parse status
  if (query.status !== undefined) {
    if (Object.values(TicketStatus).includes(query.status as TicketStatus)) {
      result.status = query.status as TicketStatus;
    } else {
      errors.push({
        field: "status",
        code: "VALIDATION_ERROR",
        message: `Invalid status '${query.status}'. Must be one of ${Object.values(TicketStatus).join(", ")}.`,
      });
    }
  }

  // Parse ownerId
  if (query.ownerId !== undefined) {
    if (query.ownerId === "me") {
      result.ownerId = currentUserId;
    } else {
      result.ownerId = query.ownerId;
    }
  }

  // Parse activeOnly
  if (query.activeOnly !== undefined) {
    if (query.activeOnly === "true") {
      result.activeOnly = true;
    } else {
      errors.push({
        field: "activeOnly",
        code: "VALIDATION_ERROR",
        message: "activeOnly supports only the value 'true'.",
      });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("Invalid queue filter query parameters.", errors);
  }

  return result;
}
