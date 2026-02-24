import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getSales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const customerId = req.query.customerId?.toString();
    const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
    const pageSize = Math.min(50, parseInt(req.query.pageSize?.toString() || "20"));
    const skip = (page - 1) * pageSize;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...(storeId && { storeId }),
          ...(customerId && { customerId }),
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, sellingPrice: true, imageUrl: true } } } },
          customer: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({
        where: {
          ...(storeId && { storeId }),
          ...(customerId && { customerId }),
        },
      }),
    ]);

    res.json({ data: sales, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error("getSales error:", error);
    res.status(500).json({ message: "Error retrieving sales" });
  }
};

export const getSaleById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        store: true,
        invoice: true,
      },
    });

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error("getSaleById error:", error);
    res.status(500).json({ message: "Error retrieving sale" });
  }
};

export const createSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId, userId, customerId, items, paymentMethod } = req.body;

    if (!storeId || !userId || !items || !paymentMethod) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.total || item.unitPrice * item.quantity;
    }

    const sale = await prisma.sale.create({
      data: {
        storeId,
        userId,
        customerId: customerId || null,
        totalAmount,
        paymentMethod,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total || item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    // Update stock for each product
    for (const item of items) {
      const stock = await prisma.stock.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId: item.productId,
          },
        },
      });

      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - item.quantity },
        });

        await prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: "POS_SALE",
            quantity: -item.quantity,
            referenceId: sale.id,
          },
        });
      }
    }

    // Auto-generate invoice
    await prisma.invoice.create({
      data: {
        storeId,
        saleId: sale.id,
        totalAmount,
        paymentMethod,
      },
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error("createSale error:", error);
    res.status(500).json({ message: "Error creating sale" });
  }
};

export const updateSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        ...(paymentMethod && { paymentMethod }),
      },
      include: { items: { include: { product: true } } },
    });

    res.json(sale);
  } catch (error) {
    console.error("updateSale error:", error);
    res.status(500).json({ message: "Error updating sale" });
  }
};

export const deleteSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.sale.delete({
      where: { id },
    });

    res.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("deleteSale error:", error);
    res.status(500).json({ message: "Error deleting sale" });
  }
};

export const getSalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    const sales = await prisma.sale.findMany({
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
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = sales.length;

    res.json({
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
    });
  } catch (error) {
    console.error("getSalesReport error:", error);
    res.status(500).json({ message: "Error generating sales report" });
  }
};
