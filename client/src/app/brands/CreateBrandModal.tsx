"use client";

import { useCreateBrandMutation, useUpdateBrandMutation } from "@/state/api";
import { ChangeEvent, FormEvent, useState, useEffect } from "react";

type BrandFormData = {
    name: string;
    description: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    brand?: any;
};

const CreateBrandModal = ({ isOpen, onClose, brand }: Props) => {
    const [formData, setFormData] = useState<BrandFormData>({
        name: "",
        description: "",
    });

    const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation();
    const [updateBrand, { isLoading: isUpdating }] = useUpdateBrandMutation();

    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name || "",
                description: brand.description || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
            });
        }
    }, [brand]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            if (brand) {
                await updateBrand({
                    brandId: brand.brandId,
                    data: formData,
                }).unwrap();
            } else {
                await createBrand(formData).unwrap();
            }
            onClose();
        } catch (error) {
            console.error("Failed to save brand:", error);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
                    {brand ? "Edit Brand" : "Create Brand"}
                </h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="brandName" className={labelCssStyles}>
                        Brand Name
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

                    <label htmlFor="brandDescription" className={labelCssStyles}>
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
                                : brand
                                    ? "Update"
                                    : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBrandModal;