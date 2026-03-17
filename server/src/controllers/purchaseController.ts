import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const getOrCreateDefaultStore = async () => {
  let defaultStore = await prisma.store.findFirst({ where: { name: "Default Store" } });
  if (!defaultStore) {
    defaultStore = await prisma.store.create({
      data: { name: "Default Store", location: "Main Warehouse" },
    });
  }
  return defaultStore;
};

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
    const requestUser = req as AuthenticatedRequest;
    const { storeId: storeIdBody, supplierId, userId: userIdBody, items } = req.body;

    const resolvedUserId =
      (typeof userIdBody === "string" && userIdBody.trim() ? userIdBody : undefined) ||
      requestUser.userId ||
      requestUser.user?.id;

    let resolvedStoreId =
      (typeof storeIdBody === "string" && storeIdBody.trim() ? storeIdBody : undefined) ||
      requestUser.user?.storeId;

    if (!resolvedUserId) {
      res.status(400).json({ message: "User is required" });
      return;
    }

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "supplierId and at least one item are required" });
      return;
    }

    if (resolvedStoreId) {
      const store = await prisma.store.findUnique({ where: { id: resolvedStoreId } });
      if (!store) {
        res.status(400).json({ message: "Store not found" });
        return;
      }
    } else {
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

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      res.status(400).json({ message: "Supplier not found" });
      return;
    }

    const normalizedItems = items
      .map((item: any) => {
        const quantity = Number(item?.quantity);
        const unitCost = Number(item?.unitCost);
        const providedTotalCost = Number(item?.totalCost);

        return {
          productId: typeof item?.productId === "string" ? item.productId : "",
          quantity,
          unitCost,
          totalCost:
            Number.isFinite(providedTotalCost) && providedTotalCost >= 0
              ? providedTotalCost
              : quantity * unitCost,
        };
      })
      .filter(
        (item: any) =>
          item.productId &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.unitCost) &&
          item.unitCost >= 0
      );

    if (normalizedItems.length === 0) {
      res.status(400).json({ message: "All purchase items must have valid product, quantity and unit cost" });
      return;
    }

    const productIds = Array.from(new Set(normalizedItems.map((item: any) => item.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const existingProductIds = new Set(products.map((product) => product.id));
    const invalidProduct = productIds.find((productId: string) => !existingProductIds.has(productId));

    if (invalidProduct) {
      res.status(400).json({ message: `Invalid productId: ${invalidProduct}` });
      return;
    }

    const totalCost = normalizedItems.reduce((sum: number, item: any) => sum + item.totalCost, 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          storeId: resolvedStoreId,
          supplierId,
          userId: resolvedUserId,
          totalCost,
          items: {
            create: normalizedItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            })),
          },
        },
        include: {
          supplier: true,
          user: true,
          items: { include: { product: true } },
        },
      });

      for (const item of normalizedItems) {
        const stock = await tx.stock.findUnique({
          where: {
            storeId_productId: {
              storeId: resolvedStoreId,
              productId: item.productId,
            },
          },
        });

        let stockId = stock?.id;

        if (stock) {
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity + item.quantity },
          });
        } else {
          const createdStock = await tx.stock.create({
            data: {
              storeId: resolvedStoreId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
          stockId = createdStock.id;
        }

        if (stockId) {
          await tx.stockMovement.create({
            data: {
              stockId,
              type: "PURCHASE",
              quantity: item.quantity,
              referenceId: createdPurchase.id,
            },
          });
        }
      }

      return createdPurchase;
    });

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

    if (!id) {
      res.status(400).json({ message: "Purchase ID is required" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "At least one item is required" });
      return;
    }

    const normalizedItems = items
      .map((item: any) => {
        const quantity = Number(item?.quantity);
        const unitCost = Number(item?.unitCost);
        const providedTotalCost = Number(item?.totalCost);

        return {
          productId: typeof item?.productId === "string" ? item.productId : "",
          quantity,
          unitCost,
          totalCost:
            Number.isFinite(providedTotalCost) && providedTotalCost >= 0
              ? providedTotalCost
              : quantity * unitCost,
        };
      })
      .filter(
        (item: any) =>
          item.productId &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.unitCost) &&
          item.unitCost >= 0
      );

    if (normalizedItems.length === 0) {
      res.status(400).json({ message: "All items must have valid product, quantity and unit cost" });
      return;
    }

    const totalCost = normalizedItems.reduce((sum: number, item: any) => sum + item.totalCost, 0);

    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        totalCost,
        items: {
          deleteMany: {},
          create: normalizedItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    res.json(purchase);
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "Purchase not found" });
      return;
    }
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

    if (!id) {
      res.status(400).json({ message: "Purchase ID is required" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.delete({ where: { id } });
    });

    res.json({ message: "Purchase deleted successfully" });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "Purchase not found" });
      return;
    }
    console.error("deletePurchase error:", error);
    res.status(500).json({ message: "Error deleting purchase" });
  }
};
