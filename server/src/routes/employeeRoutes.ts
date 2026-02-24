import express from "express";
import * as employeeController from "../controllers/employeeController";
import { authMiddleware, accountantOnly, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// READ operations - Admin and Accountant
router.get("/", adminOrAccountant, employeeController.getEmployees);
router.get("/:id", adminOrAccountant, employeeController.getEmployeeById);

// WRITE operations - Accountant only
router.post("/", accountantOnly, employeeController.createEmployee);
router.put("/:id", accountantOnly, employeeController.updateEmployee);
router.delete("/:id", accountantOnly, employeeController.deleteEmployee);

export default router;
