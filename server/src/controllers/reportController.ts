import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getDailySalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const date = req.query.date?.toString() || new Date().toISOString().split("T")[0];

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        createdAt: { gte: startDate, lt: endDate },
      },
      include: { items: { include: { product: true } } },
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = sales.length;

    res.json({
      date,
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
    });
  } catch (error) {
    console.error("getDailySalesReport error:", error);
    res.status(500).json({ message: "Error generating daily sales report" });
  }
};

export const getWeeklySalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();

    if (!storeId || !startDate) {
      res.status(400).json({ message: "Store ID and start date are required" });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        createdAt: { gte: start, lt: end },
      },
      include: { items: { include: { product: true } } },
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = sales.length;

    res.json({
      weekStartDate: start,
      weekEndDate: end,
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageDaily: totalSales / 7,
      },
    });
  } catch (error) {
    console.error("getWeeklySalesReport error:", error);
    res.status(500).json({ message: "Error generating weekly sales report" });
  }
};

export const getMonthlySalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const year = req.query.year?.toString();
    const month = req.query.month?.toString();

    if (!storeId || !year || !month) {
      res.status(400).json({ message: "Store ID, year, and month are required" });
      return;
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);

    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        createdAt: { gte: startDate, lt: endDate },
      },
      include: { items: { include: { product: true } } },
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = sales.length;
    const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    res.json({
      monthStartDate: startDate,
      monthEndDate: endDate,
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageDaily: totalSales / days,
      },
    });
  } catch (error) {
    console.error("getMonthlySalesReport error:", error);
    res.status(500).json({ message: "Error generating monthly sales report" });
  }
};

export const getProfitReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        createdAt: { gte: start, lte: end },
      },
      include: { items: { include: { product: true } } },
    });

    const purchases = await prisma.purchase.findMany({
      where: {
        storeId,
        createdAt: { gte: start, lte: end },
      },
      include: { items: { include: { product: true } } },
    });

    let totalRevenue = 0;
    let totalCost = 0;

    for (const sale of sales) {
      totalRevenue += sale.totalAmount;
    }

    for (const purchase of purchases) {
      totalCost += purchase.totalCost;
    }

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    res.json({
      period: { start, end },
      totalRevenue,
      totalCost,
      profit,
      profitMargin: profitMargin.toFixed(2),
      salesTransactions: sales.length,
      purchaseTransactions: purchases.length,
    });
  } catch (error) {
    console.error("getProfitReport error:", error);
    res.status(500).json({ message: "Error generating profit report" });
  }
};

export const getPurchaseReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const supplierId = req.query.supplierId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        storeId,
        ...(supplierId && { supplierId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const supplierSummary: Record<string, number> = {};

    for (const purchase of purchases) {
      const supplierName = purchase.supplier.name;
      supplierSummary[supplierName] = (supplierSummary[supplierName] || 0) + purchase.totalCost;
    }

    res.json({
      purchases,
      summary: {
        totalPurchases,
        totalTransactions: purchases.length,
        supplierSummary,
      },
    });
  } catch (error) {
    console.error("getPurchaseReport error:", error);
    res.status(500).json({ message: "Error generating purchase report" });
  }
};

export const getDashboardOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    if (!storeId) {
      res.status(400).json({ message: "Store ID is required" });
      return;
    }

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await prisma.sale.aggregate({
      where: {
        storeId,
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Get total stock value
    const stocks = await prisma.stock.findMany({
      where: { storeId },
      include: { product: true },
    });

    let totalStockValue = 0;
    let lowStockCount = 0;

    for (const stock of stocks) {
      totalStockValue += stock.quantity * stock.product.purchasePrice;
      if (stock.quantity < stock.lowStockLevel) {
        lowStockCount++;
      }
    }

    // Get recent sales orders
    const pendingOrders = await prisma.salesOrder.count({
      where: {
        storeId,
        status: "PENDING",
      },
    });

    res.json({
      todaysSales: {
        totalAmount: todaySales._sum.totalAmount || 0,
        totalTransactions: todaySales._count,
      },
      inventory: {
        totalValue: totalStockValue,
        lowStockItems: lowStockCount,
        totalProducts: stocks.length,
      },
      pendingOrders,
    });
  } catch (error) {
    console.error("getDashboardOverview error:", error);
    res.status(500).json({ message: "Error generating dashboard overview" });
  }
};
