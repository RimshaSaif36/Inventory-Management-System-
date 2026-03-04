import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  categories?: Category[];
}

export interface NewBrand {
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  brandId: string;
  createdAt?: string;
  updatedAt?: string;
  brand?: Brand;
  products?: Product[];
}

export interface NewCategory {
  name: string;
  description?: string;
  brandId: string;
}

export interface Series {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  createdAt?: string;
  updatedAt?: string;
  category?: Category;
  products?: Product[];
}

export interface NewSeries {
  name: string;
  description?: string;
  categoryId: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  brandId?: string;
  seriesId?: string;
  purchasePrice: number;
  sellingPrice: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  brand?: Brand;
  series?: Series;
  totalStock?: number;
  lowStockLevel?: number;
}

export interface NewProduct {
  sku?: string;
  name: string;
  brandId?: string;
  seriesId: string;
  purchasePrice: number;
  sellingPrice: number;
  imageUrl?: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  createdAt?: string;
}

export interface Stock {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  lowStockLevel: number;
  updatedAt?: string;
  product?: Product;
  store?: Store;
}

export interface NewStock {
  storeId: string;
  productId: string;
  quantity: number;
  lowStockLevel?: number;
}

export interface SalesSummary {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
}

export interface PurchaseSummary {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
}

export interface ExpenseSummary {
  expenseSummarId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategorySummaryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface NewUser {
  name: string;
  email: string;
  role: string;
  password: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses", "Brands", "Categories", "Series", "Stock"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    // Brand endpoints
    getBrands: build.query<Brand[], string | undefined>({
      query: (search) => ({
        url: "/brands",
        params: search ? { search } : undefined,
      }),
      providesTags: ["Brands"],
    }),
    getBrandById: build.query<Brand, string>({
      query: (id) => `/brands/${id}`,
      providesTags: ["Brands"],
    }),
    createBrand: build.mutation<Brand, NewBrand>({
      query: (newBrand) => ({
        url: "/brands",
        method: "POST",
        body: newBrand,
      }),
      invalidatesTags: ["Brands"],
    }),
    updateBrand: build.mutation<Brand, { id: string; data: Partial<NewBrand> }>({
      query: ({ id, data }) => ({
        url: `/brands/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Brands"],
    }),
    deleteBrand: build.mutation<void, string>({
      query: (id) => ({
        url: `/brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Brands"],
    }),
    // Category endpoints
    getCategories: build.query<PaginationResponse<Category>, { search?: string; brandId?: string; page?: number; pageSize?: number } | undefined>({
      query: (params) => ({
        url: "/categories",
        params: params || undefined,
      }),
      providesTags: ["Categories"],
    }),
    getCategoryById: build.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: ["Categories"],
    }),
    createCategory: build.mutation<Category, NewCategory>({
      query: (newCategory) => ({
        url: "/categories",
        method: "POST",
        body: newCategory,
      }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: build.mutation<Category, { id: string; data: Partial<NewCategory> }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),
    deleteCategory: build.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
    // Series endpoints
    getSeries: build.query<PaginationResponse<Series>, { search?: string; categoryId?: string; page?: number; pageSize?: number } | undefined>({
      query: (params) => ({
        url: "/series",
        params: params || undefined,
      }),
      providesTags: ["Series"],
    }),
    getSeriesById: build.query<Series, string>({
      query: (id) => `/series/${id}`,
      providesTags: ["Series"],
    }),
    createSeries: build.mutation<Series, NewSeries>({
      query: (newSeries) => ({
        url: "/series",
        method: "POST",
        body: newSeries,
      }),
      invalidatesTags: ["Series"],
    }),
    updateSeries: build.mutation<Series, { id: string; data: Partial<NewSeries> }>({
      query: ({ id, data }) => ({
        url: `/series/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Series"],
    }),
    deleteSeries: build.mutation<void, string>({
      query: (id) => ({
        url: `/series/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Series"],
    }),
    // Product endpoints
    getProducts: build.query<PaginationResponse<Product>, { search?: string; seriesId?: string; page?: number; pageSize?: number } | undefined>({
      query: (params) => ({
        url: "/products",
        params: params || undefined,
      }),
      providesTags: ["Products"],
    }),
    getProductById: build.query<Product, string>({
      query: (productId) => `/products/${productId}`,
      providesTags: ["Products"],
    }),
    createProduct: build.mutation<Product, NewProduct>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      invalidatesTags: ["Products"],
    }),
    updateProduct: build.mutation<Product, { productId: string; data: Partial<NewProduct> }>({
      query: ({ productId, data }) => ({
        url: `/products/${productId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Products"],
    }),
    deleteProduct: build.mutation<void, string>({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),
    // Stock endpoints
    getStockByStore: build.query<Stock[], { storeId: string; search?: string }>({
      query: (params) => ({
        url: "/stock",
        params,
      }),
      providesTags: ["Stock"],
    }),
    getStockById: build.query<Stock, string>({
      query: (id) => `/stock/${id}`,
      providesTags: ["Stock"],
    }),
    createStock: build.mutation<Stock, NewStock>({
      query: (newStock) => ({
        url: "/stock",
        method: "POST",
        body: newStock,
      }),
      invalidatesTags: ["Stock"],
    }),
    updateStock: build.mutation<Stock, { id: string; data: Partial<{ quantity: number; lowStockLevel: number }> }>({
      query: ({ id, data }) => ({
        url: `/stock/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Stock"],
    }),
    // Existing endpoints
    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    createUser: build.mutation<User, NewUser>({
      query: (newUser) => ({
        url: "/users",
        method: "POST",
        body: newUser,
      }),
      invalidatesTags: ["Users"],
    }),
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),
  }),
});

export const {
  useGetDashboardMetricsQuery,
  // Brand hooks
  useGetBrandsQuery,
  useGetBrandByIdQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  // Category hooks
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  // Series hooks
  useGetSeriesQuery,
  useGetSeriesByIdQuery,
  useCreateSeriesMutation,
  useUpdateSeriesMutation,
  useDeleteSeriesMutation,
  // Product hooks
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  // Stock hooks
  useGetStockByStoreQuery,
  useGetStockByIdQuery,
  useCreateStockMutation,
  useUpdateStockMutation,
  // User hooks
  useGetUsersQuery,
  useCreateUserMutation,
  useGetExpensesByCategoryQuery,
} = api;
