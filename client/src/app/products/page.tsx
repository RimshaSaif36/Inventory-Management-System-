"use client";

import { useCreateProductMutation, useGetProductsQuery, useGetModelsQuery, useDeleteProductMutation } from "@/state/api";
import { PlusCircleIcon, SearchIcon, FilterIcon, EditIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import Rating from "@/app/(components)/Rating";
import CreateProductModal from "./CreateProductModal";
import Image from "next/image";

type ProductFormData = {
  name: string;
  price: number;
  stockQuantity: number;
  rating: number;
  modelId: string;
};

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const {
    data: products,
    isLoading,
    isError,
  } = useGetProductsQuery({ search: searchTerm, modelId: selectedModelId });

  const { data: models } = useGetModelsQuery();
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const handleCreateProduct = async (productData: ProductFormData) => {
    await createProduct(productData);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(productId).unwrap();
      } catch (error: any) {
        alert(error.data?.message || "Failed to delete product");
      }
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !products) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch products
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
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center border-2 border-gray-200 rounded min-w-64">
          <FilterIcon className="w-5 h-5 text-gray-500 m-2" />
          <select
            className="w-full py-2 px-4 rounded bg-white"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
          >
            <option value="">All Models</option>
            {models?.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.category?.brand?.name} - {model.category?.name} - {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="flex justify-between items-center mb-6">
        <Header name="Products" />
        <button
          className="flex items-center bg-blue-500 hover:bg-blue-700 text-gray-200 font-bold py-2 px-4 rounded"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircleIcon className="w-5 h-5 mr-2 !text-gray-200" /> Create
          Product
        </button>
      </div>

      {/* BODY PRODUCTS LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg-grid-cols-3 gap-10 justify-between">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          products?.map((product) => (
            <div
              key={product.productId}
              className="border shadow rounded-md p-4 max-w-full w-full mx-auto"
            >
              <div className="flex flex-col items-center">
                <Image
                  src={`https://s3-inventorymanagement.s3.us-east-2.amazonaws.com/product${Math.floor(Math.random() * 3) + 1
                    }.png`}
                  alt={product.name}
                  width={150}
                  height={150}
                  className="mb-3 rounded-2xl w-36 h-36"
                />
                <h3 className="text-lg text-gray-900 font-semibold">
                  {product.name}
                </h3>

                {/* Hierarchy display */}
                <div className="text-xs text-gray-400 text-center mb-2">
                  {product.model?.category?.brand?.name} → {product.model?.category?.name} → {product.model?.name}
                </div>

                <p className="text-gray-800">${product.price.toFixed(2)}</p>
                <div className="text-sm text-gray-600 mt-1">
                  Stock: {product.stockQuantity}
                </div>
                {product.rating && (
                  <div className="flex items-center mt-2">
                    <Rating rating={product.rating} />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.productId)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      <CreateProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateProduct}
        product={editingProduct}
      />
    </div>
  );
};

export default Products;
