import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

/**
 * Auth Middleware - Validates Supabase JWT token only.
 * No fallback to user-id headers (insecure).
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required. Provide a valid Bearer token." });
      return;
    }

    const token = authHeader.substring(7);

    // Validate JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    // Find user in local database to get role
    // First try by Supabase ID, then fallback to email (for users created before Supabase integration)
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
    }

    if (!dbUser) {
      res.status(401).json({ message: "User not found in system" });
      return;
    }

    req.userId = dbUser.id;
    req.user = { ...dbUser, role: dbUser.role?.toUpperCase() };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
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

export const salesmanOnly = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user?.role !== "SALESMAN") {
    res.status(403).json({ message: "Salesman access required" });
    return;
  }
  next();
};

/** Allows ADMIN, ACCOUNTANT, and SALESMAN */
export const anyRole = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const allowed = ["ADMIN", "ACCOUNTANT", "SALESMAN"];
  if (!req.user || !allowed.includes(req.user?.role)) {
    res.status(403).json({ message: "Authentication required" });
    return;
  }
  next();
};

/** Allows ACCOUNTANT and SALESMAN (not ADMIN-only operations) */
export const accountantOrSalesman = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const allowed = ["ACCOUNTANT", "SALESMAN"];
  if (!req.user || !allowed.includes(req.user?.role)) {
    res.status(403).json({ message: "Access restricted to accountant or salesman" });
    return;
  }
  next();
};
