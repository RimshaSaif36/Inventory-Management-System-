import express from "express";
import * as quotationController from "../controllers/quotationController";
import { authMiddleware, adminOrAccountant, adminOnly } from "../middleware/auth";

const router = express.Router();

router.get("/", authMiddleware, adminOrAccountant, quotationController.getQuotations);
router.get("/:id", authMiddleware, adminOrAccountant, quotationController.getQuotationById);
router.get("/:id/convert", authMiddleware, adminOrAccountant, quotationController.convertToSalesOrder);
router.post("/", authMiddleware, adminOrAccountant, quotationController.createQuotation);
router.put("/:id", authMiddleware, adminOrAccountant, quotationController.updateQuotation);
router.post("/:id/convert", authMiddleware, adminOrAccountant, quotationController.convertToSalesOrder);
router.delete("/:id", authMiddleware, adminOrAccountant, quotationController.deleteQuotation);

export default router;
