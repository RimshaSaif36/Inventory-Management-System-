"use client";

import { useCreateModelMutation, useUpdateModelMutation, useGetCategoriesQuery } from "@/state/api";
import { ChangeEvent, FormEvent, useState, useEffect } from "react";

type ModelFormData = {
    name: string;
    description: string;
    categoryId: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    model?: any;
};

const CreateModelModal = ({ isOpen, onClose, model }: Props) => {
    const [formData, setFormData] = useState<ModelFormData>({
        name: "",
        description: "",
        categoryId: "",
    });

    const [createModel, { isLoading: isCreating }] = useCreateModelMutation();
    const [updateModel, { isLoading: isUpdating }] = useUpdateModelMutation();
    const { data: categories } = useGetCategoriesQuery();

    useEffect(() => {
        if (model) {
            setFormData({
                name: model.name || "",
                description: model.description || "",
                categoryId: model.categoryId || "",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                categoryId: "",
            });
        }
    }, [model]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.categoryId) {
            alert("Please select a category");
            return;
        }

        try {
            if (model) {
                await updateModel({
                    modelId: model.modelId,
                    data: formData,
                }).unwrap();
            } else {
                await createModel(formData).unwrap();
            }
            onClose();
        } catch (error) {
            console.error("Failed to save model:", error);
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
                    {model ? "Edit Model" : "Create Model"}
                </h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="modelName" className={labelCssStyles}>
                        Model Name
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

                    <label htmlFor="categoryId" className={labelCssStyles}>
                        Category
                    </label>
                    <select
                        name="categoryId"
                        onChange={handleChange}
                        value={formData.categoryId}
                        className={inputCssStyles}
                        required
                    >
                        <option value="">Select a category</option>
                        {categories?.map((category) => (
                            <option key={category.categoryId} value={category.categoryId}>
                                {category.brand?.name} - {category.name}
                            </option>
                        ))}
                    </select>

                    <label htmlFor="modelDescription" className={labelCssStyles}>
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
                                : model
                                    ? "Update"
                                    : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateModelModal;