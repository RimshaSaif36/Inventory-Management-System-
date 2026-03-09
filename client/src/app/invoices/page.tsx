"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface InvoiceItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { id: string; name: string };
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
  store?: { name: string };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/invoices", { params: { storeId } });
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) fetchInvoices();
  }, [storeId, fetchInvoices]);

  const handleViewInvoice = async (id: string) => {
    try {
      const response = await apiClient.get(`/invoices/${id}`);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const items = invoice.sale?.items || invoice.salesOrder?.items || [];
    const customer = invoice.sale?.customer || invoice.salesOrder?.customer;

    // Build printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head><title>Invoice ${invoice.invoiceNumber || invoice.id.substring(0, 8)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; }
        .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>${invoice.invoiceNumber || invoice.id.substring(0, 8)}</p>
        </div>
        <div class="details">
          <div>
            <strong>Customer:</strong> ${customer?.name || "Walk-in"}<br/>
            ${customer?.phone ? `<strong>Phone:</strong> ${customer.phone}<br/>` : ""}
            ${customer?.email ? `<strong>Email:</strong> ${customer.email}<br/>` : ""}
          </div>
          <div>
            <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}<br/>
            <strong>Payment:</strong> ${invoice.paymentMethod || "-"}<br/>
            <strong>Status:</strong> ${invoice.status || "PAID"}
          </div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${items.map((item: InvoiceItem, i: number) => `
              <tr><td>${i + 1}</td><td>${item.product?.name || "N/A"}</td><td>${item.quantity}</td>
              <td>PKR ${item.unitPrice.toFixed(2)}</td><td>PKR ${item.total.toFixed(2)}</td></tr>
            `).join("")}
          </tbody>
        </table>
        <div class="total">Total: PKR ${invoice.totalAmount.toFixed(2)}</div>
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
    </div>
  );
}
