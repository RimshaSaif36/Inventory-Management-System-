"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  const [search, setSearch] = useState("");

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
      setCustomers(response.data);
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
      setFormData({ name: "", phone: "", email: "" });
      setEditingId(null);
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({ name: customer.name, phone: customer.phone || "", email: customer.email || "" });
    setEditingId(customer.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await apiClient.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  };

  const canEdit = user?.role === "ACCOUNTANT";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        {canEdit && (
          <button
            onClick={() => {
              setFormData({ name: "", phone: "", email: "" });
              setEditingId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Customer
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
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
                <th className="border p-2">Created Date</th>
                {canEdit && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="border p-2">{customer.name}</td>
                  <td className="border p-2">{customer.phone || "-"}</td>
                  <td className="border p-2">{customer.email || "-"}</td>
                  <td className="border p-2">{new Date(customer.createdAt).toLocaleDateString()}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
