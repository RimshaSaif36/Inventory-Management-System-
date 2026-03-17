import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const DEFAULT_LOW_STOCK_LEVEL = 5;

const normalizeLowStockLevel = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LOW_STOCK_LEVEL;
  }
  return Math.floor(parsed);
};

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const seriesId = req.query.seriesId?.toString();
    const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
    const pageSize = Math.min(100, parseInt(req.query.pageSize?.toString() || "50"));
    const skip = (page - 1) * pageSize;

    // fetch products page with minimal joins
    const [productsData, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...(search && { name: { contains: search } }),
          ...(seriesId && { seriesId }),
        },
        select: {
          id: true,
          sku: true,
          name: true,
          brandId: true,
          seriesId: true,
          purchasePrice: true,
          sellingPrice: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          brand: { select: { id: true, name: true } },
          series: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true, brandId: true } },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({
        where: {
          ...(search && { name: { contains: search } }),
          ...(seriesId && { seriesId }),
        },
      }),
    ]);

    // compute stock totals using a separate grouped query for faster results
    const productIds = productsData.map((p: any) => p.id);
    let stockGroups: any[] = [];
    if (productIds.length > 0) {
      stockGroups = await (prisma.stock.groupBy as any)({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _sum: { quantity: true },
        _min: { lowStockLevel: true },
      });
    }
    const stockMap: Record<string, { totalStock: number; lowStockLevel: number }> = {};
    stockGroups.forEach((g: any) => {
      stockMap[g.productId] = {
        totalStock: g._sum.quantity || 0,
        lowStockLevel: normalizeLowStockLevel(g._min.lowStockLevel),
      };
    });
    const products = productsData.map((product: any) => ({
      ...product,
      totalStock: stockMap[product.id]?.totalStock || 0,
      lowStockLevel: stockMap[product.id]?.lowStockLevel || DEFAULT_LOW_STOCK_LEVEL,
    }));

    res.json({ data: products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ message: "Error retrieving products" });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { brand: true, series: true },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    res.status(500).json({ message: "Error retrieving product" });
  }
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, seriesId, purchasePrice, sellingPrice, imageUrl, brandId } = req.body;

    // Validate required fields
    if (!name || !seriesId) {
      res.status(400).json({ message: "Product name and series are required" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        seriesId,
        brandId: brandId || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        imageUrl,
      },
      include: { brand: true, series: true },
    });
    res.status(201).json(product);
  } catch (error: any) {
    console.error("createProduct error:", error);
    res.status(500).json({ message: error.message || "Error creating product" });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const {
      name,
      brandId,
      seriesId,
      purchasePrice,
      sellingPrice,
      imageUrl,
      sku,
      storeId,
      totalStock,
      lowStockLevel,
    } = req.body;

    // Validate that productId exists
    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    // Build update data object dynamically, only including provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku || null;
    if (brandId !== undefined) updateData.brandId = brandId || null;
    if (seriesId !== undefined) updateData.seriesId = seriesId;
    if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const parsedTotalStock = totalStock !== undefined ? Number(totalStock) : undefined;
    const parsedLowStockLevel = lowStockLevel !== undefined ? Number(lowStockLevel) : undefined;
    const totalStockValue = Number.isFinite(parsedTotalStock) ? parsedTotalStock : undefined;
    const lowStockValue = Number.isFinite(parsedLowStockLevel)
      ? normalizeLowStockLevel(parsedLowStockLevel)
      : undefined;
    const needsStockUpdate = totalStockValue !== undefined || lowStockValue !== undefined;

    let stockStoreId = typeof storeId === "string" && storeId.trim() ? storeId : undefined;
    if (needsStockUpdate) {
      if (stockStoreId) {
        const store = await prisma.store.findUnique({ where: { id: stockStoreId } });
        if (!store) {
          res.status(400).json({ message: "Store not found" });
          return;
        }
      } else {
        let defaultStore = await prisma.store.findFirst({ where: { name: "Default Store" } });
        if (!defaultStore) {
          defaultStore = await prisma.store.create({
            data: { name: "Default Store", location: "Main Warehouse" },
          });
        }
        stockStoreId = defaultStore.id;
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { brand: true, series: true },
    });

    if (stockStoreId && needsStockUpdate) {
      const existingStock = await prisma.stock.findUnique({
        where: { storeId_productId: { storeId: stockStoreId, productId } },
      });

      if (existingStock) {
        const nextQuantity = totalStockValue !== undefined ? totalStockValue : existingStock.quantity;
        const nextLowStock =
          lowStockValue !== undefined
            ? lowStockValue
            : normalizeLowStockLevel(existingStock.lowStockLevel);
        await prisma.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: nextQuantity,
            lowStockLevel: nextLowStock,
          },
        });

        if (totalStockValue !== undefined && nextQuantity !== existingStock.quantity) {
          await prisma.stockMovement.create({
            data: {
              stockId: existingStock.id,
              type: "MANUAL_ADJUSTMENT",
              quantity: nextQuantity - existingStock.quantity,
            },
          });
        }
      } else {
        const createdStock = await prisma.stock.create({
          data: {
            storeId: stockStoreId,
            productId,
            quantity: totalStockValue ?? 0,
            lowStockLevel: lowStockValue ?? DEFAULT_LOW_STOCK_LEVEL,
          },
        });

        if (totalStockValue !== undefined) {
          await prisma.stockMovement.create({
            data: {
              stockId: createdStock.id,
              type: "INITIAL",
              quantity: totalStockValue,
            },
          });
        }
      }
    }

    res.json(product);
  } catch (error: any) {
    console.error("updateProduct error:", error);
    // Provide more specific error messages
    if (error.code === "P2025") {
      res.status(404).json({ message: "Product not found" });
    } else {
      res.status(500).json({ message: error.message || "Error updating product" });
    }
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        _count: {
          select: {
            stocks: true,
            saleItems: true,
            orderItems: true,
            purchaseItems: true,
            quotationItems: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const {
      stocks,
      saleItems,
      orderItems,
      purchaseItems,
      quotationItems,
    } = product._count;
    const blockingTotal = saleItems + orderItems + purchaseItems + quotationItems;

    if (blockingTotal > 0) {
      const reasons: string[] = [];
      if (saleItems > 0) reasons.push("sales");
      if (orderItems > 0) reasons.push("sales orders");
      if (purchaseItems > 0) reasons.push("purchases");
      if (quotationItems > 0) reasons.push("quotations");

      res.status(400).json({
        message: `Cannot delete product with existing ${reasons.join(", ")}. Remove related records first.`,
      });
      return;
    }

    if (stocks > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.stockMovement.deleteMany({
          where: { stock: { productId } },
        });
        await tx.stock.deleteMany({ where: { productId } });
        await tx.product.delete({ where: { id: productId } });
      });

      res.status(204).send();
      return;
    }

    await prisma.product.delete({ where: { id: productId } });

    res.status(204).send();
  } catch (error: any) {
    console.error("deleteProduct error:", error);
    if (error?.code === "P2025") {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    if (error?.code === "P2003") {
      res.status(400).json({ message: "Cannot delete product because it is referenced by other records." });
      return;
    }
    res.status(500).json({ message: "Error deleting product" });
  }
};
