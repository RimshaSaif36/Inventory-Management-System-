"use client";

import { useGetSeriesQuery, useDeleteSeriesMutation, useGetCategoriesQuery } from "@/state/api";
import { PlusCircleIcon, SearchIcon, EditIcon, TrashIcon, FilterIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateSeriesModal from "./CreateSeriesModal";

const Series = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [page, setPage] = useState<number>(1);
    const [pageSize] = useState<number>(20);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<any>(null);

    const {
        data: seriesResponse,
        isLoading,
        isError,
    } = useGetSeriesQuery({ search: searchTerm, categoryId: selectedCategoryId, page, pageSize });
    const series = seriesResponse?.data || [];
    const total = seriesResponse?.total || 0;
    const totalPages = seriesResponse?.totalPages || 1;

    const { data: categoriesResponse } = useGetCategoriesQuery(undefined);
    const categories = categoriesResponse?.data || [];
    const [deleteSeries] = useDeleteSeriesMutation();

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this series?")) {
            try {
                await deleteSeries(id).unwrap();
            } catch (error: any) {
                alert(error.data?.message || "Failed to delete series");
            }
        }
    };

    const handleEdit = (item: any) => {
        setEditingSeries(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSeries(null);
    };

    if (isLoading) {
        return <div className="py-4">Loading...</div>;
    }

    if (isError || !series) {
        return (
            <div className="text-center text-red-500 py-4">
                Failed to fetch series
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
                        placeholder="Search series..."
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
                            <option key={category.id} value={category.id}>
                                {category.brand?.name} - {category.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* HEADER BAR */}
            <div className="flex justify-between items-center mb-6">
                <Header name="Series" />
                <button
                    className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
                    onClick={() => setIsModalOpen(true)}
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2 !text-gray-200" /> Create
                    Series
                </button>
            </div>

            {/* SERIES TABLE */}
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
                                    Products
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
                            {series?.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {item.description || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {item.category?.name || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {item.products?.length || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                aria-label="Edit series"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-900"
                                                aria-label="Delete series"
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
                <div className="text-sm text-gray-600">Showing page {page} of {totalPages} — {total} series</div>
                <div className="space-x-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
                </div>
            </div>

            {/* CREATE/EDIT SERIES MODAL */}
            <CreateSeriesModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                series={editingSeries}
            />
        </div>
    );
};

export default Series;
