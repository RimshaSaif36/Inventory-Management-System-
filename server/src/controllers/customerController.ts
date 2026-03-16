import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getCustomers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const search = req.query.search?.toString();
    const page = Math.max(1, parseInt(req.query.page?.toString() || "1"));
    const pageSize = Math.min(100, parseInt(req.query.pageSize?.toString() || "50"));
    const skip = (page - 1) * pageSize;

    const whereClause = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          sales: { take: 5 },
          orders: { take: 5 },
        },
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    res.json({ data: customers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
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
    const { name, phone, email, address } = req.body;

    if (!name) {
      res.status(400).json({ message: "Customer name is required" });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
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
    const { name, phone, email, address } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
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

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        sales: {
          select: {
            id: true,
            storeId: true,
            items: { select: { productId: true, quantity: true } },
          },
        },
        orders: {
          select: {
            id: true,
            storeId: true,
            status: true,
            items: { select: { productId: true, quantity: true } },
          },
        },
        quotations: { select: { id: true } },
      },
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const sale of customer.sales) {
        for (const item of sale.items) {
          const stock = await tx.stock.findUnique({
            where: {
              storeId_productId: {
                storeId: sale.storeId,
                productId: item.productId,
              },
            },
          });

          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: stock.quantity + item.quantity },
            });
          }
        }

        await tx.stockMovement.deleteMany({
          where: { referenceId: sale.id, type: "POS_SALE" },
        });
      }

      for (const order of customer.orders) {
        const normalizedStatus = (order.status || "").toUpperCase();
        const restoreQtyStatuses = ["DELIVERED", "COMPLETED", "INVOICED"];
        const shouldRestoreQty = restoreQtyStatuses.includes(normalizedStatus);
        const shouldReleaseReserved = !shouldRestoreQty;

        for (const item of order.items) {
          const stock = await tx.stock.findUnique({
            where: {
              storeId_productId: {
                storeId: order.storeId,
                productId: item.productId,
              },
            },
          });

          if (!stock) {
            continue;
          }

          if (shouldRestoreQty) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: stock.quantity + item.quantity },
            });
            continue;
          }

          if (shouldReleaseReserved) {
            const nextReserved = Math.max(0, stock.reservedQty - item.quantity);
            await tx.stock.update({
              where: { id: stock.id },
              data: { reservedQty: nextReserved },
            });
          }
        }

        await tx.stockMovement.deleteMany({
          where: {
            referenceId: order.id,
            type: { in: ["SALES_ORDER_RESERVE", "SALES_ORDER_DEDUCT"] },
          },
        });
      }

      const saleIds = customer.sales.map((sale) => sale.id);
      const orderIds = customer.orders.map((order) => order.id);
      const quotationIds = customer.quotations.map((quotation) => quotation.id);

      if (saleIds.length > 0 || orderIds.length > 0) {
        const invoiceWhere: { OR: Array<Record<string, unknown>> } = { OR: [] };
        if (saleIds.length > 0) {
          invoiceWhere.OR.push({ saleId: { in: saleIds } });
        }
        if (orderIds.length > 0) {
          invoiceWhere.OR.push({ salesOrderId: { in: orderIds } });
        }
        await tx.invoice.deleteMany({ where: invoiceWhere });
      }

      if (saleIds.length > 0) {
        await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
        await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
      }

      if (orderIds.length > 0) {
        await tx.salesOrderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.salesOrder.deleteMany({ where: { id: { in: orderIds } } });
      }

      if (quotationIds.length > 0) {
        await tx.quotation.deleteMany({ where: { id: { in: quotationIds } } });
      }

      await tx.customer.delete({ where: { id } });
    });

    res.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    console.error("deleteCustomer error:", error);
    if (error?.code === "P2025") {
      res.status(404).json({ message: "Customer not found" });
      return;
    }
    if (error?.code === "P2003") {
      res.status(400).json({ message: "Cannot delete customer because it is referenced by other records." });
      return;
    }
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
