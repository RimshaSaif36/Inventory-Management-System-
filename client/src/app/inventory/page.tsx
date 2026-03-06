"use client";

import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useGetStockByStoreQuery,
  useCreateStockMutation,
  useUpdateStockMutation
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useAppSelector } from "@/app/redux";
import { useEffect, useState } from "react";

const Inventory = () => {
  const { data: productsData, isError, isLoading, refetch } = useGetProductsQuery(undefined);
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [products, setProducts] = useState<any[]>([]);

  // Stock Management States
  const user = useAppSelector((state) => state.user.currentUser);
  const storeId = user?.storeId || "";
  const { data: stocksData, refetch: refetchStocks } = useGetStockByStoreQuery(
    { storeId, search: "" },
    { skip: !storeId }
  );
  const [createStock] = useCreateStockMutation();
  const [updateStock] = useUpdateStockMutation();
  const [stocks, setStocks] = useState<any[]>([]);
  const [showStockForm, setShowStockForm] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockFormData, setStockFormData] = useState({
    productId: "",
    quantity: 0,
    lowStockLevel: 5,
  });
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Inventory Page States
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "stocks">("overview");

  // Inventory columns
  const inventoryColumns: GridColDef<any>[] = [
    {
      field: "imageUrl",
      headerName: "Image",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
            {params.row.imageUrl ? (
              <img src={params.row.imageUrl} alt={params.row.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">📦</span>
            )}
          </div>
        </div>
      ),
    },
    {
      field: "name",
      headerName: "Item Name",
      width: 200,
      renderCell: (params) => (
        <div className="font-semibold text-gray-900 truncate">{params.row.name}</div>
      ),
    },
    {
      field: "sku",
      headerName: "SKU",
      width: 120,
      renderCell: (params) => (
        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{params.row.sku || "N/A"}</div>
      ),
    },
    {
      field: "brandName",
      headerName: "Category",
      width: 130,
      valueGetter: (params: any) => params?.row?.brand?.name || "-",
      renderCell: (params) => (
        <div className="text-sm font-medium text-gray-700">{params.value}</div>
      ),
    },
    {
      field: "totalStock",
      headerName: "Quantity",
      width: 120,
      align: "center",
      renderCell: (params) => {
        const qty = params.row.totalStock || 0;
        const lowLevel = params.row.lowStockLevel || 5;

        if (qty === 0) {
          return <span className="font-bold text-red-600 text-base">{qty}</span>;
        } else if (qty < lowLevel) {
          return <span className="font-bold text-amber-600 text-base">{qty}</span>;
        }
        return <span className="font-bold text-emerald-600 text-base">{qty}</span>;
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      align: "center",
      renderCell: (params) => {
        const qty = params.row.totalStock || 0;
        const lowLevel = params.row.lowStockLevel || 5;

        if (qty === 0) {
          return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Out of Stock</span>;
        } else if (qty < lowLevel) {
          return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Low Stock</span>;
        }
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">In Stock</span>;
      },
    },
    {
      field: "updatedAt",
      headerName: "Last Updated",
      width: 140,
      renderCell: (params) => {
        const date = params.row.updatedAt ? new Date(params.row.updatedAt) : new Date();
        return (
          <div className="text-xs text-gray-600">
            {date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            })}
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      sortable: false,
      align: "center",
      renderCell: (params) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => {
              setEditingProduct({ ...params.row, editQuantity: params.row.totalStock });
              setShowEditModal(true);
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-semibold transition"
            title="Edit"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setSelectedProduct(params.row);
              setShowDetailsModal(true);
            }}
            className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-semibold transition"
            title="View"
          >
            View
          </button>
          <button
            onClick={() => {
              setDeleteTarget(params.row.id);
              setShowDeleteModal(true);
            }}
            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold transition"
            title="Delete"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Stock Columns
  const stockColumns: GridColDef<any>[] = [
    {
      field: "productName",
      headerName: "Product Name",
      flex: 1,
      minWidth: 220,
      valueGetter: (params: any) => params?.row?.product?.name || "-",
      renderCell: (params) => (
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-gray-900">{params.value}</div>
          <div className="text-xs text-gray-500">SKU: {params.row.product?.sku || "N/A"}</div>
        </div>
      ),
    },
    {
      field: "brandName",
      headerName: "Category",
      width: 140,
      valueGetter: (params: any) => params?.row?.product?.brand?.name || "-",
      renderCell: (params) => (
        <div className="text-sm font-medium text-gray-700">{params.value}</div>
      ),
    },
    {
      field: "quantity",
      headerName: "Quantity",
      width: 140,
      type: "number",
      align: "center",
      renderCell: (params) => (
        <div className="font-bold text-lg text-emerald-600">{params.row.quantity}</div>
      ),
    },
    {
      field: "reservedQty",
      headerName: "Reserved",
      width: 110,
      type: "number",
      align: "center",
      renderCell: (params) => (
        <div className="text-sm font-semibold text-gray-700">{params.row.reservedQty}</div>
      ),
    },
    {
      field: "lowStockLevel",
      headerName: "Low Level",
      width: 120,
      type: "number",
      align: "center",
      renderCell: (params) => (
        <div className="text-sm font-medium text-gray-700">{params.row.lowStockLevel}</div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      align: "center",
      renderCell: (params) => {
        if (params.row.quantity <= 0) {
          return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Out of Stock</span>;
        } else if (params.row.quantity < params.row.lowStockLevel) {
          return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Low Stock</span>;
        }
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Good</span>;
      },
    },
    {
      field: "stockActions",
      headerName: "Action",
      width: 100,
      sortable: false,
      align: "center",
      renderCell: (params) => (
        <button
          onClick={() => handleEditStockClick(params.row)}
          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition font-bold text-lg"
          title="Edit"
        >
          ✏️
        </button>
      ),
    },
  ];

  // Calculate inventory statistics
  useEffect(() => {
    if (productsData?.data) {
      setProducts(productsData.data);

      const lowStock = productsData.data.filter((p: any) =>
        p.totalStock > 0 && p.totalStock < (p.lowStockLevel || 5)
      ).length;

      const outOfStock = productsData.data.filter((p: any) =>
        p.totalStock === 0
      ).length;

      setStats({
        totalItems: productsData.data.length,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
      });
    }
  }, [productsData]);

  // Load stocks
  useEffect(() => {
    if (stocksData) {
      setStocks(stocksData);
    }
  }, [stocksData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof refetch === "function") refetch();
      // Only attempt to refetch stocks when a storeId is available
      if (storeId && typeof refetchStocks === "function") refetchStocks();
    }, 10000);

    return () => clearInterval(interval);
  }, [refetch, refetchStocks, storeId]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockFormData.productId || stockFormData.quantity < 0) {
      alert("Please select a product and enter a valid quantity");
      return;
    }

    try {
      if (editingStockId) {
        await updateStock({
          id: editingStockId,
          data: {
            quantity: stockFormData.quantity,
            lowStockLevel: stockFormData.lowStockLevel,
          },
        }).unwrap();
        alert("Stock updated successfully!");
        setEditingStockId(null);
      } else {
        await createStock({
          productId: stockFormData.productId,
          quantity: stockFormData.quantity,
          lowStockLevel: stockFormData.lowStockLevel,
        }).unwrap();
        alert("Stock added successfully!");
      }

      setStockFormData({ productId: "", quantity: 0, lowStockLevel: 5 });
      setShowStockForm(false);
      refetchStocks();
    } catch (error: any) {
      alert(error?.data?.message || "Error saving stock");
    }
  };

  const handleEditStockClick = (stock: any) => {
    setStockFormData({
      productId: stock.productId,
      quantity: stock.quantity,
      lowStockLevel: stock.lowStockLevel,
    });
    setEditingStockId(stock.id);
    setShowStockForm(true);
  };

  const handleCancelStockForm = () => {
    setShowStockForm(false);
    setEditingStockId(null);
    setStockFormData({ productId: "", quantity: 0, lowStockLevel: 5 });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget).unwrap();
      alert("Product deleted successfully!");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      refetch();
    } catch (error: any) {
      alert(error?.data?.message || "Error deleting product");
    }
  };

  const availableProducts = productsData?.data?.filter((product: any) => {
    if (editingStockId) return true;
    return !stocks.some((s) => s.productId === product.id);
  }) || [];

  const filteredStocks = showLowStockOnly
    ? stocks.filter((s) => s.quantity < s.lowStockLevel)
    : stocks;

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-teal-600"></div>
        <p className="mt-2 text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  if (isError || !productsData) {
    return (
      <div className="text-center text-red-500 py-8">
        <p className="text-lg font-semibold">Failed to fetch data</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header name="Inventory" />

      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 pt-6 border-b-2 border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-4 font-bold text-lg border-b-4 transition-all duration-300 ${activeTab === "overview"
            ? "text-emerald-600 border-emerald-600"
            : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
        >
          📦 Inventory Overview
        </button>
        <button
          onClick={() => setActiveTab("stocks")}
          className={`px-4 py-4 font-bold text-lg border-b-4 transition-all duration-300 ${activeTab === "stocks"
            ? "text-emerald-600 border-emerald-600"
            : "text-gray-600 border-transparent hover:text-gray-900"
            }`}
        >
          📊 Stock Management
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Total Items Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-emerald-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Total Items</h3>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-gray-900">{stats.totalItems}</p>
                <p className="text-xs text-gray-500 mt-2">Total items in stock</p>
              </div>
            </div>

            {/* Low Stock Items Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-amber-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Low Stock Items</h3>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-amber-600">{stats.lowStockItems}</p>
                <p className="text-xs text-gray-500 mt-2">Number running below threshold</p>
              </div>
            </div>

            {/* Out of Stock Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Out of Stock Items</h3>
                <div className="p-3 bg-red-100 rounded-lg">
                  <span className="text-2xl">❌</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-red-600">{stats.outOfStockItems}</p>
                <p className="text-xs text-gray-500 mt-2">Items with zero quantity</p>
              </div>
            </div>
          </div>

          {/* Inventory Table Section */}
          <div className="px-8 py-8 flex-1 flex flex-col bg-white">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Inventory Overview</h2>
              <p className="text-sm text-gray-500 mt-1">Manage all products and track inventory levels</p>
            </div>

            {/* Search and Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by item name or SKU..."
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm hover:border-gray-400 transition"
                />
              </div>
              <button className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition flex items-center gap-2 whitespace-nowrap">
                🔽 Filter
              </button>
              <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition flex items-center gap-2 whitespace-nowrap shadow-md">
                ➕ Add Item
              </button>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
              <DataGrid
                rows={products}
                columns={inventoryColumns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                className="bg-white"
                sx={{
                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "#f0f9ff",
                    borderBottom: "2px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.825rem",
                    letterSpacing: "0.05em",
                    color: "#1e293b",
                    textTransform: "uppercase",
                    padding: "12px 8px",
                  },
                  "& .MuiDataGrid-row": {
                    borderBottom: "1px solid #e2e8f0",
                    "&:hover": {
                      backgroundColor: "#f0fdf4",
                      cursor: "pointer",
                    },
                    "&:last-child": {
                      borderBottom: "none",
                    },
                  },
                  "& .MuiDataGrid-cell": {
                    borderColor: "transparent",
                    padding: "12px 8px",
                    fontSize: "0.875rem",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "2px solid #cbd5e1",
                    backgroundColor: "#f0f9ff",
                    fontWeight: 600,
                  },
                  "& .MuiTablePagination-root": {
                    color: "#475569",
                  },
                }}
              />
            </div>
          </div>

          <div className="px-8 pb-6 text-xs text-gray-500 font-semibold">
            Last synced: {new Date().toLocaleTimeString()}
          </div>
        </>
      )}

      {/* Stock Management Tab */}
      {activeTab === "stocks" && (
        <div className="p-6 flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          {/* Stock Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Total in Stock</h3>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-gray-900">{stocks.length}</p>
                <p className="text-xs text-gray-500 mt-2">Products allocated</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-amber-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Low Stock</h3>
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-amber-600">
                  {stocks.filter((s) => s.quantity < s.lowStockLevel).length}
                </p>
                <p className="text-xs text-gray-500 mt-2">Below threshold</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 text-sm font-bold uppercase tracking-widest">Total Quantity</h3>
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-green-600">
                  {stocks.reduce((sum, s) => sum + s.quantity, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Units available</p>
              </div>
            </div>
          </div>

          {/* Stock Controls */}
          <div className="mb-6 bg-white p-5 rounded-2xl shadow-md border-t-4 border-blue-500">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Search Products</label>
                <input
                  type="text"
                  placeholder="Search by product name..."
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-6 py-3 rounded-xl font-bold transition whitespace-nowrap ${showLowStockOnly
                  ? "bg-ambber-600 text-white hover:bg-amber-700 shadow-md"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
              >
                {showLowStockOnly ? "✓ Low Stock Only" : "All Items"}
              </button>
              <button
                onClick={() => setShowStockForm(!showStockForm)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg font-bold transition whitespace-nowrap"
              >
                {showStockForm ? "✕ Cancel" : "+ Add Stock"}
              </button>
            </div>
          </div>

          {/* Add/Edit Stock Form */}
          {showStockForm && (
            <div className="mb-6 bg-white p-6 rounded-2xl shadow-md border-2 border-blue-500">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">📝</span>
                {editingStockId ? "Edit Stock Allocation" : "Add New Stock"}
              </h2>
              <form onSubmit={handleAddStock} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Product *</label>
                    <select
                      value={stockFormData.productId}
                      onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value })}
                      disabled={!!editingStockId}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                    >
                      <option value="">Select a product</option>
                      {availableProducts.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ""} {product.brand?.name && `- ${product.brand.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      value={stockFormData.quantity}
                      onChange={(e) => setStockFormData({ ...stockFormData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Low Stock Level</label>
                    <input
                      type="number"
                      min="0"
                      value={stockFormData.lowStockLevel}
                      onChange={(e) => setStockFormData({ ...stockFormData, lowStockLevel: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition"
                  >
                    {editingStockId ? "Update Stock" : "Add Stock"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelStockForm}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-900 rounded-xl hover:bg-gray-400 font-bold transition"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stock Table */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
              <DataGrid
                rows={filteredStocks}
                columns={stockColumns}
                getRowId={(row) => row.id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                className="bg-white"
                sx={{
                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "#f0f9ff",
                    borderBottom: "2px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.825rem",
                    letterSpacing: "0.05em",
                    color: "#1e293b",
                    textTransform: "uppercase",
                    padding: "12px 8px",
                  },
                  "& .MuiDataGrid-row": {
                    borderBottom: "1px solid #e2e8f0",
                    "&:hover": {
                      backgroundColor: "#f0fdf4",
                      cursor: "pointer",
                    },
                    "&:last-child": {
                      borderBottom: "none",
                    },
                  },
                  "& .MuiDataGrid-cell": {
                    borderColor: "transparent",
                    padding: "12px 8px",
                    fontSize: "0.875rem",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "2px solid #cbd5e1",
                    backgroundColor: "#f0f9ff",
                    fontWeight: 600,
                  },
                  "& .MuiTablePagination-root": {
                    color: "#475569",
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedProduct.imageUrl && (
                <div className="w-full h-40 bg-gray-200 rounded overflow-hidden">
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Product Name</p>
                <p className="text-lg font-semibold text-gray-900">{selectedProduct.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Brand</p>
                  <p className="font-medium text-gray-900">{selectedProduct.brand?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Series</p>
                  <p className="font-medium text-gray-900">{selectedProduct.series?.name || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Purchase Price</p>
                  <p className="font-medium text-gray-900">${selectedProduct.purchasePrice?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Selling Price</p>
                  <p className="font-medium text-gray-900">${selectedProduct.sellingPrice?.toFixed(2) || "0.00"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedProduct.totalStock || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock Level</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedProduct.lowStockLevel || 5}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full mt-6 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Edit Product</h3>
                <p className="text-sm text-gray-500 mt-1">Update product details and inventory settings</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateProduct({
                  productId: editingProduct.id,
                  data: {
                    name: editingProduct.name,
                    sku: editingProduct.sku,
                    brandId: editingProduct.brandId,
                    seriesId: editingProduct.seriesId,
                    purchasePrice: editingProduct.purchasePrice,
                    sellingPrice: editingProduct.sellingPrice,
                    totalStock: editingProduct.editQuantity !== undefined ? editingProduct.editQuantity : editingProduct.totalStock,
                  }
                }).unwrap();
                alert("Product updated successfully!");
                setShowEditModal(false);
                setEditingProduct(null);
                refetch();
              } catch (error: any) {
                alert(error?.data?.message || "Error updating product");
              }
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.editQuantity !== undefined ? editingProduct.editQuantity : editingProduct.totalStock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, editQuantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-semibold text-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Low Stock Level</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.lowStockLevel || 5}
                    onChange={(e) => setEditingProduct({ ...editingProduct, lowStockLevel: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.purchasePrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                  <select
                    value={editingProduct.brandId || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brandId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="">Select Brand</option>
                    {productsData?.data?.map((p: any) => p.brand?.id).filter((id: any, idx: any, arr: any) => id && arr.indexOf(id) === idx).map((brandId: any) => {
                      const brand = productsData?.data?.find((p: any) => p.brand?.id === brandId)?.brand;
                      return <option key={brandId} value={brandId}>{brand?.name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Series/Model</label>
                  <select
                    value={editingProduct.seriesId || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, seriesId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="">Select Series</option>
                    {productsData?.data?.map((p: any) => p.series?.id).filter((id: any, idx: any, arr: any) => id && arr.indexOf(id) === idx).map((seriesId: any) => {
                      const series = productsData?.data?.find((p: any) => p.series?.id === seriesId)?.series;
                      return <option key={seriesId} value={seriesId}>{series?.name}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
