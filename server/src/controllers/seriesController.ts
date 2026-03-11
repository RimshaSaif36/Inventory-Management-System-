import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getSeries = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const search = req.query.search?.toString();
        const categoryId = req.query.categoryId?.toString();
        const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
        const pageSize = Math.min(100, parseInt(req.query.pageSize?.toString() || "50"));
        const skip = (page - 1) * pageSize;

        const whereClause = {
            ...(search && {
                name: {
                    contains: search,
                },
            }),
            ...(categoryId && { categoryId }),
        };

        const [series, total] = await Promise.all([
            prisma.series.findMany({
                where: whereClause,
                include: {
                    category: true,
                    products: true,
                },
                skip,
                take: pageSize,
                orderBy: { name: "asc" },
            }),
            prisma.series.count({ where: whereClause }),
        ]);
        res.json({ data: series, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
    } catch (error) {
        console.error("Error retrieving series:", error);
        res.status(500).json({ message: "Error retrieving series" });
    }
};

export const getSeriesById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const series = await prisma.series.findUnique({
            where: { id },
            include: { category: true, products: true },
        });

        if (!series) {
            res.status(404).json({ message: "Series not found" });
            return;
        }

        res.json(series);
    } catch (error) {
        console.error("Error retrieving series:", error);
        res.status(500).json({ message: "Error retrieving series" });
    }
};

export const createSeries = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, description, categoryId } = req.body;

        console.log("Creating series with:", { name, description, categoryId });

        // Check if category exists
        const category = await prisma.category.findUnique({ where: { id: categoryId } });

        if (!category) {
            console.error(`Category not found with id: ${categoryId}`);
            res.status(400).json({ message: `Category not found with id: ${categoryId}` });
            return;
        }

        const series = await prisma.series.create({ 
            data: { name, description, categoryId }, 
            include: { category: true } 
        });
        res.status(201).json(series);
    } catch (error) {
        console.error("Error creating series:", error);
        res.status(500).json({ message: "Error creating series", error: (error as Error).message });
    }
};

export const updateSeries = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description, categoryId } = req.body;

        // If categoryId is being updated, check if new category exists
        if (categoryId) {
            const category = await prisma.category.findUnique({ where: { id: categoryId } });

            if (!category) {
                res.status(400).json({ message: "Category not found" });
                return;
            }
        }

        const series = await prisma.series.update({
            where: { id },
            data: { 
                ...(name && { name }), 
                ...(description !== undefined && { description }), 
                ...(categoryId && { categoryId }) 
            },
            include: { category: true },
        });

        res.json(series);
    } catch (error) {
        console.error("Error updating series:", error);
        res.status(500).json({ message: "Error updating series" });
    }
};

export const deleteSeries = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ message: "Series ID is required" });
            return;
        }

        const series = await prisma.series.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!series) {
            res.status(404).json({ message: "Series not found" });
            return;
        }

        const products = await prisma.product.findMany({
            where: { seriesId: id },
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
                    "Cannot delete series because some products are referenced by sales, orders, purchases, or quotations. Remove related records first.",
            });
            return;
        }

        const productIds = products.map((product) => product.id);

        if (productIds.length > 0) {
            await prisma.$transaction(async (tx) => {
                await tx.stockMovement.deleteMany({
                    where: { stock: { productId: { in: productIds } } },
                });
                await tx.stock.deleteMany({
                    where: { productId: { in: productIds } },
                });
                await tx.product.deleteMany({
                    where: { id: { in: productIds } },
                });
                await tx.series.delete({ where: { id } });
            });

            res.status(204).send();
            return;
        }

        await prisma.series.delete({ where: { id } });

        res.status(204).send();
    } catch (error: any) {
        console.error("Error deleting series:", error);
        if (error?.code === "P2025") {
            res.status(404).json({ message: "Series not found" });
            return;
        }
        if (error?.code === "P2003") {
            res.status(400).json({ message: "Cannot delete series because it is referenced by other records." });
            return;
        }
        res.status(500).json({ message: "Error deleting series" });
    }
};
