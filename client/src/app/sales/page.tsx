"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAppSelector } from "@/app/redux";
import { useGetProductsQuery, type Product } from "@/state/api";
import { apiClient } from "@/lib/apiClient";

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface Sale {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  approved?: boolean;
  approvedBy?: string;
  user?: { id: string; name: string };
  customer?: { id: string; name: string };
}

export default function POSSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [productSearch, setProductSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  const {
    data: productsResponse,
    isLoading: productsLoading,
    isError: productsError,
  } = useGetProductsQuery({ pageSize: 100 }, { skip: !showModal });
  const products: Product[] = productsResponse?.data ?? [];

  useEffect(() => {
    fetchSales();
  }, [storeId]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = storeId ? { storeId } : undefined;
      const response = await apiClient.get("/sales", { params });
      setSales(response.data.data || response.data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const currentItem = newItems[index];
    const currentProduct = products.find((p) => p.id === currentItem.productId);

    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      const maxQty = typeof product?.totalStock === "number" ? product.totalStock : undefined;
      let safeQty = currentItem.quantity || 1;
      if (maxQty !== undefined && maxQty > 0) {
        safeQty = Math.min(Math.max(1, safeQty), maxQty);
      } else {
        safeQty = Math.max(1, safeQty);
      }
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unitPrice: Number(product?.sellingPrice || 0),
        quantity: safeQty,
      };
    } else {
      if (field === "quantity") {
        const maxQty = typeof currentProduct?.totalStock === "number" ? currentProduct.totalStock : undefined;
        const parsed = Number(value);
        const normalized = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
        const clamped = maxQty === undefined || maxQty <= 0 ? normalized : Math.min(normalized, maxQty);
        newItems[index] = { ...newItems[index], quantity: clamped };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    }
    setItems(newItems);
  };

  const addProductToSale = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const maxQty = typeof product.totalStock === "number" ? product.totalStock : undefined;
    if (maxQty !== undefined && maxQty <= 0) {
      alert("Product is out of stock");
      return;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) {
        const current = prev[existingIndex];
        const nextQty = current.quantity + 1;
        const safeQty = maxQty === undefined ? nextQty : Math.min(nextQty, Math.max(0, maxQty));
        const updated = [...prev];
        updated[existingIndex] = {
          ...current,
          unitPrice: Number(product.sellingPrice || 0),
          quantity: maxQty === 0 ? 0 : safeQty,
        };
        return updated;
      }

      const emptyIndex = prev.findIndex((item) => !item.productId);
      const newItem = {
        productId,
        quantity: 1,
        unitPrice: Number(product.sellingPrice || 0),
      };

      if (emptyIndex >= 0) {
        const updated = [...prev];
        updated[emptyIndex] = newItem;
        return updated;
      }

      return [...prev, newItem];
    });
  };

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.productId && item.quantity > 0);

    if (!user?.id) {
      alert("User information is missing. Please log in again.");
      return;
    }

    if (validItems.length === 0) {
      alert("Please add at least one item");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/sales", {
        storeId: storeId || undefined,
        userId: user?.id,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        items: validItems.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice || 0),
          quantity: Number(item.quantity || 0),
          total: Number((item.unitPrice * item.quantity).toFixed(2)),
        })),
        paymentMethod,
      });
      setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
      setPaymentMethod("CASH");
      setProductSearch("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setShowModal(false);
      fetchSales();
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("Error creating sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = productSearch
    ? products.filter((product) => {
      const needle = productSearch.toLowerCase();
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.sku || "").toLowerCase().includes(needle)
      );
    })
    : products;

  const quickResults = productSearch.trim()
    ? filteredProducts.slice(0, 6)
    : [];

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalQuantity = items.reduce((sum, item) => sum + (item.productId ? item.quantity : 0), 0);
  const stockIssues = items.some((item) => {
    if (!item.productId) return false;
    const product = products.find((p) => p.id === item.productId);
    if (typeof product?.totalStock !== "number") return false;
    return item.quantity > product.totalStock;
  });
  const canComplete =
    items.some((item) => item.productId && item.quantity > 0) &&
    !stockIssues &&
    !isSubmitting;

  const formatPKR = (value: number) =>
    `PKR ${value.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const canCreate = user?.role === "ACCOUNTANT";
  const isAdmin = user?.role === "ADMIN";

  const handleApprove = async (saleId: string) => {
    try {
      await apiClient.put(`/sales/${saleId}/approve`);
      fetchSales();
    } catch (error: any) {
      console.error("Error approving sale:", error);
      const message = error?.response?.data?.message || error?.response?.data?.error || "Error approving sale";
      alert(message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">POS Sales</h1>
        {canCreate && (
          <button
            onClick={() => {
              setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
              setPaymentMethod("CASH");
              setCustomerName("");
              setCustomerPhone("");
              setCustomerEmail("");
              setShowModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            New Sale
          </button>
        )}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Sale ID</th>
                <th className="border p-2">Created By</th>
                <th className="border p-2">Customer</th>
                <th className="border p-2">Amount</th>
                <th className="border p-2">Payment</th>
                <th className="border p-2">Approved</th>
                <th className="border p-2">Date</th>
                {isAdmin && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="border p-2">{sale.id.substring(0, 8)}</td>
                  <td className="border p-2">{sale.user?.name || "-"}</td>
                  <td className="border p-2">{sale.customer?.name || "Walk-in"}</td>
                  <td className="border p-2">PKR {sale.totalAmount.toFixed(2)}</td>
                  <td className="border p-2">{sale.paymentMethod}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${sale.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {sale.approved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="border p-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td className="border p-2">
                      {!sale.approved && (
                        <button
                          onClick={() => handleApprove(sale.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="border p-4 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[75vh] overflow-y-auto overflow-x-hidden">
            <h2 className="text-xl font-bold mb-4">Create New Sale</h2>

            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                {["CASH", "CARD", "TRANSFER", "CREDIT"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-4 py-2 rounded ${paymentMethod === method ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Find Product</label>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="border px-3 py-2 rounded w-full"
                placeholder="Search by name or SKU"
              />
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                    placeholder="Walk-in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                    placeholder="03xx-xxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                    placeholder="customer@email.com"
                  />
                </div>
              </div>
            </div>

            {productSearch.trim().length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2">Quick Add</div>
                {quickResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickResults.map((product) => {
                      const outOfStock = typeof product.totalStock === "number" && product.totalStock <= 0;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToSale(product.id)}
                          disabled={outOfStock}
                          className={`border rounded-md px-3 py-2 text-left transition ${outOfStock
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white hover:border-blue-400 hover:bg-blue-50"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-800 truncate">
                              {product.name}
                            </span>
                            <span className={`text-[11px] ${outOfStock ? "text-red-500" : "text-gray-500"}`}>
                              {outOfStock ? "Out of stock" : `Stock: ${product.totalStock ?? "N/A"}`}
                            </span>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {formatPKR(Number(product.sellingPrice || 0))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No matching products.</div>
                )}
              </div>
            )}

            <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] text-gray-500 uppercase font-semibold mb-2">
              <div className="col-span-5">Product</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2 text-right">Unit</div>
              <div className="col-span-2 text-right">Line Total</div>
              <div className="col-span-1 text-right">Remove</div>
            </div>

            <div className="mb-4">
              {items.map((item, idx) => {
                const selectedProduct = products.find((p) => p.id === item.productId);
                const maxQty = typeof selectedProduct?.totalStock === "number" ? selectedProduct.totalStock : undefined;
                const outOfStock = typeof maxQty === "number" && maxQty <= 0;
                const lineTotal = item.quantity * item.unitPrice;

                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center mb-3">
                    <div className="md:col-span-5 min-w-0">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="border px-2 py-2 rounded w-full min-w-0"
                      >
                        <option value="">Select Product</option>
                        {filteredProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.sku ? ` (${p.sku})` : ""} - PKR {Number(p.sellingPrice).toFixed(2)}{p.totalStock !== undefined ? ` | Stock: ${p.totalStock}` : ""}
                          </option>
                        ))}
                      </select>
                      {typeof maxQty === "number" && (
                        <div className={`text-[11px] mt-1 ${outOfStock ? "text-red-500" : "text-gray-500"}`}>
                          {outOfStock ? "Out of stock" : `Stock: ${maxQty}`}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={maxQty}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="border px-2 py-2 rounded w-full md:col-span-2 disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Qty"
                      disabled={!item.productId}
                    />
                    <div className="md:col-span-2 text-right text-sm text-gray-700">
                      {formatPKR(item.unitPrice)}
                    </div>
                    <div className="md:col-span-2 text-right text-sm font-semibold">
                      {formatPKR(lineTotal)}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="flex items-center justify-center gap-1 border border-red-200 text-red-600 hover:text-white hover:bg-red-500 hover:border-red-500 px-2 py-2 rounded md:col-span-1 text-xs transition"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                );
              })}
              {productsLoading && (
                <div className="text-sm text-gray-500">Loading products...</div>
              )}
              {!productsLoading && productsError && (
                <div className="text-sm text-red-500">Failed to load products.</div>
              )}
              {!productsLoading && !productsError && products.length === 0 && (
                <div className="text-sm text-gray-500">No products available.</div>
              )}
            </div>

            <button
              onClick={handleAddItem}
              className="bg-gray-300 px-4 py-2 rounded mb-4 w-full"
            >
              Add Item
            </button>

            <div className="mb-4 flex flex-col gap-2 bg-gray-50 border rounded p-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Items: {items.length} | Qty: {totalQuantity}</span>
                <span className="text-lg font-bold text-gray-900">Total: {formatPKR(totalAmount)}</span>
              </div>
              {stockIssues && (
                <div className="text-xs text-red-600">
                  Stock not available for one or more items. Adjust quantity to continue.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-4 py-2 rounded flex-1 disabled:opacity-60"
                disabled={!canComplete}
              >
                {isSubmitting ? "Saving..." : "Complete Sale"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
