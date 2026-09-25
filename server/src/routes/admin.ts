import { Router, Response } from "express";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getPrisma } from "../prisma.js";
import { authenticateUser, requireRole, revokeUserSessions, AuthenticatedRequest } from "../utils/auth.js";
import { validatePassword } from "../utils/password-validator.js";

export const adminRouter = Router();

// Apply security middleware stack: authenticated + Administrator role required
adminRouter.use(authenticateUser);
adminRouter.use(requireRole(Role.ADMINISTRATOR));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/admin/users
 * Search and filter users list
 */
adminRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const prisma = getPrisma();
  const { search, role } = req.query;

  if (role !== undefined && typeof role === "string" && role.trim() !== "") {
    if (!Object.values(Role).includes(role as Role)) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid role query parameter.",
        },
      });
      return;
    }
  }

  const whereClause: any = {};

  if (role && typeof role === "string" && role.trim() !== "") {
    whereClause.role = role as Role;
  }

  if (search && typeof search === "string" && search.trim() !== "") {
    const term = search.trim();
    whereClause.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  try {
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users.",
      },
    });
  }
});

/**
 * POST /api/admin/users
 * Create a new user with initial password
 */
adminRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const prisma = getPrisma();
  const { name, email, role, isActive, initialPassword } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Name is required.",
      },
    });
    return;
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Valid email address is required.",
      },
    });
    return;
  }

  if (!role || typeof role !== "string" || !Object.values(Role).includes(role as Role)) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Valid role is required.",
      },
    });
    return;
  }

  if (!initialPassword || typeof initialPassword !== "string") {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Initial password is required.",
      },
    });
    return;
  }

  const passValidation = validatePassword(initialPassword);
  if (!passValidation.isValid) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: passValidation.errors.join(" "),
      },
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });

  if (existingUser) {
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "Email is already in use by an existing user.",
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(initialPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      role: role as Role,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      mustChangePassword: true,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  res.status(201).json({ user: newUser });
});

/**
 * PATCH /api/admin/users/:id
 * Update user information (name, email, role, isActive)
 */
adminRouter.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const prisma = getPrisma();
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  if (role !== undefined) {
    if (typeof role !== "string" || !Object.values(Role).includes(role as Role)) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid role value.",
        },
      });
      return;
    }
  }

  if (isActive === false && req.user?.id === id) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Administrators cannot deactivate their own account.",
      },
    });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id } });
      if (!targetUser) {
        return { status: 404, body: { error: { code: "NOT_FOUND", message: "User not found." } } };
      }

      if (email !== undefined) {
        if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
          return { status: 400, body: { error: { code: "BAD_REQUEST", message: "Invalid email format." } } };
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existing = await tx.user.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: "insensitive" },
            id: { not: id },
          },
        });

        if (existing) {
          return { status: 409, body: { error: { code: "CONFLICT", message: "Email is already in use by another user." } } };
        }
      }

      // Check last active admin protection (BR-24 / API-24)
      const isTargetActiveAdmin = targetUser.role === Role.ADMINISTRATOR && targetUser.isActive === true;
      const willBeInactiveOrNonAdmin = (isActive === false) || (role !== undefined && role !== Role.ADMINISTRATOR);

      if (isTargetActiveAdmin && willBeInactiveOrNonAdmin) {
        const activeAdminCount = await tx.user.count({
          where: { role: Role.ADMINISTRATOR, isActive: true },
        });

        if (activeAdminCount <= 1) {
          return {
            status: 400,
            body: {
              error: {
                code: "BAD_REQUEST",
                message: "At least one Active Administrator must remain in the system.",
              },
            },
          };
        }
      }

      const updateData: any = {};
      if (name !== undefined && typeof name === "string" && name.trim() !== "") {
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        updateData.email = email.trim().toLowerCase();
      }
      if (role !== undefined) {
        updateData.role = role as Role;
      }
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
        },
      });

      return { status: 200, body: { user: updatedUser } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update user.",
      },
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user initial password and enforce mustChangePassword = true
 */
adminRouter.post("/:id/reset-password", async (req: AuthenticatedRequest, res: Response) => {
  const prisma = getPrisma();
  const { id } = req.params;
  const { newInitialPassword } = req.body;

  if (!newInitialPassword || typeof newInitialPassword !== "string") {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "New initial password is required.",
      },
    });
    return;
  }

  const passValidation = validatePassword(newInitialPassword);
  if (!passValidation.isValid) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: passValidation.errors.join(" "),
      },
    });
    return;
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "User not found.",
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(newInitialPassword, 10);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  // Revoke target user's existing sessions
  await revokeUserSessions(id);

  res.status(200).json({
    message: "Initial password reset successfully.",
    userId: id,
    mustChangePassword: true,
  });
});
