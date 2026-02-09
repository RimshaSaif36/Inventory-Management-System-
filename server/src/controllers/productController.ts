import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const modelId = req.query.modelId?.toString();

    const products = await prisma.products.findMany({
      where: {
        ...(search && {
          name: {
            contains: search,
          },
        }),
        ...(modelId && { modelId }),
      },
      include: {
        model: {
          include: {
            category: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving products" });
  }
};

export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const product = await prisma.products.findUnique({
      where: { productId },
      include: {
        model: {
          include: {
            category: {
              include: {
                brand: true,
              },
            },
          },
        },
        Sales: true,
        Purchases: true,
      },
    });

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving product" });
  }
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId, name, price, rating, stockQuantity, modelId } = req.body;

    // Check if model exists
    const model = await prisma.model.findUnique({
      where: { modelId },
    });

    if (!model) {
      res.status(400).json({ message: "Model not found" });
      return;
    }

    const product = await prisma.products.create({
      data: {
        productId,
        name,
        price,
        rating,
        stockQuantity,
        modelId,
      },
      include: {
        model: {
          include: {
            category: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    const { name, price, rating, stockQuantity, modelId } = req.body;

    // If modelId is being updated, check if new model exists
    if (modelId) {
      const model = await prisma.model.findUnique({
        where: { modelId },
      });

      if (!model) {
        res.status(400).json({ message: "Model not found" });
        return;
      }
    }

    const product = await prisma.products.update({
      where: { productId },
      data: {
        name,
        price,
        rating,
        stockQuantity,
        ...(modelId && { modelId }),
      },
      include: {
        model: {
          include: {
            category: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;

    await prisma.products.delete({
      where: { productId },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};
