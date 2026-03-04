import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
        lowStockLevel: g._min.lowStockLevel || 0,
      };
    });
    const products = productsData.map((product: any) => ({
      ...product,
      totalStock: stockMap[product.id]?.totalStock || 0,
      lowStockLevel: stockMap[product.id]?.lowStockLevel || 0,
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
    const { name, brandId, seriesId, purchasePrice, sellingPrice, imageUrl } = req.body;

    // Validate that productId exists
    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    // Build update data object dynamically, only including provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (brandId !== undefined) updateData.brandId = brandId || null;
    if (seriesId !== undefined) updateData.seriesId = seriesId;
    if (purchasePrice !== undefined) updateData.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) updateData.sellingPrice = Number(sellingPrice);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { brand: true, series: true },
    });

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

    await prisma.product.delete({ where: { id: productId } });

    res.status(204).send();
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
};
