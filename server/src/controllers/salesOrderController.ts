import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getSalesOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const status = req.query.status?.toString();
    const customerId = req.query.customerId?.toString();

    const orders = await prisma.salesOrder.findMany({
      where: {
        ...(storeId && { storeId }),
        ...(status && { status: status as any }),
        ...(customerId && { customerId }),
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        store: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    res.json(orders);
  } catch (error) {
    console.error("getSalesOrders error:", error);
    res.status(500).json({ message: "Error retrieving sales orders" });
  }
};

export const getSalesOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        store: true,
        invoice: true,
      },
    });

    if (!order) {
      res.status(404).json({ message: "Sales order not found" });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error("getSalesOrderById error:", error);
    res.status(500).json({ message: "Error retrieving sales order" });
  }
};

export const createSalesOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { storeId, userId, customerId, items, expectedDelivery } = req.body;

    if (!storeId || !userId || !customerId || !items) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.total || item.unitPrice * item.quantity;
    }

    const order = await prisma.salesOrder.create({
      data: {
        storeId,
        userId,
        customerId,
        totalAmount,
        status: "PENDING",
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        items: {
          create: items.map((item: any) => ({
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

    // Reserve stock for each product
    for (const item of items) {
      const stock = await prisma.stock.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId: item.productId,
          },
        },
      });

      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: { reservedQty: stock.reservedQty + item.quantity },
        });

        await prisma.stockMovement.create({
          data: {
            stockId: stock.id,
            type: "SALES_ORDER_RESERVE",
            quantity: item.quantity,
            referenceId: order.id,
          },
        });
      }
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("createSalesOrder error:", error);
    res.status(500).json({ message: "Error creating sales order" });
  }
};

export const updateSalesOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: "Status is required" });
      return;
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ message: "Sales order not found" });
      return;
    }

    // If status changed to DELIVERED, deduct from reserved and actual stock
    if (status === "DELIVERED" && order.status !== "DELIVERED") {
      for (const item of order.items) {
        const stock = await prisma.stock.findUnique({
          where: {
            storeId_productId: {
              storeId: order.storeId,
              productId: item.productId,
            },
          },
        });

        if (stock) {
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              quantity: stock.quantity - item.quantity,
              reservedQty: stock.reservedQty - item.quantity,
            },
          });

          await prisma.stockMovement.create({
            data: {
              stockId: stock.id,
              type: "SALES_ORDER_DEDUCT",
              quantity: -item.quantity,
              referenceId: order.id,
            },
          });
        }
      }
    }

    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: status as any },
      include: { items: { include: { product: true } } },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("updateSalesOrderStatus error:", error);
    res.status(500).json({ message: "Error updating sales order" });
  }
};

export const deleteSalesOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.salesOrder.delete({
      where: { id },
    });

    res.json({ message: "Sales order deleted successfully" });
  } catch (error) {
    console.error("deleteSalesOrder error:", error);
    res.status(500).json({ message: "Error deleting sales order" });
  }
};

export const getSalesOrdersReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const status = req.query.status?.toString();

    const orders = await prisma.salesOrder.findMany({
      where: {
        ...(storeId && { storeId }),
        ...(status && { status: status as any }),
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    const statusSummary = {
      PENDING: 0,
      APPROVED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      INVOICED: 0,
    };

    let totalValue = 0;

    for (const order of orders) {
      statusSummary[order.status as keyof typeof statusSummary]++;
      totalValue += order.totalAmount;
    }

    res.json({
      orders,
      summary: {
        totalOrders: orders.length,
        totalValue,
        statusSummary,
      },
    });
  } catch (error) {
    console.error("getSalesOrdersReport error:", error);
    res.status(500).json({ message: "Error generating sales orders report" });
  }
};
