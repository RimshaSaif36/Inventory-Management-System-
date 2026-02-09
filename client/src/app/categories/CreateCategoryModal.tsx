"use client";

import { useCreateCategoryMutation, useUpdateCategoryMutation, useGetBrandsQuery } from "@/state/api";
import { ChangeEvent, FormEvent, useState, useEffect } from "react";

type CategoryFormData = {
    name: string;
    description: string;
    brandId: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    category?: any;
};

const CreateCategoryModal = ({ isOpen, onClose, category }: Props) => {
    const [formData, setFormData] = useState<CategoryFormData>({
        name: "",
        description: "",
        brandId: "",
    });

    const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
    const { data: brands } = useGetBrandsQuery();

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || "",
                description: category.description || "",
                brandId: category.brandId || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                brandId: "",
            });
        }
    }, [category]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.brandId) {
            alert("Please select a brand");
            return;
        }

        try {
            if (category) {
                await updateCategory({
                    categoryId: category.categoryId,
                    data: formData,
                }).unwrap();
            } else {
                await createCategory(formData).unwrap();
            }
            onClose();
        } catch (error) {
            console.error("Failed to save category:", error);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const labelCssStyles = "block text-sm font-medium text-gray-700";
    const inputCssStyles = "block w-full mb-2 p-2 border-gray-500 border-2 rounded-md";

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-20"
            onClick={handleOverlayClick}
        >
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {category ? "Edit Category" : "Create Category"}
                </h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="categoryName" className={labelCssStyles}>
                        Category Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        onChange={handleChange}
                        value={formData.name}
                        className={inputCssStyles}
                        required
                    />

                    <label htmlFor="brandId" className={labelCssStyles}>
                        Brand
                    </label>
                    <select
                        name="brandId"
                        onChange={handleChange}
                        value={formData.brandId}
                        className={inputCssStyles}
                        required
                    >
                        <option value="">Select a brand</option>
                        {brands?.map((brand) => (
                            <option key={brand.brandId} value={brand.brandId}>
                                {brand.name}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="categoryDescription" className={labelCssStyles}>
                        Description
                    </label>
                    <textarea
                        name="description"
                        placeholder="Description"
                        onChange={handleChange}
                        value={formData.description}
                        className={inputCssStyles}
                        rows={3}
                    />

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                            disabled={isCreating || isUpdating}
                        >
                            {isCreating || isUpdating
                                ? "Saving..."
                                : category
                                    ? "Update"
                                    : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCategoryModal;