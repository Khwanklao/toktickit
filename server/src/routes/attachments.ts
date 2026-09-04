import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import { authenticateRequester } from "../utils/auth.js";

export const attachmentsRouter = Router();

attachmentsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const idParam = req.params.id;
    const attachmentId = Number(idParam);
    if (!/^\d+$/.test(idParam) || !Number.isInteger(attachmentId) || attachmentId <= 0) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    return res.status(200).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString(),
      isRemoved: attachment.isRemoved,
      removedAt: attachment.removedAt ? attachment.removedAt.toISOString() : null,
      removalReason: attachment.removalReason,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch attachment metadata",
    });
  }
});

attachmentsRouter.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const idParam = req.params.id;
    const attachmentId = Number(idParam);
    if (!/^\d+$/.test(idParam) || !Number.isInteger(attachmentId) || attachmentId <= 0) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    if (attachment.isRemoved) {
      return res.status(410).json({
        statusCode: 410,
        error: "Gone",
        message: "Attachment has been removed",
      });
    }

    const filePath = path.resolve(process.cwd(), "uploads", attachment.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Attachment file missing on disk",
      });
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.originalFileName}"`
    );

    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to download attachment file",
    });
  }
});

attachmentsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const requesterId = await authenticateRequester(req, res);
    if (requesterId === null) return;

    const idParam = req.params.id;
    const attachmentId = Number(idParam);
    if (!/^\d+$/.test(idParam) || !Number.isInteger(attachmentId) || attachmentId <= 0) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment || attachment.ticket.requesterId !== requesterId) {
      return res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: "Attachment not found",
      });
    }

    if (attachment.isRemoved) {
      return res.status(409).json({
        statusCode: 409,
        error: "Conflict",
        message: "Attachment is already removed",
      });
    }

    const { reason } = req.body || {};
    if (typeof reason !== "string" || reason.trim().length < 3) {
      return res.status(400).json({
        statusCode: 400,
        error: "Bad Request",
        message: "Removal reason is required and must be at least 3 characters",
      });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removedAt: new Date(),
        removedBy: requesterId,
        removalReason: reason.trim(),
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalFileName: updated.originalFileName,
      fileSize: updated.fileSize,
      mimeType: updated.mimeType,
      createdAt: updated.createdAt.toISOString(),
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt ? updated.removedAt.toISOString() : null,
      removedBy: updated.removedBy,
      removalReason: updated.removalReason,
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to remove attachment",
    });
  }
});
