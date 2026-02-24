import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getSuppliers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(search && { name: { contains: search } }),
      },
      include: { purchases: { take: 5 } },
    });

    res.json(suppliers);
  } catch (error) {
    console.error("getSuppliers error:", error);
    res.status(500).json({ message: "Error retrieving suppliers" });
  }
};

export const getSupplierById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { purchases: true },
    });

    if (!supplier) {
      res.status(404).json({ message: "Supplier not found" });
      return;
    }

    res.json(supplier);
  } catch (error) {
    console.error("getSupplierById error:", error);
    res.status(500).json({ message: "Error retrieving supplier" });
  }
};

export const createSupplier = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, contactInfo } = req.body;

    if (!name) {
      res.status(400).json({ message: "Supplier name is required" });
      return;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactInfo: contactInfo || null,
      },
    });

    res.status(201).json(supplier);
  } catch (error) {
    console.error("createSupplier error:", error);
    res.status(500).json({ message: "Error creating supplier" });
  }
};

export const updateSupplier = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, contactInfo } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(contactInfo !== undefined && { contactInfo }),
      },
    });

    res.json(supplier);
  } catch (error) {
    console.error("updateSupplier error:", error);
    res.status(500).json({ message: "Error updating supplier" });
  }
};

export const deleteSupplier = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.supplier.delete({
      where: { id },
    });

    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("deleteSupplier error:", error);
    res.status(500).json({ message: "Error deleting supplier" });
  }
};
