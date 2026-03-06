import { Router } from "express";
import { login, registerAccountant, getCurrentUser } from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Public routes (no authentication required)
router.post("/register", registerAccountant);
router.post("/login", login);

// Protected routes (authentication required)
router.get("/me", authMiddleware, getCurrentUser);

export default router;
