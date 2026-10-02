import { Priority } from "@prisma/client";

/**
 * BR-12: Priority Decoupling Logic.
 * requestedPriority is immutable after creation.
 * itPriority can be updated independently by IT Staff without altering requestedPriority.
 */
export function updateItPriority(
  originalRequestedPriority: Priority,
  newItPriority: Priority
): { requestedPriority: Priority; itPriority: Priority } {
  return {
    requestedPriority: originalRequestedPriority,
    itPriority: newItPriority,
  };
}

export function isValidPriority(priority: string): priority is Priority {
  return Object.values(Priority).includes(priority as Priority);
}
