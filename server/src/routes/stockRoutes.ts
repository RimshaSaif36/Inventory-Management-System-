import express from "express";
import * as stockController from "../controllers/stockController";
import { authMiddleware, accountantOnly, adminOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, stockController.getStockByStore);
router.get("/report/all", adminOrAccountant, stockController.getStockReport);
router.get("/report/low", adminOrAccountant, stockController.getLowStockProducts);
router.get("/movement/history", adminOrAccountant, stockController.getStockMovementHistory);
router.get("/requests", adminOrAccountant, stockController.getStockRequests);
router.post("/requests", accountantOnly, stockController.createStockRequest);
router.put("/requests/:id/approve", adminOnly, stockController.approveStockRequest);
router.put("/requests/:id/reject", adminOnly, stockController.rejectStockRequest);
router.get("/:id", adminOrAccountant, stockController.getStockById);

// WRITE operations - Admin only
router.post("/", adminOnly, stockController.createStock);
router.put("/:id", adminOnly, stockController.updateStock);

export default router;
