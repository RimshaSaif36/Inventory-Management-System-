import express from "express";
import * as notificationController from "../controllers/notificationController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

router.get("/", authMiddleware, adminOrAccountant, notificationController.getNotifications);
router.put("/:id/read", authMiddleware, adminOrAccountant, notificationController.markAsRead);
router.put("/mark-all-read", authMiddleware, adminOrAccountant, notificationController.markAllAsRead);
router.delete("/:id", authMiddleware, adminOrAccountant, notificationController.deleteNotification);

export default router;
