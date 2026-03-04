import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getInvoices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(storeId && { storeId }),
      },
      include: {
        sale: { include: { items: true, customer: true } },
        salesOrder: { include: { items: true, customer: true } },
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invoices);
  } catch (error) {
    console.error("getInvoices error:", error);
    res.status(500).json({ message: "Error retrieving invoices" });
  }
};

export const getInvoiceById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        sale: {
          include: { items: { include: { product: true } }, customer: true },
        },
        salesOrder: {
          include: { items: { include: { product: true } }, customer: true },
        },
        store: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    res.json(invoice);
  } catch (error) {
    console.error("getInvoiceById error:", error);
    res.status(500).json({ message: "Error retrieving invoice" });
  }
};

export const createInvoiceFromSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      res.status(400).json({ message: "Sale ID is required" });
      return;
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { saleId },
    });

    if (existingInvoice) {
      res.status(400).json({ message: "Invoice already exists for this sale" });
      return;
    }

    const invoice = await prisma.invoice.create({
      data: {
        storeId: sale.storeId,
        saleId,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
      },
      include: {
        sale: { include: { items: { include: { product: true } }, customer: true } },
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("createInvoiceFromSale error:", error);
    res.status(500).json({ message: "Error creating invoice" });
  }
};

export const createInvoiceFromSalesOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { salesOrderId } = req.body;

    if (!salesOrderId) {
      res.status(400).json({ message: "Sales Order ID is required" });
      return;
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });

    if (!salesOrder) {
      res.status(404).json({ message: "Sales order not found" });
      return;
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { salesOrderId },
    });

    if (existingInvoice) {
      res.status(400).json({ message: "Invoice already exists for this sales order" });
      return;
    }

    const invoice = await prisma.invoice.create({
      data: {
        storeId: salesOrder.storeId,
        salesOrderId,
        totalAmount: salesOrder.totalAmount,
        paymentMethod: null,
      },
      include: {
        salesOrder: { include: { items: { include: { product: true } }, customer: true } },
      },
    });

    // Update sales order status to INVOICED
    await prisma.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: "INVOICED" },
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("createInvoiceFromSalesOrder error:", error);
    res.status(500).json({ message: "Error creating invoice" });
  }
};

export const deleteInvoice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.invoice.delete({
      where: { id },
    });

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("deleteInvoice error:", error);
    res.status(500).json({ message: "Error deleting invoice" });
  }
};

export const getInvoiceSummaryReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(storeId && { storeId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        sale: { include: { customer: true } },
        salesOrder: { include: { customer: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum: number, inv: { totalAmount?: number }) => sum + (inv.totalAmount ?? 0),
      0
    );

    const paymentMethodSummary: Record<string, number> = {};
    invoices.forEach((inv: { paymentMethod?: string; totalAmount?: number }) => {
      const method = inv.paymentMethod || "NOT_SPECIFIED";
      paymentMethodSummary[method] = (paymentMethodSummary[method] || 0) + (inv.totalAmount ?? 0);
    });

    res.json({
      invoices,
      summary: {
        totalInvoices,
        totalAmount,
        averageInvoiceAmount: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
        paymentMethodSummary,
      },
    });
  } catch (error) {
    console.error("getInvoiceSummaryReport error:", error);
    res.status(500).json({ message: "Error generating invoice summary report" });
  }
};
