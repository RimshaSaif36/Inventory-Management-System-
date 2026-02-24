"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
}

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
}

export default function POSSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchSales();
      fetchProducts();
    }
  }, [storeId]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/sales", { params: { storeId } });
      setSales(response.data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      newItems[index] = { ...newItems[index], productId: value, unitPrice: product?.sellingPrice || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: field === "quantity" ? parseInt(value) : value };
    }
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0 || !items[0].productId) {
      alert("Please add at least one item");
      return;
    }

    try {
      await apiClient.post("/sales", {
        storeId,
        userId: user?.id,
        items,
        paymentMethod,
      });
      setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
      setPaymentMethod("CASH");
      setShowModal(false);
      fetchSales();
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("Error creating sale");
    }
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2);
  };

  const canCreate = user?.role === "ACCOUNTANT";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">POS Sales</h1>
        {canCreate && (
          <button
            onClick={() => {
              setItems([{ productId: "", quantity: 1, unitPrice: 0 }]);
              setPaymentMethod("CASH");
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
                <th className="border p-2">Amount</th>
                <th className="border p-2">Payment Method</th>
                <th className="border p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="border p-2">{sale.id.substring(0, 8)}</td>
                  <td className="border p-2">PKR {sale.totalAmount.toFixed(2)}</td>
                  <td className="border p-2">{sale.paymentMethod}</td>
                  <td className="border p-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Sale</h2>

            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                {["CASH", "CARD", "TRANSFER", "CREDIT"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-4 py-2 rounded ${
                      paymentMethod === method ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
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
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    PKR {(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddItem}
              className="bg-gray-300 px-4 py-2 rounded mb-4 w-full"
            >
              Add Item
            </button>

            <div className="mb-4 text-lg font-bold">
              Total: PKR {getTotalAmount()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-4 py-2 rounded flex-1"
              >
                Complete Sale
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
