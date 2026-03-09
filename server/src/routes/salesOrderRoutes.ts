import express from "express";
import * as salesOrderController from "../controllers/salesOrderController";
import { authMiddleware, adminOrAccountant, accountantOrSalesman } from "../middleware/auth";

const router = express.Router();

router.use(authMiddleware);

router.get("/", adminOrAccountant, salesOrderController.getSalesOrders);
router.get("/report/orders", adminOrAccountant, salesOrderController.getSalesOrdersReport);
router.get("/:id", adminOrAccountant, salesOrderController.getSalesOrderById);
router.post("/", adminOrAccountant, salesOrderController.createSalesOrder);
router.put("/:id/status", adminOrAccountant, salesOrderController.updateSalesOrderStatus);
router.delete("/:id", adminOrAccountant, salesOrderController.deleteSalesOrder);

export default router;
