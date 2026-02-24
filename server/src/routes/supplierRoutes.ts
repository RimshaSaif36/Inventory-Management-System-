import express from "express";
import * as supplierController from "../controllers/supplierController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, supplierController.getSuppliers);
router.get("/:id", adminOrAccountant, supplierController.getSupplierById);

// WRITE operations - Accountant only
router.post("/", accountantOnly, supplierController.createSupplier);
router.put("/:id", accountantOnly, supplierController.updateSupplier);
router.delete("/:id", accountantOnly, supplierController.deleteSupplier);

export default router;
