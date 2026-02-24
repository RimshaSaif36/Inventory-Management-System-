import express from "express";
import * as saleController from "../controllers/saleController";

const router = express.Router();

router.get("/", saleController.getSales);
router.get("/report/sales", saleController.getSalesReport);
router.get("/:id", saleController.getSaleById);
router.post("/", saleController.createSale);
router.put("/:id", saleController.updateSale);
router.delete("/:id", saleController.deleteSale);

export default router;
