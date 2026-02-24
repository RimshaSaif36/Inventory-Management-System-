"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Stock {
  id: string;
  product: { name: string; brand?: { name: string } };
  quantity: number;
  reservedQty: number;
  lowStockLevel: number;
}

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [search, setSearch] = useState("");

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchStocks();
    }
  }, [storeId, search]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      let url = "/stock";
      if (showLowOnly) {
        url += "/report/low";
      }
      const response = await apiClient.get(url, {
        params: { storeId, search },
      });
      setStocks(response.data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLowStockCount = () => {
    return stocks.filter((s) => s.quantity < s.lowStockLevel).length;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Management</h1>
          <p className="text-gray-600 mt-2">Low Stock Items: {getLowStockCount()}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={`px-4 py-2 rounded-lg ${
            showLowOnly ? "bg-red-600 text-white" : "bg-gray-300"
          }`}
        >
          Low Stock Only
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Product</th>
                <th className="border p-2">Brand</th>
                <th className="border p-2">Current Stock</th>
                <th className="border p-2">Reserved</th>
                <th className="border p-2">Low Stock Level</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr key={stock.id}>
                  <td className="border p-2">{stock.product.name}</td>
                  <td className="border p-2">{stock.product.brand?.name || "-"}</td>
                  <td className="border p-2 font-semibold">{stock.quantity}</td>
                  <td className="border p-2">{stock.reservedQty}</td>
                  <td className="border p-2">{stock.lowStockLevel}</td>
                  <td className="border p-2">
                    {stock.quantity < stock.lowStockLevel ? (
                      <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm">
                        Low Stock
                      </span>
                    ) : (
                      <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm">
                        OK
                      </span>
                    )}
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
