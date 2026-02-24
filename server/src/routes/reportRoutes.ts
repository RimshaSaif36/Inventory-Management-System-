import express from "express";
import * as reportController from "../controllers/reportController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// All report endpoints - Admin and Accountant can view
router.get("/dashboard", adminOrAccountant, reportController.getDashboardOverview);
router.get("/daily-sales", adminOrAccountant, reportController.getDailySalesReport);
router.get("/weekly-sales", adminOrAccountant, reportController.getWeeklySalesReport);
router.get("/monthly-sales", adminOrAccountant, reportController.getMonthlySalesReport);
router.get("/profit", adminOrAccountant, reportController.getProfitReport);
router.get("/purchase", adminOrAccountant, reportController.getPurchaseReport);

export default router;
