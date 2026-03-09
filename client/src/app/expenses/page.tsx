"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Expense {
  id: string;
  category: string;
  description?: string;
  amount: number;
  date: string;
}

interface CategorySummary {
  category: string;
  totalAmount: number;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#4F46E5",
  Utilities: "#10B981",
  Salaries: "#F59E0B",
  Office: "#EF4444",
  Transport: "#8B5CF6",
  Maintenance: "#EC4899",
  Other: "#6B7280",
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Form state
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/expenses", { params: { storeId } });
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const fetchCategorySummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/expenses/by-category", { params: { storeId } });
      setCategorySummary(response.data || []);
    } catch (error) {
      console.error("Error fetching expense summary:", error);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchExpenses();
      fetchCategorySummary();
    }
  }, [storeId, fetchExpenses, fetchCategorySummary]);

  const resetForm = () => {
    setFormCategory("");
    setFormDescription("");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formCategory || !formAmount) {
      alert("Category and amount are required");
      return;
    }
    try {
      const payload = {
        storeId,
        category: formCategory,
        description: formDescription || undefined,
        amount: formAmount,
        date: formDate,
      };
      if (editingId) {
        await apiClient.put(`/expenses/${editingId}`, payload);
      } else {
        await apiClient.post("/expenses", payload);
      }
      setShowModal(false);
      resetForm();
      fetchExpenses();
      fetchCategorySummary();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Error saving expense");
    }
  };

  const handleEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setFormCategory(exp.category);
    setFormDescription(exp.description || "");
    setFormAmount(exp.amount.toString());
    setFormDate(exp.date.split("T")[0]);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await apiClient.delete(`/expenses/${id}`);
      fetchExpenses();
      fetchCategorySummary();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const pieData = categorySummary.map((c) => ({
    name: c.category,
    amount: c.totalAmount,
    color: CATEGORY_COLORS[c.category] || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  }));

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">Track and manage store expenses</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Add Expense
        </button>
      </div>

      {/* Summary Cards & Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500">Total Expenses</h3>
          <p className="text-2xl font-bold">PKR {totalExpense.toFixed(2)}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500">Categories</h3>
          <p className="text-2xl font-bold">{categorySummary.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500">Total Entries</h3>
          <p className="text-2xl font-bold">{expenses.length}</p>
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">Expense by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                label
                outerRadius={120}
                dataKey="amount"
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === activeIndex ? "rgb(29, 78, 216)" : entry.color}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense Table (Excel-style) */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="border p-2">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="border p-2">{exp.category}</td>
                  <td className="border p-2">{exp.description || "-"}</td>
                  <td className="border p-2 text-right">PKR {exp.amount.toFixed(2)}</td>
                  <td className="border p-2 text-center space-x-1">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={5} className="border p-4 text-center text-gray-500">No expenses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Expense" : "Add Expense"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="border px-3 py-2 rounded w-full"
                >
                  <option value="">Select Category</option>
                  {["Rent", "Utilities", "Salaries", "Office", "Transport", "Maintenance", "Other"].map(
                    (cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="border px-3 py-2 rounded w-full"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="border px-3 py-2 rounded w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="border px-3 py-2 rounded w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {editingId ? "Update" : "Add"} Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
