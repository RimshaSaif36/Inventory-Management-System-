import { Router } from "express";
import * as expenseController from "../controllers/expenseController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, adminOrAccountant, expenseController.getExpenses);
router.get("/by-category", authMiddleware, adminOrAccountant, expenseController.getExpensesByCategory);
router.post("/", authMiddleware, adminOrAccountant, expenseController.createExpense);
router.put("/:id", authMiddleware, adminOrAccountant, expenseController.updateExpense);
router.delete("/:id", authMiddleware, adminOrAccountant, expenseController.deleteExpense);

export default router;
