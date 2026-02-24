import express from "express";
import * as purchaseController from "../controllers/purchaseController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, purchaseController.getPurchases);
router.get("/:id", adminOrAccountant, purchaseController.getPurchaseById);

// WRITE operations - Accountant only
router.post("/", accountantOnly, purchaseController.createPurchase);
router.put("/:id", accountantOnly, purchaseController.updatePurchase);
router.delete("/:id", accountantOnly, purchaseController.deletePurchase);

export default router;
