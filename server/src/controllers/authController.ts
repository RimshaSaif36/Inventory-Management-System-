import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";



const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

/**
 * Register new user (Accountant signup)
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

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "accountant",
          name,
          storeId,
        },
      },
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    if (!authData.user) {
      res.status(400).json({ error: "Failed to create user" });
      return;
    }

    await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        name,
        email,
      },
      create: {
        id: authData.user.id,
        name,
        email,
        password: "", // Password handled by Supabase
        role: "ACCOUNTANT",
      },
    });

    res.status(201).json({
      message: "Registration successful. Please check your email to confirm.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: "accountant",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

/**
 * Login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    const userRole =
      (data.user.user_metadata?.role as "admin" | "accountant") ||
      "accountant";

    res.status(200).json({
      message: "Login successful",
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: dbUser?.name || data.user.user_metadata?.name,
        role: userRole,
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
    // extend Request with user in middleware; fallback to any here
    const requestWithUser = req as Request & { user?: { id: string; role?: string } };

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
      role: requestWithUser.user.role,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};
