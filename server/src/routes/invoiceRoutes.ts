import express from "express";
import * as invoiceController from "../controllers/invoiceController";
import { authMiddleware, adminOrAccountant } from "../middleware/auth";

const router = express.Router();

router.get("/", authMiddleware, adminOrAccountant, invoiceController.getInvoices);
router.get("/:id", authMiddleware, adminOrAccountant, invoiceController.getInvoiceById);
router.post("/from-sale", authMiddleware, adminOrAccountant, invoiceController.createInvoiceFromSale);
router.post("/from-order", authMiddleware, adminOrAccountant, invoiceController.createInvoiceFromSalesOrder);
router.put("/:id", authMiddleware, adminOrAccountant, invoiceController.updateInvoice);
router.delete("/:id", authMiddleware, adminOrAccountant, invoiceController.deleteInvoice);

export default router;
