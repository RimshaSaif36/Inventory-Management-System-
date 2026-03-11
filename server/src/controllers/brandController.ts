import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getBrands = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const search = req.query.search?.toString();
        const brands = await prisma.brand.findMany({
            where: {
                ...(search && {
                    name: {
                        contains: search,
                    },
                }),
            },
            include: {
                categories: {
                    include: {
                        series: true,
                    },
                },
            },
        });
        res.json(brands);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving brands" });
    }
};

export const getBrandById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { brandId } = req.params;
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: {
                categories: { include: { series: true } },
            },
        });

        if (!brand) {
            res.status(404).json({ message: "Brand not found" });
            return;
        }

        res.json(brand);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving brand" });
    }
};

export const createBrand = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { name, description } = req.body;
        const brand = await prisma.brand.create({ data: { name, description } });
        res.status(201).json(brand);
    } catch (error) {
        res.status(500).json({ message: "Error creating brand" });
    }
};

export const updateBrand = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { brandId } = req.params;
        const { name, description } = req.body;

        const brand = await prisma.brand.update({ 
            where: { id: brandId }, 
            data: { 
                ...(name && { name }),
                ...(description !== undefined && { description })
            } 
        });

        res.json(brand);
    } catch (error) {
        res.status(500).json({ message: "Error updating brand" });
    }
};

export const deleteBrand = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { brandId } = req.params;

        if (!brandId) {
            res.status(400).json({ message: "Brand ID is required" });
            return;
        }

        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            select: { id: true },
        });

        if (!brand) {
            res.status(404).json({ message: "Brand not found" });
            return;
        }

        const categories = await prisma.category.findMany({
            where: { brandId },
            select: { id: true },
        });
        const categoryIds = categories.map((category) => category.id);

        const series = categoryIds.length > 0
            ? await prisma.series.findMany({
                where: { categoryId: { in: categoryIds } },
                select: { id: true },
            })
            : [];
        const seriesIds = series.map((item) => item.id);

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { brandId },
                    ...(seriesIds.length > 0 ? [{ seriesId: { in: seriesIds } }] : []),
                ],
            },
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
                    "Cannot delete brand because some products are referenced by sales, orders, purchases, or quotations. Remove related records first.",
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
            if (categoryIds.length > 0) {
                await tx.category.deleteMany({
                    where: { id: { in: categoryIds } },
                });
            }
            await tx.brand.delete({ where: { id: brandId } });
        });

        res.status(204).send();
    } catch (error: any) {
        if (error?.code === "P2025") {
            res.status(404).json({ message: "Brand not found" });
            return;
        }
        if (error?.code === "P2003") {
            res.status(400).json({ message: "Cannot delete brand because it is referenced by other records." });
            return;
        }
        res.status(500).json({ message: "Error deleting brand" });
    }
};