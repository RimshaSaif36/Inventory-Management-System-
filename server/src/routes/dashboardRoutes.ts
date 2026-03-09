import { Router } from "express";
import {
    getDashboardMetrics,
    getEmployeeSalesReport,
    getAdminOverview,
} from "../controllers/dashboardController";
import { authMiddleware, adminOnly, adminOrAccountant } from "../middleware/auth";

const router = Router();

router.get("/", getDashboardMetrics);
router.get("/admin-overview", authMiddleware, adminOnly, getAdminOverview);
router.get("/employee-sales", authMiddleware, adminOnly, getEmployeeSalesReport);

export default router;
