import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const devRequestersRouter = Router();

devRequestersRouter.get("/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: {
        role: "REQUESTER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const formatted = requesters.map((r) => ({
      id: !isNaN(Number(r.id)) ? Number(r.id) : r.id,
      name: r.name,
      email: r.email,
      department: "Engineering",
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch development requesters",
    });
  }
});
