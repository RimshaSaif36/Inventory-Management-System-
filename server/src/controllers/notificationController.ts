import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const getRoleScopedWhere = (role?: string): Prisma.NotificationWhereInput => {
  const normalizedRole = role?.toUpperCase();
  if (!normalizedRole) {
    return { recipientRole: null };
  }

  return {
    OR: [
      { recipientRole: null } as Prisma.NotificationWhereInput,
      { recipientRole: normalizedRole } as Prisma.NotificationWhereInput,
    ],
  };
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const unreadOnly = req.query.unreadOnly === "true";
    const summaryOnly = req.query.summaryOnly === "true";
    const page = parseInt(req.query.page?.toString() || "1");
    const limit = parseInt(req.query.limit?.toString() || "20");
    const skip = (page - 1) * limit;

    let resolvedStoreId = storeId;
    if (!resolvedStoreId) {
      const stores = await prisma.store.findMany({ select: { id: true }, take: 2 });
      if (stores.length === 1) {
        resolvedStoreId = stores[0].id;
      }
    }

    const roleScopedWhere = getRoleScopedWhere(req.user?.role);

    const where: Prisma.NotificationWhereInput = {
      ...(resolvedStoreId && { storeId: resolvedStoreId }),
      ...(unreadOnly && { read: false }),
      ...roleScopedWhere,
    };

    const unreadWhere: Prisma.NotificationWhereInput = {
      ...(resolvedStoreId && { storeId: resolvedStoreId }),
      read: false,
      ...roleScopedWhere,
    };

    if (summaryOnly) {
      const unreadCount = await prisma.notification.count({ where: unreadWhere });
      res.json({ data: [], total: 0, page, limit, unreadCount });
      return;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: unreadWhere }),
    ]);

    res.json({ data: notifications, total, page, limit, unreadCount });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: "Error retrieving notifications" });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const roleScopedWhere = getRoleScopedWhere(req.user?.role);
    const where: Prisma.NotificationWhereInput = {
      AND: [{ id }, roleScopedWhere],
    };

    const result = await prisma.notification.updateMany({
      where,
      data: { read: true },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    const roleScopedWhere = getRoleScopedWhere(req.user?.role);
    const where: Prisma.NotificationWhereInput = {
      AND: [
        {
          ...(storeId && { storeId }),
          read: false,
        },
        roleScopedWhere,
      ],
    };

    await prisma.notification.updateMany({
      where,
      data: { read: true },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({ message: "Error marking notifications as read" });
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const roleScopedWhere = getRoleScopedWhere(req.user?.role);
    const where: Prisma.NotificationWhereInput = {
      AND: [{ id }, roleScopedWhere],
    };

    const result = await prisma.notification.deleteMany({ where });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({ message: "Error deleting notification" });
  }
};
