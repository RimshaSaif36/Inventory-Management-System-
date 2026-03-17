"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  purchasePrice?: number;
  sellingPrice?: number;
}

interface PurchaseItem {
  id?: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product?: { name?: string };
}

interface Purchase {
  id: string;
  supplier?: { id?: string; name?: string };
  user?: { id?: string; name?: string };
  totalCost: number;
  createdAt: string;
  items?: PurchaseItem[];
}

const normalizeArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.purchases)) return value.purchases as T[];
  if (Array.isArray(value?.suppliers)) return value.suppliers as T[];
  if (Array.isArray(value?.products)) return value.products as T[];
  return [];
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formSupplierId, setFormSupplierId] = useState("");
  const [formItems, setFormItems] = useState<PurchaseItem[]>([
    { productId: "", quantity: 1, unitCost: 0, totalCost: 0 },
  ]);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";
  const canManage = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

  useEffect(() => {
    fetchPurchases();
  }, [storeId]);

  useEffect(() => {
    if (!canManage) return;
    fetchSuppliers();
    fetchProducts();
  }, [canManage]);

  const resetForm = () => {
    setFormSupplierId("");
    setFormItems([{ productId: "", quantity: 1, unitCost: 0, totalCost: 0 }]);
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/purchases", {
        params: storeId ? { storeId } : undefined,
      });
      setPurchases(normalizeArray<Purchase>(response.data));
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get("/suppliers");
      setSuppliers(normalizeArray<Supplier>(response.data));
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      setProducts(normalizeArray<Product>(response.data));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, unitCost: 0, totalCost: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "quantity" | "unitCost", value: string) => {
    setFormItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };

      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        const defaultCost = Number(product?.purchasePrice ?? product?.sellingPrice ?? 0);
        item.productId = value;
        item.unitCost = Number.isFinite(defaultCost) ? defaultCost : 0;
      }

      if (field === "quantity") {
        item.quantity = Math.max(1, Number(value) || 1);
      }

      if (field === "unitCost") {
        item.unitCost = Math.max(0, Number(value) || 0);
      }

      item.totalCost = item.quantity * item.unitCost;
      next[index] = item;
      return next;
    });
  };

  const handleCreatePurchase = async () => {
    if (!formSupplierId) {
      alert("Please select a supplier");
      return;
    }

    const validItems = formItems.filter(
      (item) => item.productId && Number(item.quantity) > 0 && Number(item.unitCost) >= 0
    );

    if (validItems.length === 0) {
      alert("Please add at least one valid item");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/purchases", {
        ...(storeId ? { storeId } : {}),
        ...(user?.id ? { userId: user.id } : {}),
        supplierId: formSupplierId,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          totalCost: Number(item.totalCost),
        })),
      });

      setShowModal(false);
      resetForm();
      fetchPurchases();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Error creating purchase");
      } else {
        alert("Error creating purchase");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Delete this purchase?")) return;

    try {
      await apiClient.delete(`/purchases/${id}`);
      fetchPurchases();
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        fetchPurchases();
        return;
      }
      alert(error?.response?.data?.message || "Error deleting purchase");
    }
  };

  const purchaseGrandTotal = formItems.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase History</h1>
        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Purchase
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
                <th className="border p-2">Purchase ID</th>
                <th className="border p-2">Supplier</th>
                <th className="border p-2">Items</th>
                <th className="border p-2">Total Cost</th>
                <th className="border p-2">Date</th>
                {canManage && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="border p-2">{purchase.id.substring(0, 8)}</td>
                  <td className="border p-2">{purchase.supplier?.name || "-"}</td>
                  <td className="border p-2 text-center">{purchase.items?.length || 0}</td>
                  <td className="border p-2">PKR {Number(purchase.totalCost || 0).toFixed(2)}</td>
                  <td className="border p-2">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                  {canManage && (
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => handleDeletePurchase(purchase.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="border p-4 text-center text-gray-500">
                    No purchases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Add Purchase</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Supplier *</label>
              <select
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Items *</label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-blue-600 text-sm font-semibold"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-2">
                {formItems.map((item, index) => (
                  <div
                    key={`${index}-${item.productId}`}
                    className="grid grid-cols-[minmax(0,1fr)_90px_120px_120px_28px] gap-2 items-center"
                  >
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                      className="border px-2 py-2 rounded"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="border px-2 py-2 rounded text-center"
                    />

                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(index, "unitCost", e.target.value)}
                      className="border px-2 py-2 rounded"
                    />

                    <div className="text-sm font-semibold text-right pr-2">
                      PKR {Number(item.totalCost || 0).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700"
                      disabled={formItems.length === 1}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right font-bold mb-4">
              Total: PKR {purchaseGrandTotal.toFixed(2)}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePurchase}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Create Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
