"use client";

import { useGetUsersQuery, useCreateUserMutation } from "@/state/api";
import Header from "@/app/(components)/Header";
import CreateUserModal from "./CreateUserModal";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { PlusCircleIcon } from "lucide-react";
import { useState } from "react";

type UserFormData = {
  name: string;
  email: string;
  role: string;
  password: string;
};

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 250 },
  { field: "name", headerName: "Name", width: 200 },
  { field: "email", headerName: "Email", width: 200 },
  { field: "role", headerName: "Role", width: 150 },
];

const Users = () => {
  const { data: users, isError, isLoading, refetch } = useGetUsersQuery();
  const [createUser] = useCreateUserMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateUser = async (userData: UserFormData) => {
    try {
      await createUser(userData).unwrap();
      setIsModalOpen(false);
      refetch();
    } catch (error: any) {
      let errorMessage = "Failed to create user";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      console.error("Failed to create user:", errorMessage);
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !users) {
    return (
      <div className="text-center text-red-500 py-4">Failed to fetch users</div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <Header name="Users" />
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
        >
          <PlusCircleIcon size={20} />
          Create User
        </button>
      </div>

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateUser}
      />

      <DataGrid
        rows={users}
        columns={columns}
        getRowId={(row) => row.id}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Users;
