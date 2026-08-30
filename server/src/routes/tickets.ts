import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { generateTicketNumber } from "../utils/ticket-number.js";

export const ticketsRouter = Router();

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

ticketsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const rawHeader = req.headers["x-requester-id"];

    if (!rawHeader || Array.isArray(rawHeader)) {
      return res.status(400).json({
        statusCode: 400,
        error: "Bad Request",
        message: "Missing x-requester-id header",
      });
    }

    const requesterId = Number(rawHeader);
    if (!Number.isInteger(requesterId) || requesterId <= 0 || rawHeader.trim() !== String(requesterId)) {
      return res.status(400).json({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid x-requester-id header",
      });
    }

    const prisma = getPrisma();

    // Verify requester identity
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(403).json({
        statusCode: 403,
        error: "Forbidden",
        message: "Requester is inactive or unauthorized",
      });
    }

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
      let sequenceNum: number;
      try {
        const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('"Ticket_id_seq"')`;
        sequenceNum = Number(nextval);
      } catch {
        const count = await tx.ticket.count();
        sequenceNum = count + 1;
      }

      const ticketNumber = generateTicketNumber(sequenceNum);

      return await tx.ticket.create({
        data: {
          id: sequenceNum,
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

    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to create ticket",
    });
  }
});
