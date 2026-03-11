import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const createStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, quantity, lowStockLevel } = req.body;

    // Validate required fields
    if (!productId || quantity === undefined) {
      res.status(400).json({ message: "Product ID and quantity are required" });
      return;
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Get or create default store
    let defaultStore = await prisma.store.findFirst({
      where: { name: "Default Store" },
    });

    if (!defaultStore) {
      defaultStore = await prisma.store.create({
        data: {
          name: "Default Store",
          location: "Main Warehouse",
        },
      });
    }

    // Check if stock already exists for this product
    const existingStock = await prisma.stock.findUnique({
      where: {
        storeId_productId: {
          storeId: defaultStore.id,
          productId,
        },
      },
    });

    if (existingStock) {
      res.status(400).json({ message: "Stock entry already exists for this product" });
      return;
    }

    // Create stock entry
    const stock = await prisma.stock.create({
      data: {
        storeId: defaultStore.id,
        productId,
        quantity: Number(quantity),
        lowStockLevel: lowStockLevel ? Number(lowStockLevel) : 5,
      },
      include: {
        product: { include: { brand: true, series: true } },
        store: true,
      },
    });

    // Record initial stock movement
    await prisma.stockMovement.create({
      data: {
        stockId: stock.id,
        type: "INITIAL",
        quantity: Number(quantity),
      },
    });

    if (stock.quantity < stock.lowStockLevel) {
      const existingAlert = await prisma.notification.findFirst({
        where: {
          storeId: stock.storeId,
          type: "SYSTEM_ALERT",
          referenceId: stock.productId,
          read: false,
        },
      });

      if (!existingAlert) {
        await prisma.notification.create({
          data: {
            storeId: stock.storeId,
            type: "SYSTEM_ALERT",
            message: `Low stock: ${stock.product?.name ?? "Product"} (${stock.quantity} left)`,
            referenceId: stock.productId,
          },
        });
      }
    }

    res.status(201).json(stock);
  } catch (error: any) {
    console.error("createStock error:", error);
    res.status(500).json({ message: error.message || "Error creating stock" });
  }
};

export const getStockByStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.query;
    const search = req.query.search?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const stocks = await prisma.stock.findMany({
      where: {
        storeId: storeId.toString(),
        ...(search && {
          product: { name: { contains: search } },
        }),
      },
      include: {
        product: { include: { brand: true, series: true } },
        store: true,
      },
    });

    res.json(stocks);
  } catch (error) {
    console.error("getStockByStore error:", error);
    res.status(500).json({ message: "Error retrieving stock" });
  }
};

export const getStockById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        product: { include: { brand: true, series: true } },
        movements: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!stock) {
      res.status(404).json({ message: "Stock not found" });
      return;
    }

    res.json(stock);
  } catch (error) {
    console.error("getStockById error:", error);
    res.status(500).json({ message: "Error retrieving stock" });
  }
};

export const updateStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, lowStockLevel } = req.body;

    // Get old stock data before updating
    const oldStock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!oldStock) {
      res.status(404).json({ message: "Stock not found" });
      return;
    }

    const stock = await prisma.stock.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(lowStockLevel !== undefined && { lowStockLevel }),
      },
      include: { product: true, store: true },
    });

    // Record manual adjustment if quantity changed
    if (quantity !== undefined && quantity !== oldStock.quantity) {
      const difference = quantity - oldStock.quantity;
      await prisma.stockMovement.create({
        data: {
          stockId: id,
          type: "MANUAL_ADJUSTMENT",
          quantity: difference,
        },
      });
    }

    const shouldNotify =
      oldStock.quantity >= oldStock.lowStockLevel &&
      stock.quantity < stock.lowStockLevel;

    if (shouldNotify) {
      const existingAlert = await prisma.notification.findFirst({
        where: {
          storeId: stock.storeId,
          type: "SYSTEM_ALERT",
          referenceId: stock.productId,
          read: false,
        },
      });

      if (!existingAlert) {
        await prisma.notification.create({
          data: {
            storeId: stock.storeId,
            type: "SYSTEM_ALERT",
            message: `Low stock: ${stock.product?.name ?? "Product"} (${stock.quantity} left)`,
            referenceId: stock.productId,
          },
        });
      }
    }

    res.json(stock);
  } catch (error) {
    console.error("updateStock error:", error);
    res.status(500).json({ message: "Error updating stock" });
  }
};

export const getLowStockProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    // Fetch all stocks for the store and filter in JavaScript
    const stocks = await prisma.stock.findMany({
      where: {
        storeId,
      },
      include: {
        product: { include: { brand: true } },
        store: true,
      },
    });

    // Filter for low stock items (quantity < lowStockLevel)
    const lowStockItems = stocks.filter((stock: { quantity: number; lowStockLevel: number }) =>
      stock.quantity < stock.lowStockLevel
    );

    res.json(lowStockItems);
  } catch (error) {
    console.error("getLowStockProducts error:", error);
    res.status(500).json({ message: "Error retrieving low stock products" });
  }
};

export const getStockMovementHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { stockId } = req.query;
    const movementType = req.query.type?.toString();

    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(stockId && { stockId: stockId.toString() }),
        ...(movementType && { type: movementType as any }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(movements);
  } catch (error) {
    console.error("getStockMovementHistory error:", error);
    res.status(500).json({ message: "Error retrieving stock movement history" });
  }
};

export const getStockReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const stocks = await prisma.stock.findMany({
      where: { storeId },
      include: {
        product: { include: { brand: true, series: true } },
      },
    });

    let totalValue = 0;
    let lowStockCount = 0;
    const stockByBrand: Record<string, number> = {};

    for (const stock of stocks) {
      const inventoryValue = stock.quantity * stock.product.purchasePrice;
      totalValue += inventoryValue;

      if (stock.quantity < stock.lowStockLevel) {
        lowStockCount++;
      }

      const brandName = stock.product.brand?.name || "Unbranded";
      stockByBrand[brandName] = (stockByBrand[brandName] || 0) + stock.quantity;
    }

    res.json({
      stocks,
      summary: {
        totalProducts: stocks.length,
        totalQuantity: stocks.reduce((sum: number, s: { quantity: number }) => sum + s.quantity, 0),
        totalValue,
        lowStockCount,
        stockByBrand,
      },
    });
  } catch (error) {
    console.error("getStockReport error:", error);
    res.status(500).json({ message: "Error generating stock report" });
  }
};
