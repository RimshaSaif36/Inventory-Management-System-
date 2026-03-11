import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getDashboardMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    const popularProducts = await prisma.product.findMany({
      take: 15,
      orderBy: { sellingPrice: "desc" },
    });

    // Sales summary - last 30 days grouped by day
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...(storeId && { storeId }),
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group sales by date
    const salesByDate: Record<string, number> = {};
    for (const sale of recentSales) {
      const dateKey = sale.createdAt.toISOString().split("T")[0];
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.totalAmount;
    }
    const salesDates = Object.keys(salesByDate).sort();
    const salesSummary = salesDates.map((date, idx) => ({
      salesSummaryId: `ss-${idx}`,
      totalValue: salesByDate[date],
      changePercentage:
        idx > 0
          ? ((salesByDate[date] - salesByDate[salesDates[idx - 1]]) /
            (salesByDate[salesDates[idx - 1]] || 1)) *
          100
          : 0,
      date,
    }));

    // Purchase summary - last 30 days
    const recentPurchases = await prisma.purchase.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...(storeId && { storeId }),
      },
      select: { totalCost: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const purchasesByDate: Record<string, number> = {};
    for (const p of recentPurchases) {
      const dateKey = p.createdAt.toISOString().split("T")[0];
      purchasesByDate[dateKey] = (purchasesByDate[dateKey] || 0) + p.totalCost;
    }
    const purchaseDates = Object.keys(purchasesByDate).sort();
    const purchaseSummary = purchaseDates.map((date, idx) => ({
      purchaseSummaryId: `ps-${idx}`,
      totalPurchased: purchasesByDate[date],
      changePercentage:
        idx > 0
          ? ((purchasesByDate[date] - purchasesByDate[purchaseDates[idx - 1]]) /
            (purchasesByDate[purchaseDates[idx - 1]] || 1)) *
          100
          : 0,
      date,
    }));

    // Expense summary
    const expenseAgg = await prisma.expense.aggregate({
      where: storeId ? { storeId } : undefined,
      _sum: { amount: true },
    });
    const expenseSummary = [
      {
        expenseSummarId: "es-1",
        totalExpenses: expenseAgg._sum.amount || 0,
        date: new Date().toISOString(),
      },
    ];

    // Expense by category
    const expenseByCategory = await prisma.expense.groupBy({
      by: ["category"],
      where: storeId ? { storeId } : undefined,
      _sum: { amount: true },
    });
    const expenseByCategorySummary = expenseByCategory.map((e, idx) => ({
      expenseByCategorySummaryId: `ebc-${idx}`,
      category: e.category,
      amount: String(e._sum.amount || 0),
      date: new Date().toISOString(),
    }));

    res.json({
      popularProducts,
      salesSummary,
      purchaseSummary,
      expenseSummary,
      expenseByCategorySummary,
    });
  } catch (error) {
    console.error("getDashboardMetrics error:", error);
    res.status(500).json({ message: "Error retrieving dashboard metrics" });
  }
};

// Employee Sales Report - Admin only
export const getEmployeeSalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get all salesmen/accountants who have sales
    const salesByUser = await prisma.sale.groupBy({
      by: ["userId"],
      where: {
        ...(storeId && { storeId }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Get user details
    const userIds = salesByUser.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const report = salesByUser.map((s) => {
      const user = userMap.get(s.userId);
      return {
        userId: s.userId,
        name: user?.name || "Unknown",
        email: user?.email || "",
        role: user?.role || "",
        totalSales: s._sum.totalAmount || 0,
        transactionCount: s._count,
      };
    });

    // Sort by total sales descending
    report.sort((a, b) => b.totalSales - a.totalSales);

    res.json(report);
  } catch (error) {
    console.error("getEmployeeSalesReport error:", error);
    res.status(500).json({ message: "Error generating employee sales report" });
  }
};

// Admin overview stats
export const getAdminOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todaySalesAgg,
      totalCustomers,
      pendingOrders,
      unreadNotifications,
      unapprovedPOS,
      totalProducts,
      lowStockItems,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          ...(storeId && { storeId }),
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.customer.count(),
      prisma.salesOrder.count({
        where: {
          status: { in: ["PENDING", "RESERVED", "CONFIRMED"] },
          ...(storeId && { storeId }),
        },
      }),
      prisma.notification.count({
        where: {
          read: false,
          ...(storeId && { storeId }),
        },
      }),
      prisma.sale.count({
        where: {
          approved: false,
          ...(storeId && { storeId }),
        },
      }),
      prisma.product.count(),
      prisma.stock.count({
        where: {
          ...(storeId && { storeId }),
          quantity: { lte: 5 },
        },
      }),
    ]);

    res.json({
      todaySales: todaySalesAgg._sum.totalAmount || 0,
      todayTransactions: todaySalesAgg._count,
      totalCustomers,
      pendingOrders,
      unreadNotifications,
      unapprovedPOS,
      totalProducts,
      lowStockItems,
    });
  } catch (error) {
    console.error("getAdminOverview error:", error);
    res.status(500).json({ message: "Error retrieving admin overview" });
  }
};
