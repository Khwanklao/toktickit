import { TicketStatus } from "@prisma/client";

export interface TicketSummary {
  id?: number;
  status: TicketStatus;
  ownerId?: string | null;
}

export interface StaffMetrics {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingRequesterTickets: number;
  myAssignedTickets: number;
}

export interface RequesterMetrics {
  activeTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

/**
 * UNIT-06 / BR-14: Staff Operational Metrics
 * - newTickets: status == 'NEW'
 * - openTickets: status IN ('OPEN', 'REOPENED')
 * - inProgressTickets: status == 'IN_PROGRESS'
 * - waitingRequesterTickets: status == 'WAITING_FOR_REQUESTER'
 * - myAssignedTickets: ownerId == currentUserId && status NOT IN ('CLOSED', 'CANCELLED')
 */
export function calculateStaffMetrics(
  tickets: TicketSummary[],
  currentUserId: string
): StaffMetrics {
  let newTickets = 0;
  let openTickets = 0;
  let inProgressTickets = 0;
  let waitingRequesterTickets = 0;
  let myAssignedTickets = 0;

  for (const t of tickets) {
    if (t.status === TicketStatus.NEW) {
      newTickets++;
    } else if (
      t.status === TicketStatus.OPEN ||
      t.status === TicketStatus.REOPENED
    ) {
      openTickets++;
    }

    if (t.status === TicketStatus.IN_PROGRESS) {
      inProgressTickets++;
    }

    if (t.status === TicketStatus.WAITING_FOR_REQUESTER) {
      waitingRequesterTickets++;
    }

    if (
      t.ownerId === currentUserId &&
      t.status !== TicketStatus.CLOSED &&
      t.status !== TicketStatus.CANCELLED
    ) {
      myAssignedTickets++;
    }
  }

  return {
    newTickets,
    openTickets,
    inProgressTickets,
    waitingRequesterTickets,
    myAssignedTickets,
  };
}

/**
 * UNIT-07 / BR-13: Requester Summary Metrics
 * - activeTickets: status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')
 * - inProgressTickets: status == 'IN_PROGRESS'
 * - resolvedTickets: status == 'RESOLVED'
 * - closedTickets: status == 'CLOSED'
 */
export function calculateRequesterMetrics(
  tickets: TicketSummary[]
): RequesterMetrics {
  let activeTickets = 0;
  let inProgressTickets = 0;
  let resolvedTickets = 0;
  let closedTickets = 0;

  const activeStatuses = new Set<TicketStatus>([
    TicketStatus.NEW,
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.REOPENED,
  ]);

  for (const t of tickets) {
    if (activeStatuses.has(t.status)) {
      activeTickets++;
    }
    if (t.status === TicketStatus.IN_PROGRESS) {
      inProgressTickets++;
    }
    if (t.status === TicketStatus.RESOLVED) {
      resolvedTickets++;
    }
    if (t.status === TicketStatus.CLOSED) {
      closedTickets++;
    }
  }

  return {
    activeTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
  };
}

/**
 * Needs-attention indicator:
 * True strictly for tickets with status == WAITING_FOR_REQUESTER
 */
export function checkNeedsAttention(ticket: { status: TicketStatus }): boolean {
  return ticket.status === TicketStatus.WAITING_FOR_REQUESTER;
}
