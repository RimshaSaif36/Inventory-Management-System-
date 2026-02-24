import express from "express";
import * as salesOrderController from "../controllers/salesOrderController";

const router = express.Router();

router.get("/", salesOrderController.getSalesOrders);
router.get("/report/orders", salesOrderController.getSalesOrdersReport);
router.get("/:id", salesOrderController.getSalesOrderById);
router.post("/", salesOrderController.createSalesOrder);
router.put("/:id/status", salesOrderController.updateSalesOrderStatus);
router.delete("/:id", salesOrderController.deleteSalesOrder);

export default router;
