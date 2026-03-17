"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface InvoiceItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product?: { id: string; name: string };
}

interface Invoice {
  id: string;
  invoiceNumber?: string;
  totalAmount: number;
  paymentMethod?: string;
  status?: string;
  createdAt: string;
  sale?: {
    id: string;
    items?: InvoiceItem[];
    customer?: { name: string; phone?: string; email?: string };
  };
  salesOrder?: {
    id: string;
    status?: string;
    items?: InvoiceItem[];
    customer: { name: string; phone?: string; email?: string };
  };
  store?: { name: string; location?: string };
}

const PAYMENT_METHOD_OPTIONS = [
  "Cash",
  "Cheque",
  "Bank Transfer",
  "Mobile Wallet",
];

const normalizePaymentMethod = (method?: string) => {
  if (!method) return "";
  const normalized = method.trim();
  const lower = normalized.toLowerCase();

  if (lower === "cash") return "Cash";
  if (lower === "cheque" || lower === "check") return "Cheque";
  if (lower === "bank transfer" || lower === "transfer" || lower === "bank_transfer") {
    return "Bank Transfer";
  }
  if (lower === "mobile wallet" || lower === "wallet" || lower === "mobile_wallet") {
    return "Mobile Wallet";
  }

  return normalized;
};

export default function InvoicesClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editStatus, setEditStatus] = useState("UNPAID");

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";
  const canManage = user?.role === "ACCOUNTANT" || user?.role === "ADMIN";

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = storeId ? { storeId } : undefined;
      const response = await apiClient.get("/invoices", { params });
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchInvoices();
  }, [storeId, fetchInvoices]);

  const handleViewInvoice = async (id: string) => {
    try {
      const response = await apiClient.get(`/invoices/${id}`);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
    }
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditInvoiceNumber(invoice.invoiceNumber || "");
    setEditPaymentMethod(normalizePaymentMethod(invoice.paymentMethod));
    setEditStatus(invoice.status || (invoice.sale ? "PAID" : "UNPAID"));
  };

  const closeEditModal = () => {
    setEditingInvoice(null);
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    try {
      await apiClient.put(`/invoices/${editingInvoice.id}`, {
        invoiceNumber: editInvoiceNumber.trim() || null,
        paymentMethod: editPaymentMethod.trim() || null,
        status: editStatus,
      });
      setEditingInvoice(null);
      fetchInvoices();
    } catch (error) {
      let message = "Error updating invoice";
      if (axios.isAxiosError(error)) {
        const data: any = error.response?.data;
        message = data?.message || data?.error || message;
      }
      alert(message);
      console.error("Error updating invoice:", error);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await apiClient.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        fetchInvoices();
        return;
      }
      let message = "Error deleting invoice";
      if (axios.isAxiosError(error)) {
        const data: any = error.response?.data;
        message = data?.message || data?.error || message;
      }
      alert(message);
      console.error("Error deleting invoice:", error);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    let invoiceData: Invoice = invoice;

    try {
      const response = await apiClient.get(`/invoices/${invoice.id}`);
      invoiceData = response.data || invoice;
    } catch (error) {
      console.error("Error fetching invoice for PDF:", error);
    }

    const { buildInvoiceHtml } = await import("./printInvoice");
    const invoiceHtml = await buildInvoiceHtml(invoiceData);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const getType = (invoice: Invoice) => {
    if (invoice.sale) return "POS";
    if (invoice.salesOrder) return "Sales Order";
    return "-";
  };

  const getCustomer = (invoice: Invoice) => {
    return invoice.sale?.customer?.name || invoice.salesOrder?.customer?.name || "Walk-in";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Invoice #</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Customer</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Payment</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="border p-2">{invoice.invoiceNumber || invoice.id.substring(0, 8)}</td>
                  <td className="border p-2">{getType(invoice)}</td>
                  <td className="border p-2">{getCustomer(invoice)}</td>
                  <td className="border p-2">PKR {Number(invoice.totalAmount || 0).toFixed(2)}</td>
                  <td className="border p-2">{invoice.paymentMethod || "-"}</td>
                  <td className="border p-2">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => handleViewInvoice(invoice.id)}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(invoice)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                    >
                      PDF
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="border p-4 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Invoice {selectedInvoice.invoiceNumber || selectedInvoice.id.substring(0, 8)}
              </h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-500 hover:text-gray-800 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <strong>Customer:</strong> {getCustomer(selectedInvoice)}
              </div>
              <div>
                <strong>Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Type:</strong> {getType(selectedInvoice)}
              </div>
              <div>
                <strong>Payment:</strong> {selectedInvoice.paymentMethod || "-"}
              </div>
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
                {(selectedInvoice.sale?.items || selectedInvoice.salesOrder?.items || []).map(
                  (item: InvoiceItem, i: number) => (
                    <tr key={item.id}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{item.product?.name || "N/A"}</td>
                      <td className="border p-2">{item.quantity}</td>
                      <td className="border p-2">PKR {item.unitPrice.toFixed(2)}</td>
                      <td className="border p-2">PKR {item.total.toFixed(2)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className="text-right text-lg font-bold mt-4">
              Total: PKR {Number(selectedInvoice.totalAmount || 0).toFixed(2)}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Download PDF
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Edit Invoice {editingInvoice.invoiceNumber || editingInvoice.id.substring(0, 8)}
              </h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-800 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="">Select payment method</option>
                  {(PAYMENT_METHOD_OPTIONS.includes(editPaymentMethod) || !editPaymentMethod
                    ? PAYMENT_METHOD_OPTIONS
                    : [editPaymentMethod, ...PAYMENT_METHOD_OPTIONS]
                  ).map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeEditModal}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
