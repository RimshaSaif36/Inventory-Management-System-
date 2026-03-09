"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Notification {
    id: string;
    type: string;
    message: string;
    read: boolean;
    referenceId?: string;
    createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
    NEW_POS_INVOICE: "🧾",
    NEW_ORDER: "📦",
    SALE_ACTIVITY: "💰",
    SYSTEM_ALERT: "⚠️",
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const user = useAppSelector((state) => state.user.currentUser);
    const storeId = user?.storeId || "";

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get("/notifications", {
                params: { storeId, ...(showUnreadOnly && { unreadOnly: "true" }) },
            });
            setNotifications(response.data.data || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [storeId, showUnreadOnly]);

    useEffect(() => {
        if (storeId) fetchNotifications();
    }, [storeId, fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await apiClient.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error("Error marking notification:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await apiClient.put("/notifications/mark-all-read", null, { params: { storeId } });
            fetchNotifications();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiClient.delete(`/notifications/${id}`);
            fetchNotifications();
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    {unreadCount > 0 && (
                        <p className="text-sm text-blue-600">{unreadCount} unread notification(s)</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showUnreadOnly}
                            onChange={(e) => setShowUnreadOnly(e.target.checked)}
                        />
                        <span className="text-sm">Unread only</span>
                    </label>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                        >
                            Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`bg-white rounded-lg shadow p-4 flex justify-between items-start ${!n.read ? "border-l-4 border-blue-500" : ""
                                }`}
                        >
                            <div className="flex gap-3">
                                <span className="text-2xl">{TYPE_ICONS[n.type] || "🔔"}</span>
                                <div>
                                    <p className={`${!n.read ? "font-semibold" : "text-gray-600"}`}>
                                        {n.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(n.createdAt).toLocaleString()} &middot;{" "}
                                        <span className="uppercase text-gray-500">{n.type.replace(/_/g, " ")}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {!n.read && (
                                    <button
                                        onClick={() => handleMarkAsRead(n.id)}
                                        className="text-blue-600 text-xs hover:underline"
                                    >
                                        Mark Read
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(n.id)}
                                    className="text-red-500 text-xs hover:underline ml-2"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {notifications.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No notifications
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
