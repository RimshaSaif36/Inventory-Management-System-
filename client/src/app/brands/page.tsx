"use client";

import { useGetBrandsQuery, useDeleteBrandMutation } from "@/state/api";
import { PlusCircleIcon, SearchIcon, EditIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateBrandModal from "./CreateBrandModal";

const Brands = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<any>(null);

    const {
        data: brands,
        isLoading,
        isError,
    } = useGetBrandsQuery(searchTerm);

    const [deleteBrand] = useDeleteBrandMutation();

    const handleDelete = async (brandId: string) => {
        if (window.confirm("Are you sure you want to delete this brand?")) {
            try {
                await deleteBrand(brandId).unwrap();
            } catch (error: any) {
                alert(error.data?.message || "Failed to delete brand");
            }
        }
    };

    const handleEdit = (brand: any) => {
        setEditingBrand(brand);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBrand(null);
    };

    if (isLoading) {
        return <div className="py-4">Loading...</div>;
    }

    if (isError || !brands) {
        return (
            <div className="text-center text-red-500 py-4">
                Failed to fetch brands
            </div>
        );
    }

    return (
        <div className="mx-auto pb-5 w-full">
            {/* SEARCH BAR */}
            <div className="mb-6">
                <div className="flex items-center border-2 border-gray-200 rounded">
                    <SearchIcon className="w-5 h-5 text-gray-500 m-2" />
                    <input
                        className="w-full py-2 px-4 rounded bg-white"
                        placeholder="Search brands..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* HEADER BAR */}
            <div className="flex justify-between items-center mb-6">
                <Header name="Brands" />
                <button
                    className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
                    onClick={() => setIsModalOpen(true)}
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2 !text-gray-200" /> Create
                    Brand
                </button>
            </div>

            {/* BRANDS TABLE */}
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
                                    Categories
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
                            {brands?.map((brand) => (
                                <tr key={brand.brandId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {brand.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {brand.description || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {brand.Categories?.length || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(brand.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(brand)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand.brandId)}
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

            {/* CREATE/EDIT BRAND MODAL */}
            <CreateBrandModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                brand={editingBrand}
            />
        </div>
    );
};

export default Brands;