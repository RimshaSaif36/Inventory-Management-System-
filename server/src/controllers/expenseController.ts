import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Prisma } from "@prisma/client";

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    let storeId = req.query.storeId?.toString();
    const category = req.query.category?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();
    const page = parseInt(req.query.page?.toString() || "1");
    const limit = parseInt(req.query.limit?.toString() || "50");
    const skip = (page - 1) * limit;

    if (!storeId) {
      const stores = await prisma.store.findMany({ take: 2, select: { id: true } });
      if (stores.length === 1) {
        storeId = stores[0].id;
      } else if (stores.length > 1) {
        res.status(400).json({ message: "storeId is required when multiple stores exist" });
        return;
      }
    }

    const where: any = {
      ...(storeId && { storeId }),
      ...(category && { category }),
      ...(startDate && endDate && {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ data: expenses, total, page, limit });
  } catch (error) {
    console.error("getExpenses error:", error);
    res.status(500).json({ message: "Error retrieving expenses" });
  }
};

export const getExpensesByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    let storeId = req.query.storeId?.toString();

    if (!storeId) {
      const stores = await prisma.store.findMany({ take: 2, select: { id: true } });
      if (stores.length === 1) {
        storeId = stores[0].id;
      } else if (stores.length > 1) {
        res.status(400).json({ message: "storeId is required when multiple stores exist" });
        return;
      }
    }

    const grouped = await prisma.expense.groupBy({
      by: ["category"],
      where: storeId ? { storeId } : undefined,
      _sum: { amount: true },
      _count: { id: true },
    });

    const result = grouped.map((g) => ({
      category: g.category,
      totalAmount: g._sum.amount || 0,
      count: g._count.id,
    }));

    res.json(result);
  } catch (error) {
    console.error("getExpensesByCategory error:", error);
    res.status(500).json({ message: "Error retrieving expense summary" });
  }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestUser = req as AuthenticatedRequest;
    const { storeId: storeIdBody, category, description, amount, date } = req.body;
    let resolvedStoreId = storeIdBody || requestUser.user?.storeId;

    if (resolvedStoreId) {
      const store = await prisma.store.findUnique({ where: { id: resolvedStoreId } });
      if (!store) {
        res.status(400).json({ message: "Store not found" });
        return;
      }
    } else {
      const stores = await prisma.store.findMany({ take: 2, select: { id: true } });
      if (stores.length === 1) {
        resolvedStoreId = stores[0].id;
      } else if (stores.length === 0) {
        const defaultStore = await prisma.store.create({
          data: { name: "Default Store", location: "Main Warehouse" },
        });
        resolvedStoreId = defaultStore.id;
      } else {
        res.status(400).json({ message: "storeId is required when multiple stores exist" });
        return;
      }
    }

    if (!resolvedStoreId || !category || !amount) {
      res.status(400).json({ message: "storeId, category, and amount are required" });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        storeId: resolvedStoreId,
        category,
        description: description || null,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("createExpense error:", error);
    res.status(500).json({ message: "Error creating expense" });
  }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestUser = req as AuthenticatedRequest;
    const { id } = req.params;
    const { category, description, amount, date } = req.body;

    if (!id) {
      res.status(400).json({ message: "Expense ID is required" });
      return;
    }

    const parsedAmount = amount !== undefined ? Number(amount) : undefined;
    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      res.status(400).json({ message: "Amount must be a valid positive number" });
      return;
    }

    const where: any = { id };
    if (requestUser.user?.role !== "ADMIN" && requestUser.user?.storeId) {
      where.storeId = requestUser.user.storeId;
    }

    const existingExpense = await prisma.expense.findFirst({ where, select: { id: true } });
    if (!existingExpense) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    const expense = await prisma.expense.update({
      where: { id: existingExpense.id },
      data: {
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(parsedAmount !== undefined && { amount: parsedAmount }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json(expense);
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "Expense not found" });
      return;
    }
    console.error("updateExpense error:", error);
    res.status(500).json({ message: "Error updating expense" });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestUser = req as AuthenticatedRequest;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Expense ID is required" });
      return;
    }

    const where: any = { id };
    if (requestUser.user?.role !== "ADMIN" && requestUser.user?.storeId) {
      where.storeId = requestUser.user.storeId;
    }

    const existingExpense = await prisma.expense.findFirst({ where, select: { id: true } });
    if (!existingExpense) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    await prisma.expense.delete({ where: { id: existingExpense.id } });
    res.json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      res.status(404).json({ message: "Expense not found" });
      return;
    }
    console.error("deleteExpense error:", error);
    res.status(500).json({ message: "Error deleting expense" });
  }
};
