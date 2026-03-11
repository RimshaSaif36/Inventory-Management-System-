import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

// Admin client for user management
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users" });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Use authenticated user from middleware
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

export const updateCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeId: true,
      },
    });

    res.json({ data: updatedUser });
  } catch (error) {
    console.error("Error updating current user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !role || !password) {
      res.status(400).json({ message: "Name, email, role, and password are required" });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    // Create user in Supabase Auth (password handled by Supabase only)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role.toUpperCase(),
        name,
      },
    });

    if (authError || !authData.user) {
      res.status(400).json({ message: authError?.message || "Failed to create user" });
      return;
    }

    // Create user in local DB (NO password stored)
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        name,
        email,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error creating user" });
  }
}
