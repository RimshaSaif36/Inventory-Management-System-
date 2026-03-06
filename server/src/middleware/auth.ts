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

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("Auth middleware - Headers:", req.headers);
    
    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to user-id header for backward compatibility
    const userId = req.headers["user-id"]?.toString();
    
    // If we have a token, validate it with Supabase
    if (token) {
      console.log("Auth middleware - Validating JWT token");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log("Auth middleware - Invalid JWT token:", error?.message);
        res.status(401).json({ message: "Invalid or expired token" });
        return;
      }

      // Find user in database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        console.log("Auth middleware - User not found in database");
        res.status(401).json({ message: "User not found" });
        return;
      }

      req.userId = user.id;
      req.user = dbUser;
      console.log("Auth middleware - JWT validation successful");
      next();
      return;
    }
    
    // Fallback to user-id header method
    if (userId) {
      console.log("Auth middleware - Using user-id header fallback");
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        console.log("Auth middleware - User not found in database");
        res.status(401).json({ message: "User not found" });
        return;
      }

      req.userId = userId;
      req.user = user;
      console.log("Auth middleware - Header validation successful");
      next();
      return;
    }

    // No authentication provided
    console.log("Auth middleware - No authentication provided");
    res.status(401).json({ message: "Authentication required" });
    return;
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
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
