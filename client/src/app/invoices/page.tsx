"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Invoice {
  id: string;
  totalAmount: number;
  paymentMethod?: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchInvoices();
    }
  }, [storeId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/invoices", { params: { storeId } });
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
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
                <th className="border p-2">Invoice ID</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Payment Method</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="border p-2">{invoice.id.substring(0, 8)}</td>
                  <td className="border p-2">PKR {invoice.totalAmount.toFixed(2)}</td>
                  <td className="border p-2">{invoice.paymentMethod || "-"}</td>
                  <td className="border p-2">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  <td className="border p-2">
                    <button className="bg-blue-600 text-white px-2 py-1 rounded text-sm mr-2">
                      View
                    </button>
                    <button className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                      PDF
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
