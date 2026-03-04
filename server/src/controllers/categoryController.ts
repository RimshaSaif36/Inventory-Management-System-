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

        // Check if category has series
        const seriesCount = await prisma.series.count({ where: { categoryId } });

        if (seriesCount > 0) {
            res.status(400).json({ message: "Cannot delete category with existing series. Please delete series first." });
            return;
        }

        await prisma.category.delete({ where: { id: categoryId } });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Error deleting category" });
    }
};