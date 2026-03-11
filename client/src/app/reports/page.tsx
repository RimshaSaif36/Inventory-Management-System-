"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface ReportData {
  totalRevenue?: number;
  totalCost?: number;
  profit?: number;
  profitMargin?: string;
  totalSales?: number;
  totalTransactions?: number;
  summary?: any;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("DASHBOARD");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    fetchReport();
  }, [reportType, storeId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = "";
      const params: any = {};
      if (storeId) params.storeId = storeId;

      switch (reportType) {
        case "DASHBOARD":
          url = "/reports/dashboard";
          break;
        case "PROFIT":
          url = "/reports/profit";
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          break;
        case "SALES":
          url = "/reports/sales";
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          break;
        case "PURCHASE":
          url = "/reports/purchase";
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          break;
        case "STOCK":
          url = "/stock/report/all";
          break;
      }

      const response = await apiClient.get(url, { params });
      setReportData(response.data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const canViewReports = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

  if (!canViewReports) {
    return <div className="p-6">Access Denied</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="border px-4 py-2 rounded-lg"
        >
          <option value="DASHBOARD">Dashboard Overview</option>
          <option value="PROFIT">Profit & Loss</option>
          <option value="SALES">Sales Report</option>
          <option value="PURCHASE">Purchase Report</option>
          <option value="STOCK">Stock Report</option>
        </select>

        {reportType !== "DASHBOARD" && (
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="border px-3 py-2 rounded-lg"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="border px-3 py-2 rounded-lg"
            />
            <button
              onClick={fetchReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Generate
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div>Loading report...</div>
      ) : reportData ? (
        <div className="grid grid-cols-2 gap-6">
          {reportType === "DASHBOARD" && (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Today's Sales</p>
                <p className="text-3xl font-bold">
                  PKR {reportData?.todaysSales?.totalAmount?.toFixed(2) || 0}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Inventory Value</p>
                <p className="text-3xl font-bold">
                  PKR {reportData?.inventory?.totalValue?.toFixed(2) || 0}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold">
                  {reportData?.inventory?.lowStockItems || 0}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Pending Orders</p>
                <p className="text-3xl font-bold">
                  {reportData?.pendingOrders || 0}
                </p>
              </div>
            </>
          )}

          {reportType === "PROFIT" && (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold">PKR {reportData?.totalRevenue?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold">PKR {reportData?.totalCost?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Profit</p>
                <p className="text-3xl font-bold">{reportData?.profit?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Profit Margin</p>
                <p className="text-3xl font-bold">{reportData?.profitMargin}%</p>
              </div>
            </>
          )}

          {reportType === "SALES" && (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold">PKR {reportData?.summary?.totalSales?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold">{reportData?.summary?.totalTransactions || 0}</p>
              </div>
            </>
          )}

          {reportType === "PURCHASE" && (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Purchases</p>
                <p className="text-3xl font-bold">PKR {reportData?.summary?.totalPurchases?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold">{reportData?.summary?.totalTransactions || 0}</p>
              </div>
            </>
          )}

          {reportType === "STOCK" && (
            <>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Products</p>
                <p className="text-3xl font-bold">{reportData?.summary?.totalProducts || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Total Value</p>
                <p className="text-3xl font-bold">PKR {reportData?.summary?.totalValue?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-red-600">{reportData?.summary?.lowStockCount || 0}</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>No data available</div>
      )}
    </div>
  );
}
