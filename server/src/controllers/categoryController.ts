import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getCategories = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const search = req.query.search?.toString();
        const brandId = req.query.brandId?.toString();
        const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
        const pageSize = Math.min(100, parseInt(req.query.pageSize?.toString() || "50"));
        const skip = (page - 1) * pageSize;

        const whereClause = {
            ...(search && {
                name: {
                    contains: search,
                },
            }),
            ...(brandId && { brandId }),
        };

        const [categories, total] = await Promise.all([
            prisma.category.findMany({
                where: whereClause,
                include: {
                    brand: true,
                    series: true,
                },
                skip,
                take: pageSize,
                orderBy: { name: "asc" },
            }),
            prisma.category.count({ where: whereClause }),
        ]);
        res.json({ data: categories, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving categories" });
    }
};

export const getCategoryById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { categoryId } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            include: { brand: true, series: true },
        });

        if (!category) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving category" });
    }
};

export const createCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, description, brandId } = req.body;

        console.log("Creating category with:", { name, description, brandId });

        // Check if brand exists
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });

        if (!brand) {
            console.error(`Brand not found with id: ${brandId}`);
            res.status(400).json({ message: `Brand not found with id: ${brandId}` });
            return;
        }

        const category = await prisma.category.create({
            data: { name, description, brandId },
            include: { brand: true }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Error creating category", error: (error as Error).message });
    }
};

export const updateCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { categoryId } = req.params;
        const { name, description, brandId } = req.body;

        // If brandId is being updated, check if new brand exists
        if (brandId) {
            const brand = await prisma.brand.findUnique({ where: { id: brandId } });

            if (!brand) {
                res.status(400).json({ message: "Brand not found" });
                return;
            }
        }

        const category = await prisma.category.update({
            where: { id: categoryId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(brandId && { brandId })
            },
            include: { brand: true },
        });

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: "Error updating category" });
    }
};

export const deleteCategory = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { categoryId } = req.params;

        if (!categoryId) {
            res.status(400).json({ message: "Category ID is required" });
            return;
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true },
        });

        if (!category) {
            res.status(404).json({ message: "Category not found" });
            return;
        }

        const series = await prisma.series.findMany({
            where: { categoryId },
            select: { id: true },
        });
        const seriesIds = series.map((item) => item.id);

        let products: Array<{ id: string; _count: { saleItems: number; orderItems: number; purchaseItems: number; quotationItems: number } }> = [];
        if (seriesIds.length > 0) {
            products = await prisma.product.findMany({
                where: { seriesId: { in: seriesIds } },
                select: {
                    id: true,
                    _count: {
                        select: {
                            saleItems: true,
                            orderItems: true,
                            purchaseItems: true,
                            quotationItems: true,
                        },
                    },
                },
            });
        }

        const blockedProducts = products.filter((product) => {
            const counts = product._count;
            return (
                counts.saleItems > 0 ||
                counts.orderItems > 0 ||
                counts.purchaseItems > 0 ||
                counts.quotationItems > 0
            );
        });

        if (blockedProducts.length > 0) {
            res.status(400).json({
                message:
                    "Cannot delete category because some products are referenced by sales, orders, purchases, or quotations. Remove related records first.",
            });
            return;
        }

        const productIds = products.map((product) => product.id);

        await prisma.$transaction(async (tx) => {
            if (productIds.length > 0) {
                await tx.stockMovement.deleteMany({
                    where: { stock: { productId: { in: productIds } } },
                });
                await tx.stock.deleteMany({
                    where: { productId: { in: productIds } },
                });
                await tx.product.deleteMany({
                    where: { id: { in: productIds } },
                });
            }
            if (seriesIds.length > 0) {
                await tx.series.deleteMany({
                    where: { id: { in: seriesIds } },
                });
            }
            await tx.category.delete({ where: { id: categoryId } });
        });

        res.status(204).send();
    } catch (error: any) {
        if (error?.code === "P2025") {
            res.status(404).json({ message: "Category not found" });
            return;
        }
        if (error?.code === "P2003") {
            res.status(400).json({ message: "Cannot delete category because it is referenced by other records." });
            return;
        }
        res.status(500).json({ message: "Error deleting category" });
    }
};