"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "", customerType: "POS" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const user = useAppSelector((state) => state.user.currentUser);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/customers", {
        params: { search },
      });
      const data = response.data;
      setCustomers(Array.isArray(data) ? data : data?.customers ?? data?.data ?? []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/customers/${editingId}`, formData);
      } else {
        await apiClient.post("/customers", formData);
      }
      setFormData({ name: "", phone: "", email: "", customerType: "POS" });
      setEditingId(null);
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      customerType: customer.customerType || "POS",
    });
    setEditingId(customer.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await apiClient.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          fetchCustomers();
          return;
        }
        let message = "Error deleting customer";
        if (axios.isAxiosError(error)) {
          const data: any = error.response?.data;
          message = data?.message || data?.error || message;
        }
        alert(message);
        console.error("Error deleting customer:", error);
      }
    }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

  const filteredCustomers =
    typeFilter === "ALL"
      ? customers
      : customers.filter((c) => c.customerType === typeFilter);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        {canEdit && (
          <button
            onClick={() => {
              setFormData({ name: "", phone: "", email: "", address: "", customerType: "POS" });
              setEditingId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Customer
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="ALL">All Types</option>
          <option value="POS">POS Customer</option>
          <option value="SALES_ORDER">Sales Order Customer</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Address</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Created Date</th>
                {canEdit && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="border p-4 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="border p-2">{customer.name}</td>
                    <td className="border p-2">{customer.phone || "-"}</td>
                    <td className="border p-2">{customer.email || "-"}</td>
                    <td className="border p-2">{customer.address || "-"}</td>
                    <td className="border p-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${customer.customerType === "POS"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                          }`}
                      >
                        {customer.customerType === "POS" ? "POS" : "Sales Order"}
                      </span>
                    </td>
                    <td className="border p-2">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    {canEdit && (
                      <td className="border p-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="bg-red-600 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit" : "Add"} Customer</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2">Customer Type</label>
                <select
                  value={formData.customerType}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="POS">POS Customer</option>
                  <option value="SALES_ORDER">Sales Order Customer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
