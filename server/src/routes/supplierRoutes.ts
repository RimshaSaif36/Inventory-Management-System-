import express from "express";
import * as supplierController from "../controllers/supplierController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, supplierController.getSuppliers);
router.get("/:id", adminOrAccountant, supplierController.getSupplierById);

// WRITE operations - Admin and Accountant
router.post("/", adminOrAccountant, supplierController.createSupplier);
router.put("/:id", adminOrAccountant, supplierController.updateSupplier);
router.delete("/:id", adminOrAccountant, supplierController.deleteSupplier);

export default router;
