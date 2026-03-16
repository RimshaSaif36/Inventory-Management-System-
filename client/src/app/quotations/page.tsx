"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
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
    address?: string;
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
    const [statusUpdatingIds, setStatusUpdatingIds] = useState<Record<string, string>>({});

    // Form state
    const [formCustomerId, setFormCustomerId] = useState("");
    const [formValidUntil, setFormValidUntil] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [useNewCustomer, setUseNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerEmail, setNewCustomerEmail] = useState("");
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
                params: { ...(storeId && { storeId }), ...(statusFilter && { status: statusFilter }) },
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
        fetchQuotations();
        fetchCustomers();
        fetchProducts();
    }, [storeId, fetchQuotations, fetchCustomers, fetchProducts]);

    const resetForm = () => {
        setFormCustomerId("");
        setFormValidUntil("");
        setFormNotes("");
        setUseNewCustomer(false);
        setNewCustomerName("");
        setNewCustomerEmail("");
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
        if ((!formCustomerId && !useNewCustomer) || formItems.some((i) => !i.productId)) {
            alert("Please select a customer and fill all product rows");
            return;
        }

        if (useNewCustomer && !newCustomerName.trim()) {
            alert("Please enter customer name");
            return;
        }

        if (!user?.id) {
            alert("User information is missing. Please log in again.");
            return;
        }

        try {
            let customerId = formCustomerId;

            if (useNewCustomer) {
                const response = await apiClient.post("/customers", {
                    name: newCustomerName.trim(),
                    email: newCustomerEmail.trim() || undefined,
                });

                customerId = response.data?.id;
                if (!customerId) {
                    throw new Error("Customer creation failed");
                }
                await fetchCustomers();
            }

            const payload = {
                storeId: storeId || undefined,
                userId: user?.id,
                customerId,
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
        } catch (error: any) {
            console.error("Error saving quotation:", error);
            alert(error?.response?.data?.message || "Error saving quotation");
        }
    };

    const handleEdit = (q: Quotation) => {
        setEditingId(q.id);
        setFormCustomerId(q.customer.id);
        setFormValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
        setFormNotes(q.notes || "");
        setUseNewCustomer(false);
        setNewCustomerName("");
        setNewCustomerEmail("");
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
        if (statusUpdatingIds[id]) return;

        const previousStatus = quotations.find((q) => q.id === id)?.status;
        setStatusUpdatingIds((prev) => ({ ...prev, [id]: newStatus }));
        setQuotations((prev) =>
            prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
        );

        try {
            await apiClient.put(`/quotations/${id}`, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            if (previousStatus) {
                setQuotations((prev) =>
                    prev.map((q) => (q.id === id ? { ...q, status: previousStatus } : q))
                );
            }
        } finally {
            setStatusUpdatingIds((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
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
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                fetchQuotations();
                return;
            }
            let message = "Error deleting quotation";
            if (axios.isAxiosError(error)) {
                const data: any = error.response?.data;
                message = data?.message || data?.error || message;
            }
            alert(message);
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
                :root { --brand: #0f5c82; --muted: #6b7280; --border: #e5e7eb; --bg: #f7f9fb; }
                body { font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif; color: #111827; padding: 32px; }
                .page { max-width: 900px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 2px solid var(--border); margin-bottom: 18px; }
                .company { display: flex; align-items: center; gap: 14px; }
                .logo { width: 72px; height: 72px; object-fit: contain; }
                .company-name { font-size: 20px; font-weight: 700; letter-spacing: 0.2px; }
                .company-phone { font-size: 12px; color: var(--muted); margin-top: 2px; }
                .quote-meta { text-align: right; }
                .quote-title { font-size: 22px; font-weight: 700; color: var(--brand); letter-spacing: 1px; }
                .quote-ref { font-size: 12px; color: var(--muted); margin-top: 2px; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #eef2f7; color: #334155; }
                .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0 18px; }
                .section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
                .section h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
                .row { display: flex; gap: 8px; font-size: 13px; margin: 2px 0; }
                .label { min-width: 92px; color: #374151; font-weight: 600; }
                .value { color: #111827; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0 0; }
                th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; font-size: 13px; }
                th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; letter-spacing: 0.8px; color: #334155; }
                tbody tr:nth-child(even) { background: #fafbfc; }
                .notes { margin-top: 10px; padding: 10px 12px; border-left: 3px solid var(--brand); background: #f8fafc; font-size: 13px; }
                .total { text-align: right; font-size: 16px; font-weight: 700; margin-top: 12px; }
                .footer { margin-top: 16px; font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; }
            </style>
      </head>
      <body>
                <div class="page">
                    <div class="header">
                        <div class="company">
                            <img class="logo" src="/logo.jpg" alt="Khtab Engineering and Services" />
                            <div>
                                <div class="company-name">Khtab Engineering and Services</div>
                                <div class="company-phone">Phone: 03070600250</div>
                            </div>
                        </div>
                        <div class="quote-meta">
                            <div class="quote-title">QUOTATION</div>
                            <div class="quote-ref">Ref: ${q.id.substring(0, 8)}</div>
                        </div>
                    </div>

                    <div class="section-grid">
                        <div class="section">
                            <h3>Customer</h3>
                            <div class="row"><div class="label">Name</div><div class="value">${q.customer.name}</div></div>
                            ${q.customer.phone ? `<div class="row"><div class="label">Phone</div><div class="value">${q.customer.phone}</div></div>` : ""}
                            ${q.customer.email ? `<div class="row"><div class="label">Email</div><div class="value">${q.customer.email}</div></div>` : ""}
                            ${q.customer.address ? `<div class="row"><div class="label">Address</div><div class="value">${q.customer.address}</div></div>` : ""}
                        </div>
                        <div class="section">
                            <h3>Quotation</h3>
                            <div class="row"><div class="label">Date</div><div class="value">${new Date(q.createdAt).toLocaleDateString()}</div></div>
                            ${q.validUntil ? `<div class="row"><div class="label">Valid Until</div><div class="value">${new Date(q.validUntil).toLocaleDateString()}</div></div>` : ""}
                            <div class="row"><div class="label">Status</div><div class="value"><span class="badge">${q.status}</span></div></div>
                        </div>
                    </div>

                    ${q.notes ? `<div class="notes"><strong>Notes:</strong> ${q.notes}</div>` : ""}
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
                    <div class="footer">
                        <span>Generated by Khtab Engineering and Services</span>
                        <span>Phone: 03070600250</span>
                    </div>
                </div>
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
                            {quotations.map((q) => {
                                const canManage = isAccountant || isAdmin;
                                const pendingStatus = statusUpdatingIds[q.id];
                                const isStatusUpdating = Boolean(pendingStatus);

                                return (
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
                                            {canManage && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(q)}
                                                        disabled={isStatusUpdating}
                                                        title="Edit quotation"
                                                        className="px-2 py-1 rounded text-xs bg-yellow-500 text-white hover:bg-yellow-600"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(q.id)}
                                                        disabled={isStatusUpdating}
                                                        title="Delete quotation"
                                                        className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {isAccountant && q.status === "DRAFT" && (
                                                <button
                                                    onClick={() => handleStatusChange(q.id, "SENT")}
                                                    disabled={isStatusUpdating}
                                                    className="bg-indigo-600 text-white px-2 py-1 rounded text-xs disabled:opacity-60"
                                                >
                                                    {pendingStatus === "SENT" ? "Sending..." : "Send"}
                                                </button>
                                            )}
                                            {isAccountant && q.status === "SENT" && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(q.id, "ACCEPTED")}
                                                        disabled={isStatusUpdating}
                                                        className="bg-green-700 text-white px-2 py-1 rounded text-xs disabled:opacity-60"
                                                    >
                                                        {pendingStatus === "ACCEPTED" ? "Accepting..." : "Accept"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(q.id, "REJECTED")}
                                                        disabled={isStatusUpdating}
                                                        className="bg-red-600 text-white px-2 py-1 rounded text-xs disabled:opacity-60"
                                                    >
                                                        {pendingStatus === "REJECTED" ? "Rejecting..." : "Reject"}
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
                                        </td>
                                    </tr>
                                );
                            })}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingId ? "Edit Quotation" : "Create New Quotation"}
                                </h2>
                                <p className="text-xs text-slate-500">Build the quotation, add items, then send to the customer.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Close
                            </button>
                        </div>

                        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-slate-700">Customer *</label>
                                        <button
                                            type="button"
                                            onClick={() => setUseNewCustomer((prev) => !prev)}
                                            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
                                        >
                                            {useNewCustomer ? "Select Existing" : "Add New"}
                                        </button>
                                    </div>
                                    <select
                                        value={formCustomerId}
                                        onChange={(e) => setFormCustomerId(e.target.value)}
                                        disabled={useNewCustomer}
                                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 disabled:bg-slate-100"
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.phone ? `(${c.phone})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    {useNewCustomer && (
                                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <input
                                                type="text"
                                                value={newCustomerName}
                                                onChange={(e) => setNewCustomerName(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                placeholder="Customer name"
                                            />
                                            <input
                                                type="email"
                                                value={newCustomerEmail}
                                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                                placeholder="Customer email (optional)"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <label className="block text-sm font-semibold text-slate-700">Valid Until</label>
                                    <input
                                        type="date"
                                        value={formValidUntil}
                                        onChange={(e) => setFormValidUntil(e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                                <label className="block text-sm font-semibold text-slate-700">Notes</label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                    rows={3}
                                    placeholder="Optional notes for the customer"
                                />
                            </div>

                            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700">Items</h3>
                                    <button
                                        onClick={handleAddItem}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                    >
                                        + Add Item
                                    </button>
                                </div>
                                <div className="mt-3 space-y-3">
                                    {formItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-[minmax(0,1fr)_80px_120px_120px_24px] items-center gap-2"
                                        >
                                            <select
                                                value={item.productId}
                                                onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                                                className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
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
                                                className="rounded-lg border border-slate-200 px-2 py-2 text-sm text-center"
                                                placeholder="Qty"
                                            />
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                                                className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                                                placeholder="Price"
                                            />
                                            <span className="text-right text-sm font-semibold text-slate-700">PKR {item.total.toFixed(2)}</span>
                                            {formItems.length > 1 ? (
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    &times;
                                                </button>
                                            ) : (
                                                <span />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col items-end gap-4 border-t border-slate-200 pt-4">
                                <div className="text-right text-lg font-bold text-slate-900">
                                    Total: PKR {getTotal().toFixed(2)}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            resetForm();
                                        }}
                                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        {editingId ? "Update" : "Create"} Quotation
                                    </button>
                                </div>
                            </div>
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
                            {selectedQuotation.customer.address && (
                                <div><strong>Address:</strong> {selectedQuotation.customer.address}</div>
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
