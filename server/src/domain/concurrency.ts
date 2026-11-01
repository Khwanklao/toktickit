import { ValidationError } from "./errors.js";

/**
 * BR-16: Optimistic Concurrency Control
 * When expectedUpdatedAt is provided, compare epoch milliseconds:
 *   new Date(expectedUpdatedAt).getTime() === currentRecord.updatedAt.getTime()
 * - omitted / null / undefined => returns false (not stale)
 * - epoch milliseconds match => returns false (not stale)
 * - mismatch by >= 1 ms => returns true (stale)
 * - invalid date format => throws ValidationError (VALIDATION_ERROR)
 */
export function isStale(
  expectedUpdatedAt?: Date | string | null,
  currentUpdatedAt?: Date | string
): boolean {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === null) {
    return false;
  }

  const expectedDate =
    expectedUpdatedAt instanceof Date ? expectedUpdatedAt : new Date(expectedUpdatedAt);
  if (isNaN(expectedDate.getTime())) {
    throw new ValidationError("Invalid date format for expectedUpdatedAt.", [
      {
        field: "expectedUpdatedAt",
        code: "VALIDATION_ERROR",
        message: "Invalid date format for expectedUpdatedAt.",
      },
    ]);
  }

  if (currentUpdatedAt === undefined || currentUpdatedAt === null) {
    return false;
  }

  const currentDate =
    currentUpdatedAt instanceof Date ? currentUpdatedAt : new Date(currentUpdatedAt);
  if (isNaN(currentDate.getTime())) {
    throw new ValidationError("Invalid date format for currentUpdatedAt.", [
      {
        field: "currentUpdatedAt",
        code: "VALIDATION_ERROR",
        message: "Invalid date format for currentUpdatedAt.",
      },
    ]);
  }

  return expectedDate.getTime() !== currentDate.getTime();
}
