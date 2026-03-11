"use client";

import { useCreateProductMutation, useGetProductsQuery, useGetSeriesQuery, useDeleteProductMutation, api } from "@/state/api";
import { PlusCircleIcon, SearchIcon, FilterIcon, EditIcon, TrashIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/app/redux";
import Header from "@/app/(components)/Header";
import Rating from "@/app/(components)/Rating";
import CreateProductModal from "./CreateProductModal";
import Image from "next/image";

type ProductFormData = {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  seriesId: string;
};

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (searchQuery && searchQuery !== searchTerm) {
      setSearchTerm(searchQuery);
      setPage(1);
    }
  }, [searchQuery, searchTerm]);

  const {
    data: productsResponse,
    isLoading,
    isError,
  } = useGetProductsQuery({ search: searchTerm, seriesId: selectedSeriesId, page, pageSize });

  // prefetch next page to make pagination feel instant
  useEffect(() => {
    if (page < (productsResponse?.totalPages || 0)) {
      dispatch(
        api.util.prefetch(
          "getProducts",
          { search: searchTerm, seriesId: selectedSeriesId, page: page + 1, pageSize },
          { force: true }
        )
      );
    }
  }, [page, searchTerm, selectedSeriesId, pageSize, productsResponse, dispatch]);

  const products = productsResponse?.data || [];
  const total = productsResponse?.total || 0;
  const totalPages = productsResponse?.totalPages || 1;

  const { data: seriesResponse } = useGetSeriesQuery(undefined);
  const series = seriesResponse?.data || [];
  const [createProduct] = useCreateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const handleCreateProduct = async (productData: ProductFormData) => {
    try {
      await createProduct(productData).unwrap();
      setIsModalOpen(false);
    } catch (error: any) {
      let errorMessage = "Failed to create product";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      console.error("Failed to create product:", error);
      alert(errorMessage);
    }
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
            value={selectedSeriesId}
            onChange={(e) => setSelectedSeriesId(e.target.value)}
          >
            <option value="">All Series</option>
            {series?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.category?.brand?.name} - {item.category?.name} - {item.name}
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
              key={product.id}
              className="border shadow rounded-md p-4 max-w-full w-full mx-auto"
            >
              <div className="flex flex-col items-center">
                <Image
                  src={product?.imageUrl ? (product.imageUrl as string) : "/logo.jpg"}
                  alt={product.name}
                  width={150}
                  height={150}
                  className="mb-3 rounded-2xl w-36 h-36"
                  unoptimized
                />
                <h3 className="text-lg text-gray-900 font-semibold">
                  {product.name}
                </h3>

                {/* Hierarchy display */}
                <div className="text-xs text-gray-400 text-center mb-2">
                  {product.series?.category?.brand?.name} → {product.series?.category?.name} → {product.series?.name}
                </div>

                <p className="text-gray-800">PKR {product.sellingPrice.toFixed(2)}</p>

                {/* Action buttons */}
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-indigo-600 hover:text-indigo-900 p-1"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
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
      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">Showing page {page} of {totalPages} — {total} items</div>
        <div className="space-x-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
        </div>
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
