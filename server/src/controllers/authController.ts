import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

/**
 * Register new user (Local + Supabase)
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

    // Hash password for local storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in local database
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: "ACCOUNTANT",
      },
    });

    // Optionally try to create in Supabase (non-blocking)
    try {
      await supabase.auth.signUp({
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
    } catch (supabaseError) {
      console.log("Supabase registration failed (non-critical):", supabaseError);
    }

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: "accountant",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

/**
 * Login (Local Authentication)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Try local authentication first
    const dbUser = await prisma.user.findUnique({
      where: { email },
    });

    if (dbUser && dbUser.password) {
      // Local user exists, verify password
      const isValidPassword = await bcrypt.compare(password, dbUser.password);
      if (isValidPassword) {
        // Generate JWT token
        const token = jwt.sign(
          { userId: dbUser.id, email: dbUser.email, role: dbUser.role },
          process.env.JWT_SECRET || "fallback_secret",
          { expiresIn: "24h" }
        );

        res.status(200).json({
          message: "Login successful",
          token,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
          },
        });
        return;
      }
    }

    // Fallback to Supabase authentication
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

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
    } catch (supabaseError) {
      console.error("Supabase login error:", supabaseError);
      res.status(401).json({ error: "Invalid credentials" });
    }
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
