import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const category = req.query.category?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();
    const page = parseInt(req.query.page?.toString() || "1");
    const limit = parseInt(req.query.limit?.toString() || "50");
    const skip = (page - 1) * limit;

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
    const storeId = req.query.storeId?.toString();

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
    const { storeId, category, description, amount, date } = req.body;

    if (!storeId || !category || !amount) {
      res.status(400).json({ message: "storeId, category, and amount are required" });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        storeId,
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
    const { id } = req.params;
    const { category, description, amount, date } = req.body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json(expense);
  } catch (error) {
    console.error("updateExpense error:", error);
    res.status(500).json({ message: "Error updating expense" });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("deleteExpense error:", error);
    res.status(500).json({ message: "Error deleting expense" });
  }
};
