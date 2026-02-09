import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const brandId = req.query.brandId?.toString();
    
    const categories = await prisma.category.findMany({
      where: {
        ...(search && {
          name: {
            contains: search,
          },
        }),
        ...(brandId && { brandId }),
      },
      include: {
        brand: true,
        Models: {
          include: {
            Products: true,
          },
        },
      },
    });
    res.json(categories);
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
      where: { categoryId },
      include: {
        brand: true,
        Models: {
          include: {
            Products: true,
          },
        },
      },
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
    const { categoryId, name, description, brandId } = req.body;
    
    // Check if brand exists
    const brand = await prisma.brand.findUnique({
      where: { brandId },
    });
    
    if (!brand) {
      res.status(400).json({ message: "Brand not found" });
      return;
    }
    
    const category = await prisma.category.create({
      data: {
        categoryId,
        name,
        description,
        brandId,
      },
      include: {
        brand: true,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error creating category" });
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
      const brand = await prisma.brand.findUnique({
        where: { brandId },
      });
      
      if (!brand) {
        res.status(400).json({ message: "Brand not found" });
        return;
      }
    }
    
    const category = await prisma.category.update({
      where: { categoryId },
      data: {
        name,
        description,
        ...(brandId && { brandId }),
      },
      include: {
        brand: true,
      },
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
    
    // Check if category has models
    const modelsCount = await prisma.model.count({
      where: { categoryId },
    });
    
    if (modelsCount > 0) {
      res.status(400).json({ 
        message: "Cannot delete category with existing models. Please delete models first." 
      });
      return;
    }
    
    await prisma.category.delete({
      where: { categoryId },
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting category" });
  }
};