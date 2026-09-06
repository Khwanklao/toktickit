import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const devRequestersRouter = Router();

devRequestersRouter.get("/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Failed to fetch development requesters",
    });
  }
});
