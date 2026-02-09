import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getModels = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const categoryId = req.query.categoryId?.toString();
    
    const models = await prisma.model.findMany({
      where: {
        ...(search && {
          name: {
            contains: search,
          },
        }),
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          include: {
            brand: true,
          },
        },
        Products: true,
      },
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving models" });
  }
};

export const getModelById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { modelId } = req.params;
    const model = await prisma.model.findUnique({
      where: { modelId },
      include: {
        category: {
          include: {
            brand: true,
          },
        },
        Products: true,
      },
    });
    
    if (!model) {
      res.status(404).json({ message: "Model not found" });
      return;
    }
    
    res.json(model);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving model" });
  }
};

export const createModel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { modelId, name, description, categoryId } = req.body;
    
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { categoryId },
    });
    
    if (!category) {
      res.status(400).json({ message: "Category not found" });
      return;
    }
    
    const model = await prisma.model.create({
      data: {
        modelId,
        name,
        description,
        categoryId,
      },
      include: {
        category: {
          include: {
            brand: true,
          },
        },
      },
    });
    res.status(201).json(model);
  } catch (error) {
    res.status(500).json({ message: "Error creating model" });
  }
};

export const updateModel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { modelId } = req.params;
    const { name, description, categoryId } = req.body;
    
    // If categoryId is being updated, check if new category exists
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { categoryId },
      });
      
      if (!category) {
        res.status(400).json({ message: "Category not found" });
        return;
      }
    }
    
    const model = await prisma.model.update({
      where: { modelId },
      data: {
        name,
        description,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          include: {
            brand: true,
          },
        },
      },
    });
    
    res.json(model);
  } catch (error) {
    res.status(500).json({ message: "Error updating model" });
  }
};

export const deleteModel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { modelId } = req.params;
    
    // Check if model has products
    const productsCount = await prisma.products.count({
      where: { modelId },
    });
    
    if (productsCount > 0) {
      res.status(400).json({ 
        message: "Cannot delete model with existing products. Please delete products first." 
      });
      return;
    }
    
    await prisma.model.delete({
      where: { modelId },
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting model" });
  }
};