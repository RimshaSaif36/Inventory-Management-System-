import express from "express";
import * as saleController from "../controllers/saleController";
import { authMiddleware, accountantOnly, adminOrAccountant, adminOnly } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, saleController.getSales);
router.get("/report/sales", adminOrAccountant, saleController.getSalesReport);
router.get("/:id", adminOrAccountant, saleController.getSaleById);

// WRITE operations - Accountant only
router.post("/", accountantOnly, saleController.createSale);
router.put("/:id", accountantOnly, saleController.updateSale);
router.delete("/:id", accountantOnly, saleController.deleteSale);

// Approval - Admin or Accountant
router.put("/:id/approve", adminOrAccountant, saleController.approveSale);

export default router;
