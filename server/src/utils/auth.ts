import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
      return;
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
        return;
      }
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      mustChangePassword: session.user.mustChangePassword,
      isActive: session.user.isActive,
    };
    return next();
  }

  // 2. Legacy x-requester-id header support (for backwards compatibility with Lab 2 tests)
  const rawHeader = req.headers["x-requester-id"];

  if (rawHeader === undefined || rawHeader === null || Array.isArray(rawHeader)) {
    const reqPath = req.originalUrl.split("?")[0];
    if (reqPath.startsWith("/api/auth/")) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
      return;
    }
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Missing x-requester-id header",
    });
    return;
  }

  const headerStr = String(rawHeader).trim();
  if (!headerStr || !/^\d+$/.test(headerStr) || Number(headerStr) <= 0) {
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid x-requester-id header",
    });
    return;
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
    return;
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
  };
  return next();
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Forbidden resource.",
        },
      });
    }

    next();
  };
}

export async function authenticateRequester(req: Request, res: Response): Promise<string | null> {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    let handled = false;
    await authenticateUser(authReq, res, () => {
      handled = true;
    });

    if (!handled || !authReq.user) {
      return null;
    }
  }

  return authReq.user.id;
}

