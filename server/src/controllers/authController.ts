import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";

// Use ANON_KEY for auth verification (safe for server-side token validation)
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// Use SERVICE_ROLE_KEY for admin operations (creating users, etc.)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Register new accountant (Supabase Auth + local User table)
 * Only admin can register new users
 */
export const registerAccountant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name, storeId } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    // Check if user already exists locally
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Create user in Supabase Auth (password is handled by Supabase only)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "ACCOUNTANT",
        name,
        storeId,
      },
    });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message || "Failed to create user in Supabase" });
      return;
    }

    // Create user in local database (NO password stored)
    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id, // Use Supabase auth.users id
        name,
        email,
        role: "ACCOUNTANT",
        storeId: storeId || null,
      },
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

/**
 * Login (Supabase Auth only - no local password verification)
 * 
 * Flow:
 * 1. Supabase Auth verifies email + password
 * 2. On success, check local User table for role
 * 3. Return Supabase session token + user role
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Authenticate via Supabase Auth ONLY
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Get role from local User table
    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    // If user exists in Supabase but not in local DB, sync them
    if (!dbUser) {
      const newUser = await prisma.user.create({
        data: {
          id: data.user.id,
          name: data.user.user_metadata?.name || email.split("@")[0],
          email: data.user.email || email,
          role: (data.user.user_metadata?.role as string)?.toUpperCase() || "ACCOUNTANT",
          storeId: data.user.user_metadata?.storeId || null,
        },
      });

      res.status(200).json({
        message: "Login successful",
        token: data.session.access_token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          storeId: newUser.storeId,
        },
      });
      return;
    }

    res.status(200).json({
      message: "Login successful",
      token: data.session.access_token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        storeId: dbUser.storeId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requestWithUser = req as Request & { user?: { id: string; role?: string; storeId?: string } };

    if (!requestWithUser.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: requestWithUser.user.id },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
