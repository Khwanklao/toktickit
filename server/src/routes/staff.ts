import { Router, Request, Response } from "express";
import { Role, TicketStatus, Priority } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { authenticateUser, requireRole } from "../utils/auth.js";
import { isValidStatusTransition } from "../utils/status-transition.js";
import { canTransition, canResolve, isStale, ValidationError, parseQueueFilters, ParsedQueueFilters } from "../domain/index.js";
import { AuthenticatedRequest } from "../utils/auth.js";
import { isValidPriority } from "../utils/priority-logic.js";

export const staffRouter = Router();

const VALID_SORT_FIELDS = ["createdAt", "ticketNumber", "itPriority", "status"];
const VALID_SORT_ORDERS = ["asc", "desc"];

/**
 * GET /api/staff/queue
 * Access: IT_STAFF, ADMINISTRATOR (read-only audit)
 */
staffRouter.get(
  "/queue",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const {
        page = "1",
        limit = "10",
        search,
        categoryId,
        status,
        itPriority,
        ownerId,
        sortBy = "createdAt",
        sortOrder = "desc",
        group,
        activeOnly,
      } = req.query;

      // Parse and validate Lab 4 new queue filters (Sec 5.3, UNIT-08)
      let parsedFilters: ParsedQueueFilters = {};
      if (group !== undefined || activeOnly !== undefined || ownerId === "me") {
        try {
          parsedFilters = parseQueueFilters(req.query, user.id);
        } catch (err: any) {
          if (err instanceof ValidationError) {
            return res.status(400).json({
              error: {
                code: "VALIDATION_ERROR",
                message: err.message,
                details: err.errors,
              },
            });
          }
          throw err;
        }
      }

      // Validate numeric pagination parameters
      const parsedPage = Number(page);
      const parsedLimit = Number(limit);

      if (
        isNaN(parsedPage) ||
        !Number.isInteger(parsedPage) ||
        parsedPage < 1 ||
        isNaN(parsedLimit) ||
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 100
      ) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid page or limit parameter. Page must be >= 1, limit between 1 and 100.",
          },
        });
      }

      // Validate status enum for legacy Lab 3
      if (status !== undefined && status !== "" && group === undefined) {
        if (!Object.values(TicketStatus).includes(status as TicketStatus)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: `Invalid status parameter: ${status}`,
            },
          });
        }
      }

      if (itPriority !== undefined && itPriority !== "") {
        if (!isValidPriority(itPriority as string)) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: `Invalid itPriority parameter: ${itPriority}`,
            },
          });
        }
      }

      if (sortBy && !VALID_SORT_FIELDS.includes(sortBy as string)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid sortBy parameter: ${sortBy}`,
          },
        });
      }

      if (sortOrder && !VALID_SORT_ORDERS.includes(sortOrder as string)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid sortOrder parameter: ${sortOrder}`,
          },
        });
      }

      const prisma = getPrisma();
      const where: any = {};

      if (typeof search === "string") {
        const trimmed = search.trim();
        if (trimmed.length > 0) {
          where.OR = [
            { ticketNumber: { contains: trimmed, mode: "insensitive" } },
            { summary: { contains: trimmed, mode: "insensitive" } },
          ];
        }
      }

      if (categoryId !== undefined && categoryId !== "") {
        const catIdNum = Number(categoryId);
        if (!isNaN(catIdNum)) {
          where.categoryId = catIdNum;
        }
      }

      // Status & Group filtering
      if (parsedFilters.group === "open") {
        where.status = { in: [TicketStatus.OPEN, TicketStatus.REOPENED] };
      } else if (status) {
        where.status = status as TicketStatus;
      }

      // ActiveOnly filter
      if (parsedFilters.activeOnly) {
        if (!where.status) {
          where.status = { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] };
        }
      }

      // itPriority filter
      if (itPriority) {
        where.itPriority = itPriority as Priority;
      }

      // Owner filter
      if (parsedFilters.ownerId !== undefined) {
        where.ownerId = parsedFilters.ownerId;
      } else if (ownerId !== undefined && ownerId !== "") {
        if (ownerId === "unassigned") {
          where.ownerId = null;
        } else {
          where.ownerId = String(ownerId);
        }
      }

      const effectiveSortBy = (sortBy as string) || "createdAt";
      const effectiveSortOrder = (sortOrder as string) || "desc";

      let orderBy: any[];
      if (effectiveSortBy === "ticketNumber") {
        orderBy = [{ ticketNumber: effectiveSortOrder }];
      } else {
        orderBy = [{ [effectiveSortBy]: effectiveSortOrder }, { ticketNumber: "desc" }];
      }

      const skip = (parsedPage - 1) * parsedLimit;

      const [tickets, totalRecords] = await Promise.all([
        prisma.ticket.findMany({
          where,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            requestedPriority: true,
            itPriority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            isRequesterResolved: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requester: { select: { id: true, name: true, email: true } },
            owner: { select: { id: true, name: true, email: true } },
          },
          orderBy,
          skip,
          take: parsedLimit,
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = Math.ceil(totalRecords / parsedLimit);

      const formattedData = tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.summary,
        summary: t.summary,
        category: t.category,
        relatedSystem: t.relatedSystem,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.status,
        isRequesterResolved: t.isRequesterResolved,
        owner: t.owner,
        requester: t.requester,
        createdAt: t.createdAt.toISOString(),
      }));

      return res.status(200).json({
        data: formattedData,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          totalRecords,
          totalPages,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch staff ticket queue",
        },
      });
    }
  }
);

/**
 * PATCH /api/staff/tickets/:id/assign
 * Access: IT_STAFF only (Admin -> 403 Forbidden)
 */
staffRouter.patch(
  "/tickets/:id/assign",
  authenticateUser,
  requireRole(Role.IT_STAFF),
  async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const ticketId = Number(idParam);
      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const { ownerId } = req.body || {};

      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      let newOwnerId: string | null = null;

      if (ownerId !== null && ownerId !== undefined) {
        const targetUser = await prisma.user.findUnique({
          where: { id: String(ownerId) },
        });

        if (!targetUser || !targetUser.isActive || targetUser.role === Role.REQUESTER) {
          return res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Assignee must be an active IT Staff or Administrator user.",
            },
          });
        }
        newOwnerId = targetUser.id;
      }

      const updatedTicket = await prisma.$transaction(async (tx) => {
        const updateData: any = { ownerId: newOwnerId };

        // Side effect: if status is NEW and assigning an owner (non-null), transition status to OPEN
        if (existingTicket.status === TicketStatus.NEW && newOwnerId !== null) {
          updateData.status = TicketStatus.OPEN;
        }

        return await tx.ticket.update({
          where: { id: ticketId },
          data: updateData,
        });
      });

      return res.status(200).json({
        ticketId: updatedTicket.id,
        ownerId: updatedTicket.ownerId,
        status: updatedTicket.status,
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign ticket owner",
        },
      });
    }
  }
);

/**
 * PATCH /api/staff/tickets/:id/priority
 * Access: IT_STAFF only (Admin -> 403 Forbidden)
 */
staffRouter.patch(
  "/tickets/:id/priority",
  authenticateUser,
  requireRole(Role.IT_STAFF),
  async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const ticketId = Number(idParam);
      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const { itPriority } = req.body || {};

      if (!itPriority || !isValidPriority(itPriority)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid itPriority: ${itPriority}`,
          },
        });
      }

      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const updatedTicket = await prisma.$transaction(async (tx) => {
        return await tx.ticket.update({
          where: { id: ticketId },
          data: { itPriority: itPriority as Priority },
        });
      });

      return res.status(200).json({
        ticketId: updatedTicket.id,
        requestedPriority: updatedTicket.requestedPriority,
        itPriority: updatedTicket.itPriority,
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update IT priority",
        },
      });
    }
  }
);

/**
 * PATCH /api/staff/tickets/:id/status
 * Access: IT_STAFF only (Admin -> 403 Forbidden)
 */
staffRouter.patch(
  "/tickets/:id/status",
  authenticateUser,
  requireRole(Role.IT_STAFF),
  async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const ticketId = Number(idParam);
      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found", details: [] },
        });
      }

      const { status, expectedUpdatedAt } = req.body || {};

      if (!status || !Object.values(TicketStatus).includes(status as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid status value: ${status}`,
            details: [],
          },
        });
      }

      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found", details: [] },
        });
      }

      if (!canTransition(existingTicket.status, status as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid status transition from ${existingTicket.status} to ${status}`,
            details: [],
          },
        });
      }

      // Concurrency check (BR-16)
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null) {
        try {
          if (isStale(expectedUpdatedAt, existingTicket.updatedAt)) {
            return res.status(409).json({
              error: {
                code: "STALE_UPDATE",
                message: "Ticket has been modified by another transaction.",
                details: [],
              },
            });
          }
        } catch (err: any) {
          if (err instanceof ValidationError) {
            return res.status(400).json({
              error: {
                code: "VALIDATION_ERROR",
                message: err.message,
                details: err.errors || [],
              },
            });
          }
          throw err;
        }
      }

      // Resolution Gate check (BR-12)
      if (status === TicketStatus.RESOLVED) {
        const actions = await prisma.actionTaken.findMany({
          where: { ticketId },
          select: { createdAt: true },
        });

        if (!canResolve(actions, existingTicket.reopenedAt)) {
          return res.status(400).json({
            error: {
              code: "RESOLUTION_ACTION_REQUIRED",
              message: "Transition to RESOLVED requires at least one qualifying Action Taken.",
              details: [],
            },
          });
        }
      }

      const targetStatus = status as TicketStatus;
      const now = new Date();
      const updateData: any = {
        status: targetStatus,
        updatedAt: now,
      };

      if (targetStatus === TicketStatus.REOPENED) {
        updateData.reopenedAt = now;
        updateData.isRequesterResolved = false;
      }

      const updatedTicket = await prisma.$transaction(async (tx) => {
        const count = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            updatedAt: existingTicket.updatedAt,
          },
          data: updateData,
        });

        if (count.count === 0) {
          const err = new Error("STALE_UPDATE");
          (err as any).code = "STALE_UPDATE";
          throw err;
        }

        return await tx.ticket.findUnique({
          where: { id: ticketId },
        });
      });

      return res.status(200).json({
        ticketId: updatedTicket!.id,
        status: updatedTicket!.status,
        reopenedAt: updatedTicket!.reopenedAt ? updatedTicket!.reopenedAt.toISOString() : null,
        isRequesterResolved: updatedTicket!.isRequesterResolved,
        updatedAt: updatedTicket!.updatedAt.toISOString(),
      });
    } catch (error: any) {
      if (error?.code === "STALE_UPDATE" || error?.message === "STALE_UPDATE") {
        return res.status(409).json({
          error: {
            code: "STALE_UPDATE",
            message: "Ticket has been modified by another transaction.",
            details: [],
          },
        });
      }
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update ticket status",
          details: [],
        },
      });
    }
  }
);

/**
 * GET /api/staff/dashboard
 * Access: IT_STAFF, ADMINISTRATOR (Requester -> 403 Forbidden, Unauth -> 401 Unauthorized)
 */
staffRouter.get(
  "/dashboard",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const prisma = getPrisma();

      // 1. GroupBy status for all tickets (database calculation)
      const statusCounts = await prisma.ticket.groupBy({
        by: ["status"],
        _count: { id: true },
      });

      let newTickets = 0;
      let openTickets = 0;
      let inProgressTickets = 0;
      let waitingRequesterTickets = 0;

      for (const group of statusCounts) {
        const count = group._count.id;
        if (group.status === TicketStatus.NEW) {
          newTickets += count;
        } else if (group.status === TicketStatus.OPEN || group.status === TicketStatus.REOPENED) {
          openTickets += count;
        } else if (group.status === TicketStatus.IN_PROGRESS) {
          inProgressTickets += count;
        } else if (group.status === TicketStatus.WAITING_FOR_REQUESTER) {
          waitingRequesterTickets += count;
        }
      }

      // 2. Count my assigned active tickets
      const myAssignedTickets = await prisma.ticket.count({
        where: {
          ownerId: user.id,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      });

      // 3. Recent 5 queue updates
      const recentTickets = await prisma.ticket.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          status: true,
          itPriority: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.status(200).json({
        metrics: {
          newTickets,
          openTickets,
          inProgressTickets,
          waitingRequesterTickets,
          myAssignedTickets,
        },
        recentQueueUpdates: recentTickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          summary: t.summary,
          status: t.status,
          itPriority: t.itPriority,
          owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
          updatedAt: t.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch staff dashboard" },
      });
    }
  }
);
