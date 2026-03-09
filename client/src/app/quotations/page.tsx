"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Product {
    id: string;
    name: string;
    sellingPrice: number;
}

interface QuotationItem {
    id?: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product?: Product;
}

interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

interface Quotation {
    id: string;
    status: string;
    totalAmount: number;
    validUntil?: string;
    notes?: string;
    createdAt: string;
    customer: Customer;
    user: { id: string; name: string };
    items: QuotationItem[];
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-200 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CONVERTED: "bg-purple-100 text-purple-700",
};

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
    const [statusFilter, setStatusFilter] = useState("");

    // Form state
    const [formCustomerId, setFormCustomerId] = useState("");
    const [formValidUntil, setFormValidUntil] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formItems, setFormItems] = useState<QuotationItem[]>([
        { productId: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);

    const user = useAppSelector((state) => state.user.currentUser);
    const storeId = user?.storeId || "";
    const isAccountant = user?.role === "ACCOUNTANT";
    const isAdmin = user?.role === "ADMIN";

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get("/quotations", {
                params: { storeId, ...(statusFilter && { status: statusFilter }) },
            });
            setQuotations(response.data.data || []);
        } catch (error) {
            console.error("Error fetching quotations:", error);
        } finally {
            setLoading(false);
        }
    }, [storeId, statusFilter]);

    const fetchCustomers = useCallback(async () => {
        try {
            const response = await apiClient.get("/customers");
            setCustomers(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const response = await apiClient.get("/products");
            setProducts(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }, []);

    useEffect(() => {
        if (storeId) {
            fetchQuotations();
            fetchCustomers();
            fetchProducts();
        }
    }, [storeId, fetchQuotations, fetchCustomers, fetchProducts]);

    const resetForm = () => {
        setFormCustomerId("");
        setFormValidUntil("");
        setFormNotes("");
        setFormItems([{ productId: "", quantity: 1, unitPrice: 0, total: 0 }]);
        setEditingId(null);
    };

    const handleAddItem = () => {
        setFormItems([...formItems, { productId: "", quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setFormItems(formItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        const updated = [...formItems];
        if (field === "productId") {
            const product = products.find((p) => p.id === value);
            updated[index] = {
                ...updated[index],
                productId: value,
                unitPrice: product?.sellingPrice || 0,
                total: (product?.sellingPrice || 0) * updated[index].quantity,
            };
        } else if (field === "quantity") {
            const qty = parseInt(value) || 0;
            updated[index] = {
                ...updated[index],
                quantity: qty,
                total: qty * updated[index].unitPrice,
            };
        } else if (field === "unitPrice") {
            const price = parseFloat(value) || 0;
            updated[index] = {
                ...updated[index],
                unitPrice: price,
                total: price * updated[index].quantity,
            };
        }
        setFormItems(updated);
    };

    const getTotal = () => formItems.reduce((s, i) => s + i.total, 0);

    const handleSubmit = async () => {
        if (!formCustomerId || formItems.some((i) => !i.productId)) {
            alert("Please select a customer and fill all product rows");
            return;
        }

        try {
            const payload = {
                storeId,
                userId: user?.id,
                customerId: formCustomerId,
                validUntil: formValidUntil || undefined,
                notes: formNotes || undefined,
                items: formItems.map((i) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            };

            if (editingId) {
                await apiClient.put(`/quotations/${editingId}`, payload);
            } else {
                await apiClient.post("/quotations", payload);
            }

            setShowModal(false);
            resetForm();
            fetchQuotations();
        } catch (error) {
            console.error("Error saving quotation:", error);
            alert("Error saving quotation");
        }
    };

    const handleEdit = (q: Quotation) => {
        setEditingId(q.id);
        setFormCustomerId(q.customer.id);
        setFormValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
        setFormNotes(q.notes || "");
        setFormItems(
            q.items.map((i) => ({
                productId: i.productId || i.product?.id || "",
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                total: i.total,
            }))
        );
        setShowModal(true);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await apiClient.put(`/quotations/${id}`, { status: newStatus });
            fetchQuotations();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleConvertToOrder = async (id: string) => {
        if (!confirm("Convert this quotation to a Sales Order?")) return;
        try {
            await apiClient.post(`/quotations/${id}/convert`, { userId: user?.id });
            alert("Quotation converted to Sales Order successfully");
            fetchQuotations();
        } catch (error: any) {
            alert(error?.response?.data?.message || "Error converting quotation");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this quotation?")) return;
        try {
            await apiClient.delete(`/quotations/${id}`);
            fetchQuotations();
        } catch (error) {
            console.error("Error deleting quotation:", error);
        }
    };

    const handleDownloadPDF = (q: Quotation) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
      <head><title>Quotation ${q.id.substring(0, 8)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; }
        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>QUOTATION</h1>
          <p>Ref: ${q.id.substring(0, 8)}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
          <div>
            <strong>Customer:</strong> ${q.customer.name}<br/>
            ${q.customer.phone ? `<strong>Phone:</strong> ${q.customer.phone}<br/>` : ""}
            ${q.customer.email ? `<strong>Email:</strong> ${q.customer.email}<br/>` : ""}
          </div>
          <div>
            <strong>Date:</strong> ${new Date(q.createdAt).toLocaleDateString()}<br/>
            ${q.validUntil ? `<strong>Valid Until:</strong> ${new Date(q.validUntil).toLocaleDateString()}<br/>` : ""}
            <strong>Status:</strong> ${q.status}
          </div>
        </div>
        ${q.notes ? `<p><strong>Notes:</strong> ${q.notes}</p>` : ""}
        <table>
          <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${q.items.map((item, i) => `
              <tr><td>${i + 1}</td><td>${item.product?.name || "N/A"}</td>
              <td>${item.quantity}</td><td>PKR ${item.unitPrice.toFixed(2)}</td>
              <td>PKR ${item.total.toFixed(2)}</td></tr>
            `).join("")}
          </tbody>
        </table>
        <div class="total">Total: PKR ${q.totalAmount.toFixed(2)}</div>
        <script>window.print();</script>
      </body></html>
    `);
        printWindow.document.close();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Quotations</h1>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border px-3 py-2 rounded"
                    >
                        <option value="">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="CONVERTED">Converted</option>
                    </select>
                    {isAccountant && (
                        <button
                            onClick={() => {
                                resetForm();
                                setShowModal(true);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg"
                        >
                            New Quotation
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border p-2">Ref</th>
                                <th className="border p-2">Customer</th>
                                <th className="border p-2">Amount</th>
                                <th className="border p-2">Status</th>
                                <th className="border p-2">Date</th>
                                <th className="border p-2">Created By</th>
                                <th className="border p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((q) => (
                                <tr key={q.id}>
                                    <td className="border p-2">{q.id.substring(0, 8)}</td>
                                    <td className="border p-2">{q.customer.name}</td>
                                    <td className="border p-2">PKR {q.totalAmount.toFixed(2)}</td>
                                    <td className="border p-2">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[q.status] || ""}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="border p-2">{new Date(q.createdAt).toLocaleDateString()}</td>
                                    <td className="border p-2">{q.user.name}</td>
                                    <td className="border p-2 space-x-1">
                                        <button
                                            onClick={() => setSelectedQuotation(q)}
                                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDownloadPDF(q)}
                                            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                                        >
                                            PDF
                                        </button>
                                        {isAccountant && q.status === "DRAFT" && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(q)}
                                                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(q.id, "SENT")}
                                                    className="bg-indigo-600 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    Send
                                                </button>
                                            </>
                                        )}
                                        {isAccountant && q.status === "SENT" && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(q.id, "ACCEPTED")}
                                                    className="bg-green-700 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(q.id, "REJECTED")}
                                                    className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {(isAccountant || isAdmin) && q.status === "ACCEPTED" && (
                                            <button
                                                onClick={() => handleConvertToOrder(q.id)}
                                                className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                                            >
                                                Convert to Order
                                            </button>
                                        )}
                                        {isAccountant && q.status !== "CONVERTED" && (
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {quotations.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="border p-4 text-center text-gray-500">
                                        No quotations found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Quotation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingId ? "Edit Quotation" : "Create New Quotation"}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Customer *</label>
                                <select
                                    value={formCustomerId}
                                    onChange={(e) => setFormCustomerId(e.target.value)}
                                    className="border px-3 py-2 rounded w-full"
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Valid Until</label>
                                <input
                                    type="date"
                                    value={formValidUntil}
                                    onChange={(e) => setFormValidUntil(e.target.value)}
                                    className="border px-3 py-2 rounded w-full"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                className="border px-3 py-2 rounded w-full"
                                rows={2}
                            />
                        </div>

                        <h3 className="font-semibold mb-2">Items</h3>
                        {formItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                <select
                                    value={item.productId}
                                    onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                                    className="border px-2 py-1 rounded flex-1"
                                >
                                    <option value="">Select Product</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - PKR {p.sellingPrice}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                    className="border px-2 py-1 rounded w-20"
                                    placeholder="Qty"
                                />
                                <input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                                    className="border px-2 py-1 rounded w-28"
                                    placeholder="Price"
                                />
                                <span className="w-28 text-right">PKR {item.total.toFixed(2)}</span>
                                {formItems.length > 1 && (
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-red-500 font-bold"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}

                        <button onClick={handleAddItem} className="text-blue-600 text-sm mb-4">
                            + Add Item
                        </button>

                        <div className="text-right text-lg font-bold mb-4">
                            Total: PKR {getTotal().toFixed(2)}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="bg-gray-300 px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                {editingId ? "Update" : "Create"} Quotation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Quotation Detail Modal */}
            {selectedQuotation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                Quotation {selectedQuotation.id.substring(0, 8)}
                            </h2>
                            <button
                                onClick={() => setSelectedQuotation(null)}
                                className="text-gray-500 hover:text-gray-800 text-lg"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div><strong>Customer:</strong> {selectedQuotation.customer.name}</div>
                            <div><strong>Status:</strong>{" "}
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[selectedQuotation.status]}`}>
                                    {selectedQuotation.status}
                                </span>
                            </div>
                            <div><strong>Date:</strong> {new Date(selectedQuotation.createdAt).toLocaleDateString()}</div>
                            {selectedQuotation.validUntil && (
                                <div><strong>Valid Until:</strong> {new Date(selectedQuotation.validUntil).toLocaleDateString()}</div>
                            )}
                            {selectedQuotation.notes && (
                                <div className="col-span-2"><strong>Notes:</strong> {selectedQuotation.notes}</div>
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
                                {selectedQuotation.items.map((item, i) => (
                                    <tr key={item.id || i}>
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
                            Total: PKR {selectedQuotation.totalAmount.toFixed(2)}
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => handleDownloadPDF(selectedQuotation)}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Download PDF
                            </button>
                            <button
                                onClick={() => setSelectedQuotation(null)}
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
