"use client";

import { Suspense, lazy } from "react";
import {
  CheckCircle,
  Package,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import StatCard from "./StatCard";

// Lazy load heavy components
const CardExpenseSummary = lazy(() => import("./CardExpenseSummary"));
const CardPopularProducts = lazy(() => import("./CardPopularProducts"));
const CardPurchaseSummary = lazy(() => import("./CardPurchaseSummary"));
const CardSalesSummary = lazy(() => import("./CardSalesSummary"));

// Loading skeleton component
const CardSkeleton = () => (
  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse h-64"></div>
);

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:overflow-auto gap-10 pb-4 custom-grid-rows">
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
    </div>
  );
};

export default Dashboard;
