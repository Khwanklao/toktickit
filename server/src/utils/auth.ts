import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export async function authenticateRequester(req: Request, res: Response): Promise<number | null> {
  const rawHeader = req.headers["x-requester-id"];

  if (!rawHeader || Array.isArray(rawHeader)) {
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Missing x-requester-id header",
    });
    return null;
  }

  const requesterId = Number(rawHeader);
  if (!Number.isInteger(requesterId) || requesterId <= 0 || rawHeader.trim() !== String(requesterId)) {
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid x-requester-id header",
    });
    return null;
  }

  const prisma = getPrisma();
  const requester = await prisma.requesterUser.findUnique({
    where: { id: requesterId },
  });

  if (!requester || !requester.isActive) {
    res.status(403).json({
      statusCode: 403,
      error: "Forbidden",
      message: "Requester is inactive or unauthorized",
    });
    return null;
  }

  return requesterId;
}
