import { Router, Request, Response } from "express";
import { Role, TicketStatus, Priority } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { authenticateUser, requireRole } from "../utils/auth.js";
import { isValidStatusTransition } from "../utils/status-transition.js";
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
      } = req.query;

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

      // Validate enums
      if (status !== undefined && status !== "") {
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

      if (status) {
        where.status = status as TicketStatus;
      }

      if (itPriority) {
        where.itPriority = itPriority as Priority;
      }

      if (ownerId !== undefined && ownerId !== "") {
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
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const { status } = req.body || {};

      if (!status || !Object.values(TicketStatus).includes(status as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid status value: ${status}`,
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

      if (!isValidStatusTransition(existingTicket.status, status as TicketStatus)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid status transition from ${existingTicket.status} to ${status}`,
          },
        });
      }

      const updatedTicket = await prisma.$transaction(async (tx) => {
        return await tx.ticket.update({
          where: { id: ticketId },
          data: { status: status as TicketStatus },
        });
      });

      return res.status(200).json({
        ticketId: updatedTicket.id,
        status: updatedTicket.status,
        updatedAt: updatedTicket.updatedAt.toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update ticket status",
        },
      });
    }
  }
);
