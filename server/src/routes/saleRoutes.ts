import express from "express";
import * as saleController from "../controllers/saleController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

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

export default router;
