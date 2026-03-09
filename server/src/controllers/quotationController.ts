import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const customerId = req.query.customerId?.toString();
    const status = req.query.status?.toString();
    const page = parseInt(req.query.page?.toString() || "1");
    const limit = parseInt(req.query.limit?.toString() || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      ...(storeId && { storeId }),
      ...(customerId && { customerId }),
      ...(status && { status }),
    };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          customer: true,
          user: { select: { id: true, name: true, role: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({ data: quotations, total, page, limit });
  } catch (error) {
    console.error("getQuotations error:", error);
    res.status(500).json({ message: "Error retrieving quotations" });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
        store: true,
      },
    });

    if (!quotation) {
      res.status(404).json({ message: "Quotation not found" });
      return;
    }

    res.json(quotation);
  } catch (error) {
    console.error("getQuotationById error:", error);
    res.status(500).json({ message: "Error retrieving quotation" });
  }
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, userId, customerId, items, validUntil, notes } = req.body;

    if (!storeId || !userId || !customerId || !items?.length) {
      res.status(400).json({ message: "storeId, userId, customerId, and items are required" });
      return;
    }

    // Validate all products exist
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) {
      res.status(400).json({ message: "One or more products not found" });
      return;
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );

    const quotation = await prisma.quotation.create({
      data: {
        storeId,
        userId,
        customerId,
        status: "DRAFT",
        totalAmount,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
      },
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error("createQuotation error:", error);
    res.status(500).json({ message: "Error creating quotation" });
  }
};

export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { items, status, validUntil, notes } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Quotation not found" });
      return;
    }

    if (existing.status === "CONVERTED") {
      res.status(400).json({ message: "Cannot edit a converted quotation" });
      return;
    }

    let updateData: any = {
      ...(status && { status }),
      ...(validUntil && { validUntil: new Date(validUntil) }),
      ...(notes !== undefined && { notes }),
    };

    if (items?.length) {
      const totalAmount = items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      );
      updateData.totalAmount = totalAmount;

      // Delete old items and recreate
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      updateData.items = {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      };
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
      },
    });

    res.json(quotation);
  } catch (error) {
    console.error("updateQuotation error:", error);
    res.status(500).json({ message: "Error updating quotation" });
  }
};

export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.quotation.delete({ where: { id } });
    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error("deleteQuotation error:", error);
    res.status(500).json({ message: "Error deleting quotation" });
  }
};

/** Convert an accepted quotation into a Sales Order */
export const convertToSalesOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, expectedDelivery } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!quotation) {
      res.status(404).json({ message: "Quotation not found" });
      return;
    }

    if (quotation.status !== "ACCEPTED") {
      res.status(400).json({ message: "Only accepted quotations can be converted to sales orders" });
      return;
    }

    // Check stock availability
    for (const item of quotation.items) {
      const stock = await prisma.stock.findFirst({
        where: { storeId: quotation.storeId, productId: item.productId },
      });
      const available = (stock?.quantity ?? 0) - (stock?.reservedQty ?? 0);
      if (available < item.quantity) {
        res.status(400).json({
          message: `Insufficient stock for product ${item.productId}. Available: ${available}`,
        });
        return;
      }
    }

    // Create sales order + reserve stock in a transaction
    const salesOrder = await prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.create({
        data: {
          storeId: quotation.storeId,
          userId: userId || quotation.userId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          status: "RESERVED",
          totalAmount: quotation.totalAmount,
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          items: {
            create: quotation.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // Reserve stock for each item
      for (const item of quotation.items) {
        const stock = await tx.stock.findFirst({
          where: { storeId: quotation.storeId, productId: item.productId },
        });
        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { reservedQty: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: "QUOTATION_RESERVE",
              quantity: item.quantity,
              referenceId: order.id,
            },
          });
        }
      }

      // Mark quotation as converted
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: "CONVERTED" },
      });

      // Create notification
      await tx.notification.create({
        data: {
          storeId: quotation.storeId,
          type: "NEW_ORDER",
          message: `Quotation converted to Sales Order for customer ${order.customer.name}`,
          referenceId: order.id,
        },
      });

      return order;
    });

    res.status(201).json(salesOrder);
  } catch (error) {
    console.error("convertToSalesOrder error:", error);
    res.status(500).json({ message: "Error converting quotation to sales order" });
  }
};
