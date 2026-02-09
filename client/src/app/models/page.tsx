"use client";

import { useGetModelsQuery, useDeleteModelMutation, useGetCategoriesQuery } from "@/state/api";
import { PlusCircleIcon, SearchIcon, EditIcon, TrashIcon, FilterIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateModelModal from "./CreateModelModal";

const Models = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<any>(null);

    const {
        data: models,
        isLoading,
        isError,
    } = useGetModelsQuery({ search: searchTerm, categoryId: selectedCategoryId });

    const { data: categories } = useGetCategoriesQuery();
    const [deleteModel] = useDeleteModelMutation();

    const handleDelete = async (modelId: string) => {
        if (window.confirm("Are you sure you want to delete this model?")) {
            try {
                await deleteModel(modelId).unwrap();
            } catch (error: any) {
                alert(error.data?.message || "Failed to delete model");
            }
        }
    };

    const handleEdit = (model: any) => {
        setEditingModel(model);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingModel(null);
    };

    if (isLoading) {
        return <div className="py-4">Loading...</div>;
    }

    if (isError || !models) {
        return (
            <div className="text-center text-red-500 py-4">
                Failed to fetch models
            </div>
        );
    }

    return (
        <div className="mx-auto pb-5 w-full">
            {/* SEARCH AND FILTER BAR */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 flex items-center border-2 border-gray-200 rounded">
                    <SearchIcon className="w-5 h-5 text-gray-500 m-2" />
                    <input
                        className="w-full py-2 px-4 rounded bg-white"
                        placeholder="Search models..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center border-2 border-gray-200 rounded min-w-48">
                    <FilterIcon className="w-5 h-5 text-gray-500 m-2" />
                    <select
                        className="w-full py-2 px-4 rounded bg-white"
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories?.map((category) => (
                            <option key={category.categoryId} value={category.categoryId}>
                                {category.brand?.name} - {category.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* HEADER BAR */}
            <div className="flex justify-between items-center mb-6">
                <Header name="Models" />
                <button
                    className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
                    onClick={() => setIsModalOpen(true)}
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2 !text-gray-200" /> Create
                    Model
                </button>
            </div>

            {/* MODELS TABLE */}
            <div className="w-full bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Brand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Products
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {models?.map((model) => (
                                <tr key={model.modelId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {model.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {model.description || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {model.category?.name || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {model.category?.brand?.name || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {model.Products?.length || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(model.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(model)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(model.modelId)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE/EDIT MODEL MODAL */}
            <CreateModelModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                model={editingModel}
            />
        </div>
    );
};

export default Models;