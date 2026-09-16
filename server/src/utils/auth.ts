import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export async function authenticateRequester(req: Request, res: Response): Promise<string | null> {
  const prisma = getPrisma();

  // 1. Check for session token in cookies
  const token = req.cookies?.toktickit_session;

  if (token && typeof token === "string") {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
      return null;
    }

    // Check mandatory password change barrier
    if (session.user.mustChangePassword) {
      const reqPath = req.originalUrl.split("?")[0];
      const allowedPaths = ["/api/auth/change-password", "/api/auth/logout", "/api/auth/me"];
      if (!allowedPaths.includes(reqPath)) {
        res.status(403).json({
          error: {
            code: "PASSWORD_CHANGE_REQUIRED",
            message: "Password change required before accessing the system.",
          },
        });
        return null;
      }
    }

    return session.user.id;
  }

  // 2. Legacy x-requester-id header support (for backwards compatibility)
  const rawHeader = req.headers["x-requester-id"];

  if (rawHeader === undefined || rawHeader === null || Array.isArray(rawHeader)) {
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Missing x-requester-id header",
    });
    return null;
  }

  const headerStr = String(rawHeader).trim();
  if (!headerStr || !/^\d+$/.test(headerStr) || Number(headerStr) <= 0) {
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid x-requester-id header",
    });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: headerStr },
  });

  if (!user || !user.isActive) {
    res.status(403).json({
      statusCode: 403,
      error: "Forbidden",
      message: "Requester is inactive or unauthorized",
    });
    return null;
  }

  return user.id;
}
