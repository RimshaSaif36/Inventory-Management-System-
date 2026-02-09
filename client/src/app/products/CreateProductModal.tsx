"use client";

import { useGetModelsQuery, useUpdateProductMutation } from "@/state/api";
import React, { ChangeEvent, FormEvent, useState, useEffect } from "react";

type ProductFormData = {
  name: string;
  price: number;
  stockQuantity: number;
  rating: number;
  modelId: string;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
  product?: any;
};

const CreateProductModal = ({
  isOpen,
  onClose,
  onCreate,
  product,
}: CreateProductModalProps) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    price: 0,
    stockQuantity: 0,
    rating: 0,
    modelId: "",
  });

  const { data: models } = useGetModelsQuery();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || 0,
        stockQuantity: product.stockQuantity || 0,
        rating: product.rating || 0,
        modelId: product.modelId || "",
      });
    } else {
      setFormData({
        name: "",
        price: 0,
        stockQuantity: 0,
        rating: 0,
        modelId: "",
      });
    }
  }, [product]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "price" || name === "stockQuantity" || name === "rating"
          ? parseFloat(value) || 0
          : value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.modelId) {
      alert("Please select a model");
      return;
    }

    try {
      if (product) {
        await updateProduct({
          productId: product.productId,
          data: formData,
        }).unwrap();
      } else {
        onCreate(formData);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save product:", error);
    }
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
          {product ? "Edit Product" : "Create New Product"}
        </h3>
        <form onSubmit={handleSubmit}>
          {/* PRODUCT NAME */}
          <label htmlFor="productName" className={labelCssStyles}>
            Product Name
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

          {/* MODEL SELECTION */}
          <label htmlFor="modelId" className={labelCssStyles}>
            Model
          </label>
          <select
            name="modelId"
            onChange={handleChange}
            value={formData.modelId}
            className={inputCssStyles}
            required
          >
            <option value="">Select a model</option>
            {models?.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.category?.brand?.name} → {model.category?.name} → {model.name}
              </option>
            ))}
          </select>

          {/* PRICE */}
          <label htmlFor="productPrice" className={labelCssStyles}>
            Price
          </label>
          <input
            type="number"
            name="price"
            placeholder="Price"
            onChange={handleChange}
            value={formData.price}
            className={inputCssStyles}
            step="0.01"
            min="0"
            required
          />

          {/* STOCK QUANTITY */}
          <label htmlFor="stockQuantity" className={labelCssStyles}>
            Stock Quantity
          </label>
          <input
            type="number"
            name="stockQuantity"
            placeholder="Stock Quantity"
            onChange={handleChange}
            value={formData.stockQuantity}
            className={inputCssStyles}
            min="0"
            required
          />

          {/* RATING */}
          <label htmlFor="rating" className={labelCssStyles}>
            Rating
          </label>
          <input
            type="number"
            name="rating"
            placeholder="Rating (0-5)"
            onChange={handleChange}
            value={formData.rating}
            className={inputCssStyles}
            min="0"
            max="5"
            step="0.1"
          />

          {/* ACTIONS */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : product ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductModal;
