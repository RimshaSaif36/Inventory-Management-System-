"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import {
  CheckCircle,
  Package,
  Tag,
  TrendingDown,
  TrendingUp,
  Bell,
  Users,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";
import StatCard from "./StatCard";

// Lazy load heavy components
const CardExpenseSummary = lazy(() => import("./CardExpenseSummary"));
const CardPopularProducts = lazy(() => import("./CardPopularProducts"));
const CardPurchaseSummary = lazy(() => import("./CardPurchaseSummary"));
const CardSalesSummary = lazy(() => import("./CardSalesSummary"));

const CardSkeleton = () => (
  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse h-64"></div>
);

interface AdminOverview {
  todaySales: number;
  todayTransactions: number;
  totalCustomers: number;
  pendingOrders: number;
  unreadNotifications: number;
  unapprovedPOS: number;
  totalProducts: number;
  lowStockItems: number;
}

interface EmployeeSale {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalSales: number;
  transactionCount: number;
}

// Salesman dashboard - their own sales
interface SalesmanStats {
  totalSales: number;
  transactionCount: number;
  recentSales: any[];
}

const AdminDashboard = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [employees, setEmployees] = useState<EmployeeSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, employeesRes] = await Promise.all([
          apiClient.get("/dashboard/admin-overview"),
          apiClient.get("/dashboard/employee-sales"),
        ]);
        setOverview(overviewRes.data);
        setEmployees(employeesRes.data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      {/* Admin Overview Cards */}
      {loading ? (
        <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse h-24"></div>
          ))}
        </div>
      ) : overview ? (
        <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Today&apos;s Sales</p>
              <p className="text-xl font-bold">${overview.todaySales.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{overview.todayTransactions} transactions</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Customers</p>
              <p className="text-xl font-bold">{overview.totalCustomers}</p>
              <p className="text-xs text-gray-400">{overview.totalProducts} products</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Orders</p>
              <p className="text-xl font-bold">{overview.pendingOrders}</p>
              <p className="text-xs text-gray-400">{overview.unapprovedPOS} POS unapproved</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Alerts</p>
              <p className="text-xl font-bold">{overview.unreadNotifications} notifications</p>
              <p className="text-xs text-gray-400">{overview.lowStockItems} low stock</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Standard charts */}
      <Suspense fallback={<CardSkeleton />}>
        <CardPopularProducts />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <CardSalesSummary />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <CardPurchaseSummary />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <CardExpenseSummary />
      </Suspense>

      {/* Employee Sales Report */}
      <div className="col-span-full bg-white rounded-2xl shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Employee Sales Performance</h2>
        </div>
        {loading ? (
          <div className="animate-pulse h-32 bg-gray-100 rounded"></div>
        ) : employees.length === 0 ? (
          <p className="text-gray-500 text-sm">No sales data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">#</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Role</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Transactions</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Total Sales</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Performance</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const maxSales = employees[0]?.totalSales || 1;
                  const pct = Math.round((emp.totalSales / maxSales) * 100);
                  return (
                    <tr key={emp.userId} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-sm">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-medium text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${emp.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : emp.role === "SALESMAN"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">{emp.transactionCount}</td>
                      <td className="p-3 text-right font-semibold text-sm">
                        ${emp.totalSales.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const SalesmanDashboard = () => {
  const [stats, setStats] = useState<SalesmanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAppSelector((state) => state.user.currentUser);

  useEffect(() => {
    const fetchMySales = async () => {
      try {
        const response = await apiClient.get("/sales", {
          params: { page: 1, pageSize: 50 },
        });
        const sales = response.data.data || response.data || [];
        const mySales = Array.isArray(sales)
          ? sales.filter((s: any) => s.userId === user?.id)
          : [];
        const totalSales = mySales.reduce(
          (sum: number, s: any) => sum + (s.totalAmount || 0),
          0
        );
        setStats({
          totalSales,
          transactionCount: mySales.length,
          recentSales: mySales.slice(0, 10),
        });
      } catch (error) {
        console.error("Error fetching salesman stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMySales();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="col-span-full p-6">
        <div className="animate-pulse h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="col-span-full">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Total Sales</p>
              <p className="text-2xl font-bold">
                ${stats?.totalSales.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Transactions</p>
              <p className="text-2xl font-bold">{stats?.transactionCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
        {!stats?.recentSales.length ? (
          <p className="text-gray-500 text-sm">No sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Customer</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Payment</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-600">Amount</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-600">Approved</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSales.map((sale: any) => (
                  <tr key={sale.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-sm">{sale.customer?.name || "Walk-in"}</td>
                    <td className="p-3 text-sm">{sale.paymentMethod}</td>
                    <td className="p-3 text-right font-semibold text-sm">
                      ${sale.totalAmount?.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${sale.approved
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                          }`}
                      >
                        {sale.approved ? "Yes" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const user = useAppSelector((state) => state.user.currentUser);
  const role = user?.role;

  if (role === "SALESMAN") {
    return (
      <div className="grid grid-cols-1 gap-6 pb-4">
        <SalesmanDashboard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:overflow-auto gap-10 pb-4 custom-grid-rows">
      {role === "ADMIN" ? (
        <AdminDashboard />
      ) : (
        <>
          <Suspense fallback={<CardSkeleton />}>
            <CardPopularProducts />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <CardSalesSummary />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <CardPurchaseSummary />
          </Suspense>
          <Suspense fallback={<CardSkeleton />}>
            <CardExpenseSummary />
          </Suspense>
          <StatCard
            title="Customer & Expenses"
            primaryIcon={<Package className="text-blue-600 w-6 h-6" />}
            dateRange="22 - 29 October 2023"
            details={[
              {
                title: "Customer Growth",
                amount: "175.00",
                changePercentage: 131,
                IconComponent: TrendingUp,
              },
              {
                title: "Expenses",
                amount: "10.00",
                changePercentage: -56,
                IconComponent: TrendingDown,
              },
            ]}
          />
          <StatCard
            title="Dues & Pending Orders"
            primaryIcon={<CheckCircle className="text-blue-600 w-6 h-6" />}
            dateRange="22 - 29 October 2023"
            details={[
              {
                title: "Dues",
                amount: "250.00",
                changePercentage: 131,
                IconComponent: TrendingUp,
              },
              {
                title: "Pending Orders",
                amount: "147",
                changePercentage: -56,
                IconComponent: TrendingDown,
              },
            ]}
          />
          <StatCard
            title="Sales & Discount"
            primaryIcon={<Tag className="text-blue-600 w-6 h-6" />}
            dateRange="22 - 29 October 2023"
            details={[
              {
                title: "Sales",
                amount: "1000.00",
                changePercentage: 20,
                IconComponent: TrendingUp,
              },
              {
                title: "Discount",
                amount: "200.00",
                changePercentage: -10,
                IconComponent: TrendingDown,
              },
            ]}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
