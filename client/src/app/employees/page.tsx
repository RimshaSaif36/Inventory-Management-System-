"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/app/redux";
import { apiClient } from "@/lib/apiClient";

interface Employee {
  id: string;
  name: string;
  position?: string;
  storeId: string;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", position: "", storeId: "" });
  const [search, setSearch] = useState("");

  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";

  useEffect(() => {
    if (storeId) {
      fetchEmployees();
    }
  }, [search, storeId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/employees", {
        params: { storeId, search },
      });
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, storeId };
      if (editingId) {
        await apiClient.put(`/employees/${editingId}`, payload);
      } else {
        await apiClient.post("/employees", payload);
      }
      setFormData({ name: "", position: "", storeId: "" });
      setEditingId(null);
      setShowModal(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({ name: employee.name, position: employee.position || "", storeId: employee.storeId });
    setEditingId(employee.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await apiClient.delete(`/employees/${id}`);
        fetchEmployees();
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const canEdit = user?.role === "ACCOUNTANT";

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employees</h1>
        {canEdit && (
          <button
            onClick={() => {
              setFormData({ name: "", position: "", storeId });
              setEditingId(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add Employee
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search employees..."
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
                <th className="border p-2">Position</th>
                <th className="border p-2">Created Date</th>
                {canEdit && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="border p-2">{employee.name}</td>
                  <td className="border p-2">{employee.position || "-"}</td>
                  <td className="border p-2">{new Date(employee.createdAt).toLocaleDateString()}</td>
                  {canEdit && (
                    <td className="border p-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
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
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit" : "Add"} Employee</h2>
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
                <label className="block mb-2">Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
