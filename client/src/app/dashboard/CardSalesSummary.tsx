import { useGetDashboardMetricsQuery } from "@/state/api";
import React, { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppSelector } from "@/app/redux";

const CardSalesSummary = () => {
  const storeId = useAppSelector((state) => state.user.currentUser?.storeId);
  const { data, isLoading, isError } = useGetDashboardMetricsQuery(storeId || undefined);
  const salesData = data?.salesSummary || [];

  const [timeframe, setTimeframe] = useState("weekly");

  const sortedData = [...salesData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const toDateKey = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy.toISOString().split("T")[0];
  };

  const getWeekStart = (date: Date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const buildChangeSeries = (
    series: Array<{ date: string; totalValue: number }>
  ) =>
    series.map((item, index) => {
      const prev = index > 0 ? series[index - 1].totalValue : 0;
      const changePercentage = prev
        ? ((item.totalValue - prev) / prev) * 100
        : 0;
      return {
        salesSummaryId: `ss-${item.date}`,
        date: item.date,
        totalValue: item.totalValue,
        changePercentage,
      };
    });

  const displayData = (() => {
    if (timeframe === "daily") {
      const lastDays = sortedData.slice(-7);
      return buildChangeSeries(
        lastDays.map((item) => ({
          date: item.date,
          totalValue: item.totalValue,
        }))
      );
    }

    if (timeframe === "weekly") {
      const weeklyMap = new Map<string, number>();
      for (const item of sortedData) {
        const weekStart = getWeekStart(new Date(item.date));
        const key = toDateKey(weekStart);
        weeklyMap.set(key, (weeklyMap.get(key) || 0) + item.totalValue);
      }
      const weeklySeries = Array.from(weeklyMap.entries())
        .map(([date, totalValue]) => ({ date, totalValue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return buildChangeSeries(weeklySeries);
    }

    const monthlyMap = new Map<string, number>();
    for (const item of sortedData) {
      const d = new Date(item.date);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const key = toDateKey(monthStart);
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + item.totalValue);
    }
    const monthlySeries = Array.from(monthlyMap.entries())
      .map(([date, totalValue]) => ({ date, totalValue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return buildChangeSeries(monthlySeries);
  })();

  const totalValueSum =
    displayData.reduce((acc, curr) => acc + curr.totalValue, 0) || 0;

  const highestValueData = displayData.reduce((acc, curr) => {
    return acc.totalValue > curr.totalValue ? acc : curr;
  }, displayData[0] || {});

  const highestValueDate = highestValueData.date
    ? new Date(highestValueData.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    })
    : "N/A";

  const formatXAxis = (value: string) => {
    const date = new Date(value);
    if (timeframe === "monthly") {
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    if (timeframe === "weekly") {
      return `Wk ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTooltipLabel = (label: string) => {
    const date = new Date(label);
    if (timeframe === "monthly") {
      return `Month of ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    }
    if (timeframe === "weekly") {
      return `Week of ${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isError) {
    return <div className="m-5">Failed to fetch data</div>;
  }

  return (
    <div className="row-span-3 xl:row-span-6 bg-white shadow-md rounded-2xl flex flex-col justify-between">
      {isLoading ? (
        <div className="m-5">Loading...</div>
      ) : (
        <>
          {/* HEADER */}
          <div>
            <h2 className="text-lg font-semibold mb-2 px-7 pt-5">
              Sales Summary
            </h2>
            <hr />
          </div>

          {/* BODY */}
          <div>
            {/* BODY HEADER */}
            <div className="flex justify-between items-center mb-6 px-7 mt-5">
              <div className="text-lg font-medium">
                <p className="text-xs text-gray-400">Value</p>
                <span className="text-2xl font-extrabold">
                  PKR {totalValueSum.toLocaleString("en-PK", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <select
                className="shadow-sm border border-gray-300 bg-white p-2 rounded"
                value={timeframe}
                onChange={(e) => {
                  setTimeframe(e.target.value);
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {/* CHART */}
            {displayData.length === 0 ? (
              <div className="px-7 pb-6 text-sm text-gray-500">
                No sales data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300} className="px-7">
                <AreaChart
                  data={displayData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    tickMargin={8}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(value) => value.toLocaleString("en-PK")}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    label={{
                      value: "PKR",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "#6b7280",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `PKR ${value.toLocaleString("en-PK")}`,
                      "Sales",
                    ]}
                    labelFormatter={formatTooltipLabel}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    stroke="#2563eb"
                    fill="url(#salesFill)"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1, stroke: "#2563eb", fill: "#ffffff" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* FOOTER */}
          <div>
            <hr />
            <div className="flex justify-between items-center mt-6 text-sm px-7 mb-4">
              <p>{displayData.length || 0} days</p>
              <p className="text-sm">
                Highest Sales Date:{" "}
                <span className="font-bold">{highestValueDate}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CardSalesSummary;
