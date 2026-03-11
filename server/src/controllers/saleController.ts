import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getSales = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const customerId = req.query.customerId?.toString();
    const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
    const pageSize = Math.min(50, parseInt(req.query.pageSize?.toString() || "20"));
    const skip = (page - 1) * pageSize;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...(storeId && { storeId }),
          ...(customerId && { customerId }),
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, sellingPrice: true, imageUrl: true } } } },
          customer: { select: { id: true, name: true } },
          store: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({
        where: {
          ...(storeId && { storeId }),
          ...(customerId && { customerId }),
        },
      }),
    ]);

    res.json({ data: sales, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error("getSales error:", error);
    res.status(500).json({ message: "Error retrieving sales" });
  }
};

export const getSaleById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        store: true,
        invoice: true,
      },
    });

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    res.json(sale);
  } catch (error) {
    console.error("getSaleById error:", error);
    res.status(500).json({ message: "Error retrieving sale" });
  }
};

export const createSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requestWithUser = req as Request & { userId?: string; user?: { id?: string; storeId?: string } };
    const {
      storeId: storeIdBody,
      userId: userIdBody,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      items,
      paymentMethod,
    } = req.body;

    const resolvedUserId = userIdBody || requestWithUser.userId || requestWithUser.user?.id;
    let resolvedStoreId = storeIdBody || requestWithUser.user?.storeId;

    if (!paymentMethod || !items) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    if (!resolvedUserId) {
      res.status(400).json({ message: "User is required" });
      return;
    }

    const normalizedItems = Array.isArray(items)
      ? items.filter((item) => item?.productId && Number(item?.quantity) > 0)
      : [];

    if (normalizedItems.length === 0) {
      res.status(400).json({ message: "No valid items provided" });
      return;
    }

    const normalizedName = typeof customerName === "string" ? customerName.trim() : "";
    const normalizedPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";
    const normalizedEmail = typeof customerEmail === "string" ? customerEmail.trim() : "";

    let resolvedCustomerId = typeof customerId === "string" && customerId.trim() ? customerId.trim() : null;

    if (!resolvedCustomerId && (normalizedName || normalizedPhone || normalizedEmail)) {
      let existingCustomer = null as { id: string } | null;

      if (normalizedEmail) {
        existingCustomer = await prisma.customer.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        });
      }

      if (!existingCustomer && normalizedPhone) {
        existingCustomer = await prisma.customer.findFirst({
          where: { phone: normalizedPhone },
          select: { id: true },
        });
      }

      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      } else {
        const createdCustomer = await prisma.customer.create({
          data: {
            name: normalizedName || "Walk-in",
            phone: normalizedPhone || null,
            email: normalizedEmail || null,
            customerType: "POS",
          },
          select: { id: true },
        });
        resolvedCustomerId = createdCustomer.id;
      }
    }

    if (resolvedStoreId) {
      const store = await prisma.store.findUnique({ where: { id: resolvedStoreId } });
      if (!store) {
        res.status(400).json({ message: "Store not found" });
        return;
      }
    } else {
      let defaultStore = await prisma.store.findFirst({ where: { name: "Default Store" } });
      if (!defaultStore) {
        defaultStore = await prisma.store.create({
          data: { name: "Default Store", location: "Main Warehouse" },
        });
      }
      resolvedStoreId = defaultStore.id;
    }

    let totalAmount = 0;
    for (const item of normalizedItems) {
      totalAmount += item.total || item.unitPrice * item.quantity;
    }

    const sale = await prisma.sale.create({
      data: {
        storeId: resolvedStoreId,
        userId: resolvedUserId,
        customerId: resolvedCustomerId,
        totalAmount,
        paymentMethod,
        items: {
          create: normalizedItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total || item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    // Update stock for each product
    for (const item of normalizedItems) {
      const stock = await prisma.stock.findUnique({
        where: {
          storeId_productId: {
            storeId: resolvedStoreId,
            productId: item.productId,
          },
        },
        include: { product: true },
      });

      if (stock) {
        const newQuantity = stock.quantity - item.quantity;
        await prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: newQuantity },
        });

        await prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: "POS_SALE",
            quantity: -item.quantity,
            referenceId: sale.id,
          },
        });

        const shouldNotify =
          stock.quantity >= stock.lowStockLevel &&
          newQuantity < stock.lowStockLevel;

        if (shouldNotify) {
          const existingAlert = await prisma.notification.findFirst({
            where: {
              storeId: resolvedStoreId,
              type: "SYSTEM_ALERT",
              referenceId: stock.productId,
              read: false,
            },
          });

          if (!existingAlert) {
            await prisma.notification.create({
              data: {
                storeId: resolvedStoreId,
                type: "SYSTEM_ALERT",
                message: `Low stock: ${stock.product?.name ?? "Product"} (${newQuantity} left)`,
                referenceId: stock.productId,
              },
            });
          }
        }
      }
    }

    // Auto-generate invoice
    const invoice = await prisma.invoice.create({
      data: {
        storeId: resolvedStoreId,
        saleId: sale.id,
        totalAmount,
        paymentMethod,
        invoiceNumber: `POS-${Date.now()}`,
        status: "PAID",
      },
    });

    // Create admin notification for new POS invoice
    await prisma.notification.create({
      data: {
        storeId: resolvedStoreId,
        type: "NEW_POS_INVOICE",
        message: `New POS invoice created. Total: PKR ${totalAmount.toFixed(2)}`,
        referenceId: sale.id,
      },
    });

    res.status(201).json({ ...sale, invoice });
  } catch (error) {
    console.error("createSale error:", error);
    res.status(500).json({ message: "Error creating sale" });
  }
};

export const updateSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        ...(paymentMethod && { paymentMethod }),
      },
      include: { items: { include: { product: true } } },
    });

    res.json(sale);
  } catch (error) {
    console.error("updateSale error:", error);
    res.status(500).json({ message: "Error updating sale" });
  }
};

export const approveSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestWithUser = req as Request & { user?: { id: string } };
    const adminId = requestWithUser.user?.id;

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    if (sale.approved) {
      res.status(400).json({ message: "Sale is already approved" });
      return;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: { approved: true, approvedBy: adminId },
      include: { items: { include: { product: true } }, customer: true, invoice: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("approveSale error:", error);
    res.status(500).json({ message: "Error approving sale" });
  }
};

export const deleteSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.sale.delete({
      where: { id },
    });

    res.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("deleteSale error:", error);
    res.status(500).json({ message: "Error deleting sale" });
  }
};

export const getSalesReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const startDate = req.query.startDate?.toString();
    const endDate = req.query.endDate?.toString();

    const sales = await prisma.sale.findMany({
      where: {
        ...(storeId && { storeId }),
        ...(startDate && endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalSales = sales.reduce(
      (sum: number, sale: { totalAmount?: number }) => sum + (sale.totalAmount ?? 0),
      0
    );
    const totalTransactions = sales.length;

    res.json({
      sales,
      summary: {
        totalSales,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      },
    });
  } catch (error) {
    console.error("getSalesReport error:", error);
    res.status(500).json({ message: "Error generating sales report" });
  }
};
