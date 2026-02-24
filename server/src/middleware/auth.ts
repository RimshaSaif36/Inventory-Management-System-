import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers["user-id"]?.toString();
    const userRole = req.headers["user-role"]?.toString();

    // If no auth headers, allow to proceed (for public routes)
    // Specific routes can require auth if needed
    if (!userId || !userRole) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Allow request to proceed even if middleware fails
    next();
  }
};

export const adminOnly = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
};

export const accountantOnly = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user?.role !== "ACCOUNTANT") {
    res.status(403).json({ message: "Accountant access required" });
    return;
  }
  next();
};

export const adminOrAccountant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user?.role !== "ADMIN" && req.user?.role !== "ACCOUNTANT")) {
    res.status(403).json({ message: "Access restricted to admin or accountant" });
    return;
  }
  next();
};
