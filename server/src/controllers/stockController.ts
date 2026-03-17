import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const getOrCreateDefaultStore = async () => {
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

  return defaultStore;
};

const LOW_STOCK_RECIPIENT_ROLES = ["ADMIN", "ACCOUNTANT"] as const;
const DEFAULT_LOW_STOCK_LEVEL = 5;

const normalizeLowStockLevel = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LOW_STOCK_LEVEL;
  }
  return Math.floor(parsed);
};

const createLowStockNotifications = async (
  dbClient: any,
  {
    storeId,
    productId,
    productName,
    quantity,
  }: {
    storeId: string;
    productId: string;
    productName?: string | null;
    quantity: number;
  }
) => {
  const message = `Low stock: ${productName ?? "Product"} (${quantity} left)`;

  for (const role of LOW_STOCK_RECIPIENT_ROLES) {
    const existingAlert = await dbClient.notification.findFirst({
      where: {
        storeId,
        type: "SYSTEM_ALERT",
        referenceId: productId,
        read: false,
        recipientRole: role,
      },
    });

    if (!existingAlert) {
      await dbClient.notification.create({
        data: {
          storeId,
          type: "SYSTEM_ALERT",
          message,
          referenceId: productId,
          recipientRole: role,
        },
      });
    }
  }
};

export const createStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, quantity, lowStockLevel } = req.body;
    const normalizedLowStockLevel = normalizeLowStockLevel(lowStockLevel);

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
    const defaultStore = await getOrCreateDefaultStore();

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
        lowStockLevel: normalizedLowStockLevel,
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

    if (stock.quantity < normalizedLowStockLevel) {
      await createLowStockNotifications(prisma, {
        storeId: stock.storeId,
        productId: stock.productId,
        productName: stock.product?.name,
        quantity: stock.quantity,
      });
    }

    res.status(201).json(stock);
  } catch (error: any) {
    console.error("createStock error:", error);
    res.status(500).json({ message: error.message || "Error creating stock" });
  }
};

export const createStockRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId, quantity, lowStockLevel, storeId } = req.body;
    const requesterId = req.user?.id;

    if (!requesterId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsedQuantity = Number(quantity);
    if (!productId || !Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      res.status(400).json({ message: "Product ID and valid quantity are required" });
      return;
    }

    const parsedLowStock = normalizeLowStockLevel(lowStockLevel);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    let targetStoreId = typeof storeId === "string" && storeId.trim() ? storeId : req.user?.storeId;

    if (targetStoreId) {
      const store = await prisma.store.findUnique({ where: { id: targetStoreId } });
      if (!store) {
        res.status(400).json({ message: "Store not found" });
        return;
      }
    } else {
      const defaultStore = await getOrCreateDefaultStore();
      targetStoreId = defaultStore.id;
    }

    const existingRequest = await prisma.stockRequest.findFirst({
      where: {
        storeId: targetStoreId,
        productId,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      res.status(409).json({ message: "A pending request already exists for this product" });
      return;
    }

    const stockRequest = await prisma.stockRequest.create({
      data: {
        storeId: targetStoreId,
        productId,
        quantity: parsedQuantity,
        lowStockLevel: parsedLowStock,
        requestedById: requesterId,
        status: "PENDING",
      },
      include: {
        store: true,
        product: { include: { brand: true, series: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(201).json(stockRequest);
  } catch (error: any) {
    console.error("createStockRequest error:", error);
    res.status(500).json({ message: error.message || "Error creating stock request" });
  }
};

export const getStockRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status?.toString()?.toUpperCase();
    const storeId = req.query.storeId?.toString();

    const whereClause: any = {
      status: status || "PENDING",
      ...(storeId && { storeId }),
    };

    if (req.user?.role !== "ADMIN") {
      whereClause.requestedById = req.user?.id;
    }

    const requests = await prisma.stockRequest.findMany({
      where: whereClause,
      include: {
        store: true,
        product: { include: { brand: true, series: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (error: any) {
    console.error("getStockRequests error:", error);
    res.status(500).json({ message: error.message || "Error retrieving stock requests" });
  }
};

export const approveStockRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const approverId = req.user?.id;

    if (!approverId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const request = await prisma.stockRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ message: "Stock request not found" });
      return;
    }

    if (request.status !== "PENDING") {
      res.status(400).json({ message: "Only pending requests can be approved" });
      return;
    }

    const approvedRequest = await prisma.$transaction(async (tx) => {
      const requestLowStockLevel = normalizeLowStockLevel(request.lowStockLevel);

      const existingStock = await tx.stock.findUnique({
        where: {
          storeId_productId: {
            storeId: request.storeId,
            productId: request.productId,
          },
        },
      });

      let stock = null;

      if (existingStock) {
        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: request.quantity,
            lowStockLevel: requestLowStockLevel,
          },
          include: { product: true, store: true },
        });

        if (request.quantity !== existingStock.quantity) {
          await tx.stockMovement.create({
            data: {
              stockId: existingStock.id,
              type: "APPROVED_ADJUSTMENT",
              quantity: request.quantity - existingStock.quantity,
            },
          });
        }
      } else {
        stock = await tx.stock.create({
          data: {
            storeId: request.storeId,
            productId: request.productId,
            quantity: request.quantity,
            lowStockLevel: requestLowStockLevel,
          },
          include: { product: true, store: true },
        });

        await tx.stockMovement.create({
          data: {
            stockId: stock.id,
            type: "APPROVED_INITIAL",
            quantity: request.quantity,
          },
        });
      }

      if (stock && stock.quantity < requestLowStockLevel) {
        await createLowStockNotifications(tx, {
          storeId: stock.storeId,
          productId: stock.productId,
          productName: stock.product?.name,
          quantity: stock.quantity,
        });
      }

      return tx.stockRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: approverId,
          approvedAt: new Date(),
        },
        include: {
          store: true,
          product: { include: { brand: true, series: true } },
          requestedBy: { select: { id: true, name: true, email: true, role: true } },
          approvedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    });

    res.json(approvedRequest);
  } catch (error: any) {
    console.error("approveStockRequest error:", error);
    res.status(500).json({ message: error.message || "Error approving stock request" });
  }
};

export const rejectStockRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const approverId = req.user?.id;

    if (!approverId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const request = await prisma.stockRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ message: "Stock request not found" });
      return;
    }

    if (request.status !== "PENDING") {
      res.status(400).json({ message: "Only pending requests can be rejected" });
      return;
    }

    const rejectedRequest = await prisma.stockRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        store: true,
        product: { include: { brand: true, series: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json(rejectedRequest);
  } catch (error: any) {
    console.error("rejectStockRequest error:", error);
    res.status(500).json({ message: error.message || "Error rejecting stock request" });
  }
};

export const getStockByStore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.query;
    const search = req.query.search?.toString();

    let resolvedStoreId = storeId?.toString();

    if (!resolvedStoreId) {
      const stores = await prisma.store.findMany({ take: 2, select: { id: true } });
      if (stores.length === 1) {
        resolvedStoreId = stores[0].id;
      } else if (stores.length === 0) {
        const defaultStore = await getOrCreateDefaultStore();
        resolvedStoreId = defaultStore.id;
      } else {
        res.status(400).json({ message: "storeId is required when multiple stores exist" });
        return;
      }
    }

    await prisma.stock.updateMany({
      where: {
        storeId: resolvedStoreId,
        lowStockLevel: { lte: 0 },
      },
      data: {
        lowStockLevel: DEFAULT_LOW_STOCK_LEVEL,
      },
    });

    const stocks = await prisma.stock.findMany({
      where: {
        storeId: resolvedStoreId,
        ...(search && {
          product: { name: { contains: search, mode: "insensitive" } },
        }),
      },
      include: {
        product: { include: { brand: true, series: true } },
        store: true,
      },
    });

    // Use an effective threshold to avoid treating 0/invalid values as "no threshold"
    const normalizedStocks = stocks.map((stock) => ({
      ...stock,
      lowStockLevel: normalizeLowStockLevel(stock.lowStockLevel),
    }));

    for (const stock of normalizedStocks) {
      if (stock.quantity < stock.lowStockLevel) {
        await createLowStockNotifications(prisma, {
          storeId: stock.storeId,
          productId: stock.productId,
          productName: stock.product?.name,
          quantity: stock.quantity,
        });
      }
    }

    res.json(normalizedStocks);
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
    const normalizedIncomingLowStockLevel =
      lowStockLevel !== undefined ? normalizeLowStockLevel(lowStockLevel) : undefined;

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
        ...(normalizedIncomingLowStockLevel !== undefined && {
          lowStockLevel: normalizedIncomingLowStockLevel,
        }),
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

    const previousLowStockLevel = normalizeLowStockLevel(oldStock.lowStockLevel);
    const currentLowStockLevel =
      normalizedIncomingLowStockLevel !== undefined
        ? normalizedIncomingLowStockLevel
        : previousLowStockLevel;

    const shouldNotify =
      oldStock.quantity >= previousLowStockLevel &&
      stock.quantity < currentLowStockLevel;

    if (shouldNotify) {
      await createLowStockNotifications(prisma, {
        storeId: stock.storeId,
        productId: stock.productId,
        productName: stock.product?.name,
        quantity: stock.quantity,
      });
    }

    res.json({
      ...stock,
      lowStockLevel: currentLowStockLevel,
    });
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
    const lowStockItems = stocks.filter((stock: { quantity: number; lowStockLevel: number }) => {
      const effectiveLowStockLevel = normalizeLowStockLevel(stock.lowStockLevel);
      return stock.quantity < effectiveLowStockLevel;
    });

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
    let storeId = req.query.storeId?.toString();

    if (!storeId) {
      const stores = await prisma.store.findMany({ take: 2, select: { id: true } });
      if (stores.length === 1) {
        storeId = stores[0].id;
      } else if (stores.length > 1) {
        res.status(400).json({ message: "storeId is required when multiple stores exist" });
        return;
      }
    }

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

      const effectiveLowStockLevel = normalizeLowStockLevel(stock.lowStockLevel);

      if (stock.quantity < effectiveLowStockLevel) {
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
