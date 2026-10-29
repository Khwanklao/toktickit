import { Router, Request, Response } from "express";
import { Role, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { authenticateUser, requireRole, AuthenticatedRequest } from "../utils/auth.js";
import { checkNeedsAttention } from "../domain/index.js";

export const requesterRouter = Router();

/**
 * GET /api/requester/dashboard
 * Access: Requester ONLY (Staff & Admin -> 403 Forbidden, Unauth -> 401 Unauthorized)
 */
requesterRouter.get(
  "/dashboard",
  authenticateUser,
  requireRole(Role.REQUESTER),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const prisma = getPrisma();

      // 1. GroupBy status for this requester
      const statusCounts = await prisma.ticket.groupBy({
        by: ["status"],
        where: { requesterId: user.id },
        _count: { id: true },
      });

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

      for (const group of statusCounts) {
        const count = group._count.id;
        if (activeStatuses.has(group.status)) {
          activeTickets += count;
        }
        if (group.status === TicketStatus.IN_PROGRESS) {
          inProgressTickets += count;
        }
        if (group.status === TicketStatus.RESOLVED) {
          resolvedTickets += count;
        }
        if (group.status === TicketStatus.CLOSED) {
          closedTickets += count;
        }
      }

      // 2. Recent 5 requests for this requester
      const recentTickets = await prisma.ticket.findMany({
        where: { requesterId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          status: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({
        metrics: {
          activeTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
        },
        recentRequests: recentTickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          summary: t.summary,
          status: t.status,
          needsAttention: checkNeedsAttention(t),
          updatedAt: t.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch requester dashboard" },
      });
    }
  }
);
