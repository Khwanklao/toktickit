import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Role, TicketStatus } from "@prisma/client";
import { validateActionInput, validateActionDate, isStale, ValidationError } from "../domain/index.js";
import { getPrisma } from "../prisma.js";
import { generateTicketNumber } from "../utils/ticket-number.js";
import { authenticateUser, requireRole, authenticateRequester, AuthenticatedRequest } from "../utils/auth.js";
import { validateAttachmentFile } from "../utils/attachment-validation.js";

export const ticketsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const VALID_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const VALID_SORT_FIELDS = ["createdAt", "updatedAt", "ticketNumber"];
const VALID_SORT_DIRS = ["asc", "desc"];
const ALLOWED_PAGE_SIZES = [10, 25, 50];

ticketsRouter.post("/", authenticateUser, requireRole(Role.REQUESTER), async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const prisma = getPrisma();
    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body || {};
    const errors: Array<{ field: string; message: string }> = [];

    // Validate categoryId
    if (typeof categoryId !== "number" || !Number.isInteger(categoryId)) {
      errors.push({
        field: "categoryId",
        message: "categoryId is required and must be an integer",
      });
    } else {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category || !category.isActive) {
        errors.push({
          field: "categoryId",
          message: "Category is inactive or does not exist",
        });
      }
    }

    // Validate relatedSystemId
    if (typeof relatedSystemId !== "number" || !Number.isInteger(relatedSystemId)) {
      errors.push({
        field: "relatedSystemId",
        message: "relatedSystemId is required and must be an integer",
      });
    } else {
      const system = await prisma.relatedSystem.findUnique({
        where: { id: relatedSystemId },
      });
      if (!system || !system.isActive) {
        errors.push({
          field: "relatedSystemId",
          message: "Related system is inactive or does not exist",
        });
      }
    }

    // Validate summary
    let trimmedSummary = "";
    if (typeof summary !== "string") {
      errors.push({
        field: "summary",
        message: "Summary is required and must be a string",
      });
    } else {
      trimmedSummary = summary.trim();
      if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
        errors.push({
          field: "summary",
          message: "Summary is required and must be between 5 and 100 characters",
        });
      }
    }

    // Validate description
    let trimmedDescription = "";
    if (typeof description !== "string") {
      errors.push({
        field: "description",
        message: "Description is required and must be a string",
      });
    } else {
      trimmedDescription = description.trim();
      if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
        errors.push({
          field: "description",
          message: "Description is required and must be between 10 and 2000 characters",
        });
      }
    }

    // Validate requestedPriority
    if (!requestedPriority || typeof requestedPriority !== "string" || !VALID_PRIORITIES.includes(requestedPriority)) {
      errors.push({
        field: "requestedPriority",
        message: "Requested priority must be one of LOW, MEDIUM, HIGH, URGENT",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        statusCode: 400,
        error: "Bad Request",
        message: "Validation failed",
        errors,
      });
    }

    // Atomic counter & persistence inside transaction
    const ticket = await prisma.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('"Ticket_id_seq"')`;
      const sequenceNum = Number(nextval);

      const ticketNumber = generateTicketNumber(sequenceNum);

      return await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId,
          relatedSystemId,
          summary: trimmedSummary,
          description: trimmedDescription,
          requestedPriority,
          status: "NEW",
          itPriority: null,
        },
      });
    });

    return res.status(201).json({
      ...ticket,
      requesterId: !isNaN(Number(ticket.requesterId)) ? Number(ticket.requesterId) : ticket.requesterId,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to create ticket",
    });
  }
});

ticketsRouter.get("/", authenticateUser, requireRole(Role.REQUESTER), async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const prisma = getPrisma();
    const where: any = {
      requesterId,
    };

    const { search, categoryId, priority, status, sortBy, sortDir, page, pageSize } = req.query;

    if (typeof search === "string") {
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        where.OR = [
          { ticketNumber: { contains: trimmedSearch, mode: "insensitive" } },
          { summary: { contains: trimmedSearch, mode: "insensitive" } },
        ];
      }
    }

    if (categoryId !== undefined && categoryId !== "") {
      const parsedCatId = Number(categoryId);
      if (Number.isInteger(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    }

    if (typeof priority === "string" && VALID_PRIORITIES.includes(priority)) {
      where.requestedPriority = priority;
    }

    if (typeof status === "string" && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const effectiveSortBy = typeof sortBy === "string" && VALID_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";
    const effectiveSortDir = typeof sortDir === "string" && VALID_SORT_DIRS.includes(sortDir) ? sortDir : "desc";

    let orderBy: any[];
    if (effectiveSortBy === "ticketNumber") {
      orderBy = [{ ticketNumber: effectiveSortDir }];
    } else {
      orderBy = [{ [effectiveSortBy]: effectiveSortDir }, { ticketNumber: "desc" }];
    }

    const rawPage = Number(page);
    const effectivePage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

    const rawPageSize = Number(pageSize);
    const effectivePageSize = Number.isInteger(rawPageSize) && ALLOWED_PAGE_SIZES.includes(rawPageSize) ? rawPageSize : 10;

    const skip = (effectivePage - 1) * effectivePageSize;

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          requestedPriority: true,
          itPriority: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy,
        skip,
        take: effectivePageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / effectivePageSize);

    return res.status(200).json({
      data: tickets,
      pagination: {
        page: effectivePage,
        pageSize: effectivePageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch tickets",
    });
  }
});

ticketsRouter.get("/:id", authenticateUser, async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const idParam = req.params.id;
    const ticketId = Number(idParam);

    if (!/^\d+$/.test(idParam) || !Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Ticket not found",
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        requesterId: true,
        summary: true,
        description: true,
        requestedPriority: true,
        itPriority: true,
        status: true,
        isRequesterResolved: true,
        reopenedAt: true,
        createdAt: true,
        updatedAt: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: {
          where: { isRemoved: false },
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
            isRemoved: true,
            removedAt: true,
            removalReason: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }
    if (!ticket || (user.role === Role.REQUESTER && ticket.requesterId !== requesterId)) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Ticket not found",
      });
    }

    const { requesterId: _, ...ticketDetail } = ticket;

    return res.status(200).json({
      ticket: {
        ...ticketDetail,
        title: ticketDetail.summary,
        requester: {
          ...ticketDetail.requester,
          id: !isNaN(Number(ticketDetail.requester.id)) ? Number(ticketDetail.requester.id) : ticketDetail.requester.id,
        },
      },
      ...ticketDetail,
      title: ticketDetail.summary,
      requester: {
        ...ticketDetail.requester,
        id: !isNaN(Number(ticketDetail.requester.id)) ? Number(ticketDetail.requester.id) : ticketDetail.requester.id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch ticket details",
    });
  }
});

ticketsRouter.post("/:id/attachments", authenticateUser, requireRole(Role.REQUESTER), (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err) => {
    try {
      // 1. Header Authentication
      const requesterId = await authenticateRequester(req, res);
      if (requesterId === null) return;

      // 2. Path Parameter Format Check
      const idParam = req.params.id;
      const ticketId = Number(idParam);
      if (!/^\d+$/.test(idParam) || !Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          statusCode: 404,
          error: "Not Found",
          message: "Ticket not found",
        });
      }

      // 3. Resource Existence & Requester Ownership Check
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket || ticket.requesterId !== requesterId) {
        return res.status(404).json({
          statusCode: 404,
          error: "Not Found",
          message: "Ticket not found",
        });
      }

      // 4. Business Rule State Guards (Active Attachment Limit Check: max 5)
      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (activeCount >= 5) {
        return res.status(409).json({
          statusCode: 409,
          error: "Conflict",
          message: "Ticket already has maximum allowed active attachments (5)",
        });
      }

      // 5. Payload / File Content Validation
      if (err) {
        return res.status(400).json({
          statusCode: 400,
          error: "Bad Request",
          message: err.message || "File upload error",
        });
      }

      const validation = validateAttachmentFile(req.file);
      if (!validation.isValid) {
        return res.status(400).json({
          statusCode: 400,
          error: "Bad Request",
          message: validation.message,
        });
      }

      const file = req.file!;
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storedFileName = `${crypto.randomUUID()}-${safeOriginalName}`;
      const filePath = path.join(uploadsDir, storedFileName);

      try {
        fs.writeFileSync(filePath, file.buffer);
      } catch (writeError) {
        return res.status(500).json({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Attachment upload failed. Your ticket was saved — you can retry the upload.",
        });
      }

      try {
        const attachment = await prisma.attachment.create({
          data: {
            ticketId,
            originalFileName: file.originalname,
            storedFileName,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedBy: requesterId,
            isRemoved: false,
          },
        });

        return res.status(201).json({
          id: attachment.id,
          ticketId: attachment.ticketId,
          originalFileName: attachment.originalFileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          createdAt: attachment.createdAt.toISOString(),
          isRemoved: attachment.isRemoved,
        });
      } catch (dbError) {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (_) {}
        }
        return res.status(500).json({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Attachment upload failed. Your ticket was saved — you can retry the upload.",
        });
      }
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Attachment upload failed",
      });
    }
  });
});

/**
 * PATCH /api/tickets/:id/resolve-indication
 * Access: Requester (Owned only)
 */
ticketsRouter.patch(
  "/:id/resolve-indication",
  authenticateUser,
  requireRole(Role.REQUESTER),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }
      const idParam = req.params.id;
      const ticketId = Number(idParam);

      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const prisma = getPrisma();
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existingTicket || existingTicket.requesterId !== user.id) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      // Check terminal status (BR-11)
      if (existingTicket.status === TicketStatus.CLOSED || existingTicket.status === TicketStatus.CANCELLED) {
        return res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot indicate resolution on a closed or cancelled ticket.",
          },
        });
      }

      const now = new Date();
      const updatedTicket = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            isRequesterResolved: true,
            updatedAt: now,
          },
        });

        await tx.publicComment.create({
          data: {
            ticketId,
            authorId: user.id,
            content: "[System] Requester indicated that the problem appears resolved.",
          },
        });

        return ticket;
      });

      return res.status(200).json({
        message: "Problem indicated as resolved by requester.",
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          isRequesterResolved: updatedTicket.isRequesterResolved,
          updatedAt: updatedTicket.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set requester resolve indication",
        },
      });
    }
  }
);

/**
 * GET /api/tickets/:id/comments
 * Access: Requester (Owned only), IT Staff, Administrator
 */
ticketsRouter.get("/:id/comments", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket || (user.role === Role.REQUESTER && ticket.requesterId !== user.id)) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      comments: comments.map((c) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch comments" },
    });
  }
});

/**
 * POST /api/tickets/:id/comments
 * Access: Requester (Owned only), IT Staff, Administrator
 */
ticketsRouter.post("/:id/comments", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }
    const idParam = req.params.id;
    const ticketId = Number(idParam);

    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket || (user.role === Role.REQUESTER && ticket.requesterId !== user.id)) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { content } = req.body || {};
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Comment content must be non-empty and up to 2,000 characters.",
        },
      });
    }

    const comment = await prisma.$transaction(async (tx) => {
      return await tx.publicComment.create({
        data: {
          ticketId,
          authorId: user.id,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, name: true, role: true },
          },
        },
      });
    });

    return res.status(201).json({
      comment: {
        id: comment.id,
        authorId: comment.authorId,
        author: comment.author,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create comment" },
    });
  }
});

/**
 * GET /api/tickets/:id/internal-notes
 * Access: IT Staff, Administrator ONLY (Requester -> 403 Forbidden, 0 leakage)
 */
ticketsRouter.get(
  "/:id/internal-notes",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const ticketId = Number(idParam);

      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return res.status(200).json({
        notes: notes.map((n) => ({
          id: n.id,
          author: n.author,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch internal notes" },
      });
    }
  }
);

/**
 * POST /api/tickets/:id/internal-notes
 * Access: IT Staff, Administrator ONLY (Requester -> 403 Forbidden)
 */
ticketsRouter.post(
  "/:id/internal-notes",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        });
      }
      const idParam = req.params.id;
      const ticketId = Number(idParam);

      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found" },
        });
      }

      const { content } = req.body || {};
      if (typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Internal note content must be non-empty and up to 2,000 characters.",
          },
        });
      }

      const note = await prisma.$transaction(async (tx) => {
        return await tx.internalNote.create({
          data: {
            ticketId,
            authorId: user.id,
            content: content.trim(),
          },
          include: {
            author: {
              select: { id: true, name: true, role: true },
            },
          },
        });
      });

      return res.status(201).json({
        note: {
          id: note.id,
          authorId: note.authorId,
          author: note.author,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create internal note" },
      });
    }
  }
);


// ---------------------------------------------------------------------------
// Actions Taken API Endpoints (Lab 4 / Sprint 4)
// ---------------------------------------------------------------------------

// DELETE /api/tickets/:id/actions and /:id/actions/:actionId (BR-07, AC-20)
ticketsRouter.delete("/:id/actions", (_req: Request, res: Response) => {
  return res.status(405).json({
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Actions Taken records are append-only and cannot be deleted.",
      details: [],
    },
  });
});

ticketsRouter.delete("/:id/actions/:actionId", (_req: Request, res: Response) => {
  return res.status(405).json({
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Actions Taken records are append-only and cannot be deleted.",
      details: [],
    },
  });
});

// GET /api/tickets/:id/actions
ticketsRouter.get("/:id/actions", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Not authenticated." },
      });
    }

    const ticketId = Number(req.params.id);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    // Requester only for own tickets (other ticket -> 404 NOT_FOUND)
    if (user.role === Role.REQUESTER && ticket.requesterId !== user.id) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: [
        { actionDateTime: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      ticketId,
      actions: actions.map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        actionDateTime: a.actionDateTime.toISOString(),
        description: a.description,
        result: a.result,
        performedBy: {
          id: a.performedBy.id,
          name: a.performedBy.name,
          role: a.performedBy.role,
        },
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve actions taken." },
    });
  }
});

// POST /api/tickets/:id/actions
ticketsRouter.post(
  "/:id/actions",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Not authenticated." },
        });
      }

      const ticketId = Number(req.params.id);
      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        });
      }

      // Terminal ticket check (BR-06)
      if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) {
        return res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot create actions on a closed or cancelled ticket.",
          },
        });
      }

      const {
        actionDateTime,
        description,
        result,
        followUpRequired,
        followUpNote,
        attachmentNotes,
      } = req.body || {};

      // Validate action input (BR-03, BR-04)
      const inputValidation = validateActionInput({
        description,
        result,
        followUpRequired: Boolean(followUpRequired),
        followUpNote,
        attachmentNotes,
      });

      if (!inputValidation.ok) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Action input validation failed.",
            details: inputValidation.errors,
          },
        });
      }

      // Validate action date (BR-05)
      const actionDateToUse = actionDateTime !== undefined && actionDateTime !== null ? new Date(actionDateTime) : new Date();
      const dateValidation = validateActionDate(actionDateToUse, ticket.createdAt);
      if (!dateValidation.ok) {
        return res.status(400).json({
          error: {
            code: "INVALID_ACTION_DATE",
            message: "Action date/time validation failed.",
            details: dateValidation.errors,
          },
        });
      }

      const now = new Date();
      const { newAction, updatedTicket } = await prisma.$transaction(async (tx) => {
        const action = await tx.actionTaken.create({
          data: {
            ticketId,
            actionDateTime: actionDateToUse,
            description: typeof description === "string" ? description.trim() : description,
            result: typeof result === "string" ? result.trim() : result,
            performedById: user.id,
            followUpRequired: Boolean(followUpRequired),
            followUpNote: followUpRequired && typeof followUpNote === "string" ? followUpNote.trim() : (followUpRequired ? followUpNote : null),
            attachmentNotes: attachmentNotes && typeof attachmentNotes === "string" ? attachmentNotes.trim() : null,
          },
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        });

        const touchedTicket = await tx.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: now },
        });

        return { newAction: action, updatedTicket: touchedTicket };
      });

      return res.status(201).json({
        action: {
          id: newAction.id,
          ticketId: newAction.ticketId,
          actionDateTime: newAction.actionDateTime.toISOString(),
          description: newAction.description,
          result: newAction.result,
          performedBy: {
            id: newAction.performedBy.id,
            name: newAction.performedBy.name,
            role: newAction.performedBy.role,
          },
          followUpRequired: newAction.followUpRequired,
          followUpNote: newAction.followUpNote,
          attachmentNotes: newAction.attachmentNotes,
          createdAt: newAction.createdAt.toISOString(),
          updatedAt: newAction.updatedAt.toISOString(),
        },
        ticketUpdatedAt: updatedTicket.updatedAt.toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to create action taken." },
      });
    }
  }
);

// PATCH /api/tickets/:id/actions/:actionId
ticketsRouter.patch(
  "/:id/actions/:actionId",
  authenticateUser,
  requireRole(Role.IT_STAFF, Role.ADMINISTRATOR),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Not authenticated." },
        });
      }

      const ticketId = Number(req.params.id);
      const actionId = req.params.actionId;
      if (isNaN(ticketId) || ticketId <= 0 || !actionId) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Resource not found." },
        });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        });
      }

      // Terminal ticket check (BR-06)
      if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) {
        return res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot modify actions on a closed or cancelled ticket.",
          },
        });
      }

      const existingAction = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      if (!existingAction) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Action taken not found." },
        });
      }

      const {
        expectedUpdatedAt,
        actionDateTime,
        description,
        result,
        followUpRequired,
        followUpNote,
        attachmentNotes,
      } = req.body || {};

      // Concurrency check (BR-16)
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null) {
        try {
          if (isStale(expectedUpdatedAt, existingAction.updatedAt)) {
            return res.status(409).json({
              error: {
                code: "STALE_UPDATE",
                message: "Action has been modified by another user.",
              },
            });
          }
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

      // Merge values
      const mergedDescription = description !== undefined ? description : existingAction.description;
      const mergedResult = result !== undefined ? result : existingAction.result;
      const mergedFollowUpRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : existingAction.followUpRequired;
      const mergedFollowUpNote = followUpNote !== undefined ? followUpNote : existingAction.followUpNote;
      const mergedAttachmentNotes = attachmentNotes !== undefined ? attachmentNotes : existingAction.attachmentNotes;

      // Validate merged inputs
      const inputValidation = validateActionInput({
        description: mergedDescription,
        result: mergedResult,
        followUpRequired: mergedFollowUpRequired,
        followUpNote: mergedFollowUpNote,
        attachmentNotes: mergedAttachmentNotes,
      });

      if (!inputValidation.ok) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Action input validation failed.",
            details: inputValidation.errors,
          },
        });
      }

      let actionDateToUse = existingAction.actionDateTime;
      if (actionDateTime !== undefined && actionDateTime !== null) {
        actionDateToUse = new Date(actionDateTime);
        const dateValidation = validateActionDate(actionDateToUse, ticket.createdAt);
        if (!dateValidation.ok) {
          return res.status(400).json({
            error: {
              code: "INVALID_ACTION_DATE",
              message: "Action date/time validation failed.",
              details: dateValidation.errors,
            },
          });
        }
      }

      const updatedAction = await prisma.actionTaken.update({
        where: { id: actionId },
        data: {
          actionDateTime: actionDateToUse,
          description: typeof mergedDescription === "string" ? mergedDescription.trim() : mergedDescription,
          result: typeof mergedResult === "string" ? mergedResult.trim() : mergedResult,
          followUpRequired: mergedFollowUpRequired,
          followUpNote: mergedFollowUpRequired && typeof mergedFollowUpNote === "string" ? mergedFollowUpNote.trim() : (mergedFollowUpRequired ? mergedFollowUpNote : null),
          attachmentNotes: mergedAttachmentNotes ? (typeof mergedAttachmentNotes === "string" ? mergedAttachmentNotes.trim() : mergedAttachmentNotes) : null,
        },
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return res.status(200).json({
        action: {
          id: updatedAction.id,
          ticketId: updatedAction.ticketId,
          actionDateTime: updatedAction.actionDateTime.toISOString(),
          description: updatedAction.description,
          result: updatedAction.result,
          performedBy: {
            id: updatedAction.performedBy.id,
            name: updatedAction.performedBy.name,
            role: updatedAction.performedBy.role,
          },
          followUpRequired: updatedAction.followUpRequired,
          followUpNote: updatedAction.followUpNote,
          attachmentNotes: updatedAction.attachmentNotes,
          createdAt: updatedAction.createdAt.toISOString(),
          updatedAt: updatedAction.updatedAt.toISOString(),
        },
        ticketUpdatedAt: ticket.updatedAt.toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update action taken." },
      });
    }
  }
);
