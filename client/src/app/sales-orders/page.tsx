"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface SalesOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { id: string; name: string };
}

interface SalesOrder {
  id: string;
  customer: { name: string; phone?: string; email?: string };
  user: { id: string; name: string };
  totalAmount: number;
  status: string;
  orderDate: string;
  expectedDelivery?: string;
  quotationId?: string;
  items: SalesOrderItem[];
  invoice?: { id: string };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  RESERVED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  INVOICED: "bg-purple-100 text-purple-800",
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";
  const isAdmin = user?.role === "ADMIN";
  const isAccountant = user?.role === "ACCOUNTANT";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (storeId) params.storeId = storeId;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const response = await apiClient.get("/sales-orders", { params });
      const data = response.data.data || response.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [storeId, fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.put(`/sales-orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error updating status");
    }
  };

  const handleCreateInvoice = async (orderId: string) => {
    try {
      await apiClient.post("/invoices/from-order", { salesOrderId: orderId });
      alert("Invoice created successfully");
      fetchOrders();
    } catch (error: any) {
      alert(error?.response?.data?.message || "Error creating invoice");
    }
  };

  const handleViewOrder = async (id: string) => {
    try {
      const response = await apiClient.get(`/sales-orders/${id}`);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };

  const statuses = ["PENDING", "RESERVED", "CONFIRMED", "DELIVERED", "COMPLETED", "INVOICED"];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...statuses].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded text-sm ${statusFilter === status
              ? "bg-blue-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
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
                <th className="border p-2">Created By</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Order Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="border p-2">{order.id.substring(0, 8)}</td>
                  <td className="border p-2">{order.customer?.name || "-"}</td>
                  <td className="border p-2">{order.user?.name || "-"}</td>
                  <td className="border p-2">PKR {order.totalAmount.toFixed(2)}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[order.status] || ""}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="border p-2 space-x-1">
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    >
                      View
                    </button>
                    {(isAdmin || isAccountant) && order.status !== "COMPLETED" && order.status !== "INVOICED" && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleStatusChange(order.id, e.target.value);
                        }}
                        className="border px-1 py-1 rounded text-xs"
                      >
                        <option value="">Change Status</option>
                        {statuses
                          .filter((s) => s !== order.status)
                          .map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                      </select>
                    )}
                    {isAccountant && (order.status === "DELIVERED" || order.status === "COMPLETED") && !order.invoice && (
                      <button
                        onClick={() => handleCreateInvoice(order.id)}
                        className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                      >
                        Create Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="border p-4 text-center text-gray-500">
                    No sales orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Sales Order {selectedOrder.id.substring(0, 8)}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-800 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><strong>Customer:</strong> {selectedOrder.customer?.name || "-"}</div>
              <div><strong>Status:</strong>{" "}
                <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div><strong>Order Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}</div>
              {selectedOrder.expectedDelivery && (
                <div><strong>Expected Delivery:</strong> {new Date(selectedOrder.expectedDelivery).toLocaleDateString()}</div>
              )}
              <div><strong>Created By:</strong> {selectedOrder.user?.name || "-"}</div>
              {selectedOrder.quotationId && (
                <div><strong>From Quotation:</strong> {selectedOrder.quotationId.substring(0, 8)}</div>
              )}
            </div>

            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">#</th>
                  <th className="border p-2">Product</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Unit Price</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items || []).map((item, i) => (
                  <tr key={item.id}>
                    <td className="border p-2">{i + 1}</td>
                    <td className="border p-2">{item.product?.name || "N/A"}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2">PKR {item.unitPrice.toFixed(2)}</td>
                    <td className="border p-2">PKR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right text-lg font-bold mt-4">
              Total: PKR {selectedOrder.totalAmount.toFixed(2)}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
