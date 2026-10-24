export interface ActionRecord {
  createdAt: Date | string;
  actionDateTime?: Date | string;
}

/**
 * BR-12: Resolution Gate
 * Transitioning a ticket to RESOLVED requires that actionsTaken.count >= 1.
 * If ticket.reopenedAt is not null, at least one action must have database creation time createdAt > ticket.reopenedAt.
 * (never use actionDateTime to prevent retrospective backdating bypass).
 */
export function canResolve(
  actions: ActionRecord[],
  reopenedAt?: Date | string | null
): boolean {
  if (!actions || actions.length === 0) {
    return false;
  }

  if (reopenedAt === null || reopenedAt === undefined) {
    return true;
  }

  const reopenDate = reopenedAt instanceof Date ? reopenedAt : new Date(reopenedAt);
  const reopenTime = reopenDate.getTime();

  if (isNaN(reopenTime)) {
    return false;
  }

  return actions.some((action) => {
    const actionCreatedDate =
      action.createdAt instanceof Date ? action.createdAt : new Date(action.createdAt);
    return actionCreatedDate.getTime() > reopenTime;
  });
}
