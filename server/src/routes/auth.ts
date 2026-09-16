import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "../prisma.js";
import { validatePassword } from "../utils/password-validator.js";

export const authRouter = Router();

// POST /api/auth/login (API-01, API-02, API-03)
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }

    const prisma = getPrisma();
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Check credentials and isActive flag (BR-01, BR-03)
    if (!user || !user.isActive || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      });
    }

    // Generate cryptographic random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    res.cookie("toktickit_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process login",
      },
    });
  }
});

// POST /api/auth/logout (API-06)
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.toktickit_session;

    if (token && typeof token === "string") {
      const prisma = getPrisma();
      await prisma.session.deleteMany({
        where: { token },
      }).catch(() => {});
    }

    res.clearCookie("toktickit_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to process logout",
      },
    });
  }
});

// GET /api/auth/me
authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.toktickit_session;

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
    }

    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      res.clearCookie("toktickit_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
    }

    return res.status(200).json({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      mustChangePassword: session.user.mustChangePassword,
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch current user profile",
      },
    });
  }
});

// POST /api/auth/change-password (API-05, API-05b)
authRouter.post("/change-password", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.toktickit_session;

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
    }

    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated.",
        },
      });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect. Please try again.",
        },
      });
    }

    // Verify current password against database hash
    if (!bcrypt.compareSync(currentPassword, session.user.passwordHash)) {
      return res.status(400).json({
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect. Please try again.",
        },
      });
    }

    // Validate new password rules (BR-07)
    const validation = validatePassword(newPassword, currentPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Password does not meet requirements",
          details: validation.errors,
        },
      });
    }

    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    return res.status(200).json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      mustChangePassword: updatedUser.mustChangePassword,
    });
  } catch (error) {
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to change password",
      },
    });
  }
});
