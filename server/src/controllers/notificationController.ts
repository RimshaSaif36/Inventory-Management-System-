import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();
    const unreadOnly = req.query.unreadOnly === "true";
    const page = parseInt(req.query.page?.toString() || "1");
    const limit = parseInt(req.query.limit?.toString() || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      ...(storeId && { storeId }),
      ...(unreadOnly && { read: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...(storeId && { storeId }), read: false } }),
    ]);

    res.json({ data: notifications, total, page, limit, unreadCount });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: "Error retrieving notifications" });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(notification);
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId?.toString();

    await prisma.notification.updateMany({
      where: { ...(storeId && { storeId }), read: false },
      data: { read: true },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({ message: "Error marking notifications as read" });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({ message: "Error deleting notification" });
  }
};
