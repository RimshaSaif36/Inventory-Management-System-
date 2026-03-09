"use client";

import { useCreateSeriesMutation, useUpdateSeriesMutation, useGetCategoriesQuery, useGetBrandsQuery } from "@/state/api";
import { ChangeEvent, FormEvent, useState, useEffect } from "react";

type SeriesFormData = {
    name: string;
    description: string;
    categoryId: string;
    brandId: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    series?: any;
};

const CreateSeriesModal = ({ isOpen, onClose, series }: Props) => {
    const [formData, setFormData] = useState<SeriesFormData>({
        name: "",
        description: "",
        categoryId: "",
        brandId: "",
    });

    const [createSeries, { isLoading: isCreating }] = useCreateSeriesMutation();
    const [updateSeries, { isLoading: isUpdating }] = useUpdateSeriesMutation();
    const { data: brands } = useGetBrandsQuery(undefined);
    const { data: categoriesResponse } = useGetCategoriesQuery({ brandId: formData.brandId });
    const categories = categoriesResponse?.data || [];

    useEffect(() => {
        if (series) {
            const category = categories.find(c => c.id === series.categoryId);
            setFormData({
                name: series.name || "",
                description: series.description || "",
                categoryId: series.categoryId || "",
                brandId: category?.brandId || series.category?.brandId || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                categoryId: "",
                brandId: "",
            });
        }
    }, [series]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.brandId) {
            alert("Please select a brand");
            return;
        }

        if (!formData.categoryId) {
            alert("Please select a category");
            return;
        }

        try {
            // Remove brandId before sending to API as it's not part of series model
            const { brandId, ...seriesData } = formData;
            if (series) {
                await updateSeries({
                    id: series.id,
                    data: seriesData,
                }).unwrap();
            } else {
                await createSeries(seriesData).unwrap();
            }
            onClose();
        } catch (error) {
            console.error("Failed to save series:", error);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
            // Reset categoryId when brand changes
            ...(name === "brandId" && { categoryId: "" }),
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
                    {series ? "Edit Series" : "Create Series"}
                </h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="seriesName" className={labelCssStyles}>
                        Series Name
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
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="categoryId" className={labelCssStyles}>
                        Category
                    </label>
                    <select
                        name="categoryId"
                        onChange={handleChange}
                        value={formData.categoryId}
                        className={inputCssStyles}
                        required
                        disabled={!formData.brandId}
                    >
                        <option value="">
                            {formData.brandId ? "Select a category" : "Select a brand first"}
                        </option>
                        {categories?.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="seriesDescription" className={labelCssStyles}>
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
                                : series
                                    ? "Update"
                                    : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSeriesModal;
