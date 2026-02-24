import express from "express";
import * as customerController from "../controllers/customerController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, customerController.getCustomers);
router.get("/:id", adminOrAccountant, customerController.getCustomerById);
router.get("/:id/history", adminOrAccountant, customerController.getCustomerPurchaseHistory);

// WRITE operations - Accountant only
router.post("/", accountantOnly, customerController.createCustomer);
router.put("/:id", accountantOnly, customerController.updateCustomer);
router.delete("/:id", accountantOnly, customerController.deleteCustomer);

export default router;
