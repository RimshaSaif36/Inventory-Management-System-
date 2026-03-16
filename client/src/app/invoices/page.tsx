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
    items: InvoiceItem[];
    customer?: { name: string; phone?: string; email?: string };
  };
  salesOrder?: {
    id: string;
    status: string;
    items: InvoiceItem[];
    customer: { name: string; phone?: string; email?: string };
  };
  store?: { name: string; location?: string };
}

export default function InvoicesPage() {
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
    setEditPaymentMethod(invoice.paymentMethod || "");
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

    const items = invoiceData.sale?.items || invoiceData.salesOrder?.items || [];
    const customer = invoiceData.sale?.customer || invoiceData.salesOrder?.customer;
    const storeName = invoiceData.store?.name && invoiceData.store.name !== "Default Store"
      ? invoiceData.store.name
      : "KHTAB Engineering & Services";
    const storeLocation = invoiceData.store?.location || "";
    const invoiceNumber = invoiceData.invoiceNumber || invoiceData.id.substring(0, 8);
    const invoiceDate = new Date(invoiceData.createdAt).toLocaleDateString("en-GB");
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = 0;
    const total = invoiceData.totalAmount || subtotal + tax;
    const statusLabel = invoiceData.sale ? "PAID" : (invoiceData.status || "UNPAID");

    // Build printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head><title>Invoice ${invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
        .page { padding: 8mm; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .brand { font-weight: 700; font-size: 18px; letter-spacing: 0.5px; }
        .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
        .badge { display: inline-block; padding: 6px 12px; background: #2563eb; color: #fff; font-size: 11px; border-radius: 999px; margin-top: 6px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
        .meta-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
        .meta-title { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
        .meta-line { font-size: 12px; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; font-size: 12px; }
        th { background: #eff6ff; text-transform: uppercase; font-size: 11px; text-align: left; letter-spacing: 0.3px; color: #1f2937; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        .text-right { text-align: right; }
        .totals { display: flex; justify-content: flex-end; margin-top: 14px; }
        .totals-box { width: 280px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 12px; }
        .totals-row.total { background: #2563eb; color: #fff; font-weight: 700; font-size: 14px; }
        .footer { display: flex; justify-content: space-between; margin-top: 18px; font-size: 11px; color: #6b7280; }
        .sign { margin-top: 28px; text-align: right; }
        .sign-line { display: inline-block; width: 160px; border-top: 1px solid #d1d5db; margin-top: 28px; }
        .thanks { margin-top: 18px; background: #2563eb; color: #fff; padding: 6px 12px; font-size: 11px; border-radius: 999px; display: inline-block; }
      </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="brand">${storeName}</div>
              <div class="brand-sub">${storeLocation}</div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <div class="badge">Invoice # ${invoiceNumber}</div>
            </div>
          </div>

          <div class="meta">
            <div class="meta-box">
              <div class="meta-title">Invoice To</div>
              <div class="meta-line"><strong>${customer?.name || "Walk-in"}</strong></div>
              ${customer?.phone ? `<div class="meta-line">Phone: ${customer.phone}</div>` : ""}
              ${customer?.email ? `<div class="meta-line">Email: ${customer.email}</div>` : ""}
            </div>
            <div class="meta-box">
              <div class="meta-title">Details</div>
              <div class="meta-line">Date: ${invoiceDate}</div>
              <div class="meta-line">Payment: ${invoiceData.paymentMethod || "-"}</div>
              <div class="meta-line">Status: ${statusLabel}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">SL</th>
                <th>Item Description</th>
                <th class="text-right">Price</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: InvoiceItem, i: number) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.product?.name || "N/A"}</td>
                  <td class="text-right">PKR ${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">PKR ${item.total.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-box">
              <div class="totals-row"><span>Sub Total</span><span>PKR ${subtotal.toFixed(2)}</span></div>
              <div class="totals-row"><span>Tax</span><span>PKR ${tax.toFixed(2)}</span></div>
              <div class="totals-row total"><span>Total</span><span>PKR ${total.toFixed(2)}</span></div>
            </div>
          </div>

          <div class="footer">
            <div>
              <div><strong>Payment Info</strong></div>
              <div class="meta-line">Method: ${invoiceData.paymentMethod || "-"}</div>
            </div>
            <div class="sign">
              <div class="sign-line"></div>
              <div>Authorised Sign</div>
            </div>
          </div>

          <div class="thanks">Thank you for your business</div>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
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
                  <td className="border p-2">PKR {invoice.totalAmount.toFixed(2)}</td>
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

      {/* Invoice Detail Modal */}
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
              Total: PKR {selectedInvoice.totalAmount.toFixed(2)}
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
                <input
                  type="text"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                />
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
