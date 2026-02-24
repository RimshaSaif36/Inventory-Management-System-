"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface SalesOrder {
  id: string;
  customer: { name: string };
  totalAmount: number;
  status: string;
  orderDate: string;
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchOrders();
    }
  }, [storeId, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { storeId };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response = await apiClient.get("/sales-orders", { params });
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.put(`/sales-orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const statuses = ["PENDING", "APPROVED", "DELIVERED", "CANCELLED", "INVOICED"];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
      </div>

      <div className="mb-4 flex gap-2">
        {["ALL", ...statuses].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded ${
              statusFilter === status ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Order ID</th>
                <th className="border p-2">Customer</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="border p-2">{order.id.substring(0, 8)}</td>
                  <td className="border p-2">{order.customer.name}</td>
                  <td className="border p-2">PKR {order.totalAmount.toFixed(2)}</td>
                  <td className="border p-2">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="border px-2 py-1 rounded"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="border p-2">
                    <button className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
