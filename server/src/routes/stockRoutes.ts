import express from "express";
import * as stockController from "../controllers/stockController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, stockController.getStockByStore);
router.get("/report/all", adminOrAccountant, stockController.getStockReport);
router.get("/report/low", adminOrAccountant, stockController.getLowStockProducts);
router.get("/movement/history", adminOrAccountant, stockController.getStockMovementHistory);
router.get("/:id", adminOrAccountant, stockController.getStockById);

// WRITE operations - Accountant only
router.put("/:id", accountantOnly, stockController.updateStock);

export default router;
