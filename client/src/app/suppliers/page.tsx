"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Supplier {
  id: string;
  name: string;
  contactInfo?: string;
  createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", contactInfo: "" });
  const [search, setSearch] = useState("");

  const user = useAppSelector((state) => state.user.currentUser);

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/suppliers", {
        params: { search },
      });
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/suppliers/${editingId}`, formData);
      } else {
        await apiClient.post("/suppliers", formData);
      }
      setFormData({ name: "", contactInfo: "" });
      setEditingId(null);
      setShowModal(false);
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({ name: supplier.name, contactInfo: supplier.contactInfo || "" });
    setEditingId(supplier.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await apiClient.delete(`/suppliers/${id}`);
        fetchSuppliers();
      } catch (error) {
        console.error("Error deleting supplier:", error);
      }
    }
  };

  const canEdit = user?.role === "ACCOUNTANT";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        {canEdit && (
          <button
            onClick={() => {
              setFormData({ name: "", contactInfo: "" });
              setEditingId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Supplier
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search suppliers..."
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
                <th className="border p-2">Contact Info</th>
                <th className="border p-2">Created Date</th>
                {canEdit && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="border p-2">{supplier.name}</td>
                  <td className="border p-2">{supplier.contactInfo || "-"}</td>
                  <td className="border p-2">{new Date(supplier.createdAt).toLocaleDateString()}</td>
                  {canEdit && (
                    <td className="border p-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
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
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit" : "Add"} Supplier</h2>
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
                <label className="block mb-2">Contact Info</label>
                <input
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
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
