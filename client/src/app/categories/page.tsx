"use client";

import { useGetCategoriesQuery, useDeleteCategoryMutation, useGetBrandsQuery } from "@/state/api";
import { PlusCircleIcon, SearchIcon, EditIcon, TrashIcon, FilterIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateCategoryModal from "./CreateCategoryModal";

const Categories = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrandId, setSelectedBrandId] = useState("");
    const [page, setPage] = useState<number>(1);
    const [pageSize] = useState<number>(20);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    const {
        data: categoriesResponse,
        isLoading,
        isError,
    } = useGetCategoriesQuery({ search: searchTerm, brandId: selectedBrandId, page, pageSize });

    const categories = categoriesResponse?.data || [];
    const total = categoriesResponse?.total || 0;
    const totalPages = categoriesResponse?.totalPages || 1;

    const { data: brands } = useGetBrandsQuery(undefined);
    const [deleteCategory] = useDeleteCategoryMutation();

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await deleteCategory(id).unwrap();
            } catch (error: any) {
                alert(error.data?.message || "Failed to delete category");
            }
        }
    };

    const handleEdit = (category: any) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    if (isLoading) {
        return <div className="py-4">Loading...</div>;
    }

    if (isError || !categories) {
        return (
            <div className="text-center text-red-500 py-4">
                Failed to fetch categories
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
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center border-2 border-gray-200 rounded min-w-48">
                    <FilterIcon className="w-5 h-5 text-gray-500 m-2" />
                    <select
                        className="w-full py-2 px-4 rounded bg-white"
                        value={selectedBrandId}
                        onChange={(e) => setSelectedBrandId(e.target.value)}
                    >
                        <option value="">All Brands</option>
                        {brands?.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* HEADER BAR */}
            <div className="flex justify-between items-center mb-6">
                <Header name="Categories" />
                <button
                    className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
                    onClick={() => setIsModalOpen(true)}
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2 !text-gray-200" /> Create
                    Category
                </button>
            </div>

            {/* CATEGORIES TABLE */}
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
                                    Brand
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Models
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {categories?.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {category.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {category.description || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {category.brand?.name || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {category.products?.length || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {category.createdAt ? new Date(category.createdAt).toLocaleString() : "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                aria-label="Edit category"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="text-red-600 hover:text-red-900"
                                                aria-label="Delete category"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">Showing page {page} of {totalPages} — {total} categories</div>
                <div className="space-x-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
                </div>
            </div>

            {/* CREATE/EDIT CATEGORY MODAL */}
            <CreateCategoryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                category={editingCategory}
            />
        </div>
    );
};

export default Categories;