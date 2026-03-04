"use client";

import { useGetSeriesQuery, useUpdateProductMutation } from "@/state/api";
import React, { ChangeEvent, FormEvent, useState, useEffect } from "react";

type ProductFormData = {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  seriesId: string;
  imageFile?: File | null;
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
    purchasePrice: 0,
    sellingPrice: 0,
    seriesId: "",
    imageFile: null,
  });
  const [error, setError] = useState<string>("");

  const { data: seriesResponse } = useGetSeriesQuery(undefined);
  const series = seriesResponse?.data || [];
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        purchasePrice: product.purchasePrice || 0,
        sellingPrice: product.sellingPrice || 0,
        seriesId: product.seriesId || "",
      });
    } else {
      setFormData({
        name: "",
        purchasePrice: 0,
        sellingPrice: 0,
        seriesId: "",
      });
    }
  }, [product]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "purchasePrice" || name === "sellingPrice"
          ? parseFloat(value) || 0
          : value,
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormData({ ...formData, imageFile: file });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!formData.seriesId) {
      setError("Please select a series");
      return;
    }

    try {
      if (product) {
        // For updates, build data without imageFile (File objects can't be sent as JSON)
        const updateData: Partial<ProductFormData> = {
          name: formData.name,
          purchasePrice: formData.purchasePrice,
          sellingPrice: formData.sellingPrice,
          seriesId: formData.seriesId,
        };

        // If a new image file was selected, upload it first
        if (formData.imageFile) {
          const uploadForm = new FormData();
          uploadForm.append("image", formData.imageFile);
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products/upload`, {
            method: "POST",
            body: uploadForm,
          });
          const json = await resp.json();
          if (json?.url) {
            updateData.imageUrl = json.url;
          }
        }

        await updateProduct({
          productId: product.id,
          data: updateData,
        }).unwrap();
      } else {
        // If an image file is selected, upload it first
        if (formData.imageFile) {
          const uploadForm = new FormData();
          uploadForm.append("image", formData.imageFile);
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products/upload`, {
            method: "POST",
            body: uploadForm,
          });
          const json = await resp.json();
          if (json?.url) {
            onCreate({ ...formData, imageUrl: json.url } as any);
          } else {
            onCreate(formData);
          }
        } else {
          onCreate(formData);
        }
      }
      onClose();
    } catch (error: any) {
      let errorMessage = "Failed to save product";
      
      // Try to extract the most relevant error message
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      console.error("Failed to save product:", error);
      setError(errorMessage);
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
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
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

          {/* SERIES SELECTION */}
          <label htmlFor="seriesId" className={labelCssStyles}>
            Series
          </label>
          <select
            name="seriesId"
            onChange={handleChange}
            value={formData.seriesId}
            className={inputCssStyles}
            required
          >
            <option value="">Select a series</option>
            {series?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.category?.brand?.name} → {item.category?.name} → {item.name}
              </option>
            ))}
          </select>

          {/* PURCHASE PRICE */}
          <label htmlFor="purchasePrice" className={labelCssStyles}>
            Purchase Price
          </label>
          <input
            type="number"
            name="purchasePrice"
            placeholder="Purchase Price"
            onChange={handleChange}
            value={formData.purchasePrice}
            className={inputCssStyles}
            step="0.01"
            min="0"
            required
          />

          {/* SELLING PRICE */}
          <label htmlFor="sellingPrice" className={labelCssStyles}>
            Selling Price
          </label>
          <input
            type="number"
            name="sellingPrice"
            placeholder="Selling Price"
            onChange={handleChange}
            value={formData.sellingPrice}
            className={inputCssStyles}
            step="0.01"
            min="0"
            required
          />

          {/* IMAGE UPLOAD */}
          <label htmlFor="image" className={labelCssStyles}>
            Image (optional)
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
            className={inputCssStyles}
          />

          {/* Preview */}
          {(formData.imageFile || product?.imageUrl) && (
            <div className="mb-2">
              <img
                src={
                  formData.imageFile
                    ? URL.createObjectURL(formData.imageFile)
                    : (product?.imageUrl as string)
                }
                alt="preview"
                className="w-32 h-32 object-cover rounded"
              />
            </div>
          )}

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
