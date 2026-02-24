import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();

    const customers = await prisma.customer.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      },
      include: {
        sales: { take: 5 },
        orders: { take: 5 },
      },
    });

    res.json(customers);
  } catch (error) {
    console.error("getCustomers error:", error);
    res.status(500).json({ message: "Error retrieving customers" });
  }
};

export const getCustomerById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { include: { items: true } },
        orders: { include: { items: true } },
      },
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error("getCustomerById error:", error);
    res.status(500).json({ message: "Error retrieving customer" });
  }
};

export const createCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, phone, email } = req.body;

    if (!name) {
      res.status(400).json({ message: "Customer name is required" });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error("createCustomer error:", error);
    res.status(500).json({ message: "Error creating customer" });
  }
};

export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
    });

    res.json(customer);
  } catch (error) {
    console.error("updateCustomer error:", error);
    res.status(500).json({ message: "Error updating customer" });
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("deleteCustomer error:", error);
    res.status(500).json({ message: "Error deleting customer" });
  }
};

export const getCustomerPurchaseHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const history = await prisma.customer.findUnique({
      where: { id },
      select: {
        sales: { include: { items: true, store: true } },
        orders: { include: { items: true, store: true } },
      },
    });

    if (!history) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    res.json(history);
  } catch (error) {
    console.error("getCustomerPurchaseHistory error:", error);
    res.status(500).json({ message: "Error retrieving purchase history" });
  }
};
