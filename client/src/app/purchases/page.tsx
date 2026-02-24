"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Purchase {
  id: string;
  supplier: { name: string };
  totalCost: number;
  createdAt: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchPurchases();
    }
  }, [storeId]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/purchases", { params: { storeId } });
      setPurchases(response.data);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase History</h1>
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
                <th className="border p-2">Total Cost</th>
                <th className="border p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="border p-2">{purchase.id.substring(0, 8)}</td>
                  <td className="border p-2">{purchase.supplier.name}</td>
                  <td className="border p-2">PKR {purchase.totalCost.toFixed(2)}</td>
                  <td className="border p-2">{new Date(purchase.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
