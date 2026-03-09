import express from "express";
import * as notificationController from "../controllers/notificationController";
import { authMiddleware, adminOnly } from "../middleware/auth";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, notificationController.getNotifications);
router.put("/:id/read", authMiddleware, adminOnly, notificationController.markAsRead);
router.put("/mark-all-read", authMiddleware, adminOnly, notificationController.markAllAsRead);
router.delete("/:id", authMiddleware, adminOnly, notificationController.deleteNotification);

export default router;
