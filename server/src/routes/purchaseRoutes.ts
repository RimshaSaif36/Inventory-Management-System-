import express from "express";
import * as purchaseController from "../controllers/purchaseController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, purchaseController.getPurchases);
router.get("/:id", adminOrAccountant, purchaseController.getPurchaseById);

// WRITE operations - Admin and Accountant
router.post("/", adminOrAccountant, purchaseController.createPurchase);
router.put("/:id", adminOrAccountant, purchaseController.updatePurchase);
router.delete("/:id", adminOrAccountant, purchaseController.deletePurchase);

export default router;
