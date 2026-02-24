import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users" });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.headers["user-id"]?.toString();
    
    if (!userId) {
      res.status(401).json({ message: "User ID not provided" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeId: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      data: user,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Error retrieving user" });
  }
};
