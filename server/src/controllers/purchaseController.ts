import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getPurchases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const supplierId = req.query.supplierId?.toString();

    const purchases = await prisma.purchase.findMany({
      where: {
        ...(storeId && { storeId }),
        ...(supplierId && { supplierId }),
      },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(purchases);
  } catch (error) {
    console.error("getPurchases error:", error);
    res.status(500).json({ message: "Error retrieving purchases" });
  }
};

export const getPurchaseById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: true,
        items: { include: { product: true } },
        store: true,
      },
    });

    if (!purchase) {
      res.status(404).json({ message: "Purchase not found" });
      return;
    }

    res.json(purchase);
  } catch (error) {
    console.error("getPurchaseById error:", error);
    res.status(500).json({ message: "Error retrieving purchase" });
  }
};

export const createPurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId, supplierId, userId, items } = req.body;

    if (!storeId || !supplierId || !userId || !items) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    let totalCost = 0;
    for (const item of items) {
      totalCost += item.totalCost || item.unitCost * item.quantity;
    }

    const purchase = await prisma.purchase.create({
      data: {
        storeId,
        supplierId,
        userId,
        totalCost,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost || item.unitCost * item.quantity,
          })),
        },
      },
      include: {
        supplier: true,
        user: true,
        items: { include: { product: true } },
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
          data: { quantity: stock.quantity + item.quantity },
        });
      } else {
        await prisma.stock.create({
          data: {
            storeId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // Record stock movement
      const stockId = stock?.id || (await prisma.stock.findUnique({ where: { storeId_productId: { storeId, productId: item.productId } } }))?.id;
      if (stockId) {
        await prisma.stockMovement.create({
          data: {
            stockId,
            type: "PURCHASE",
            quantity: item.quantity,
            referenceId: purchase.id,
          },
        });
      }
    }

    res.status(201).json(purchase);
  } catch (error) {
    console.error("createPurchase error:", error);
    res.status(500).json({ message: "Error creating purchase" });
  }
};

export const updatePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        items: {
          deleteMany: {},
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost || item.unitCost * item.quantity,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    res.json(purchase);
  } catch (error) {
    console.error("updatePurchase error:", error);
    res.status(500).json({ message: "Error updating purchase" });
  }
};

export const deletePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.purchase.delete({
      where: { id },
    });

    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("deletePurchase error:", error);
    res.status(500).json({ message: "Error deleting purchase" });
  }
};
