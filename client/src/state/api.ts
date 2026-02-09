import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Brand {
  brandId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  Categories?: Category[];
}

export interface NewBrand {
  name: string;
  description?: string;
}

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
  brandId: string;
  createdAt: string;
  updatedAt: string;
  brand?: Brand;
  Models?: Model[];
}

export interface NewCategory {
  name: string;
  description?: string;
  brandId: string;
}

export interface Model {
  modelId: string;
  name: string;
  description?: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  Products?: Product[];
}

export interface NewModel {
  name: string;
  description?: string;
  categoryId: string;
}

export interface Product {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  model?: Model;
}

export interface NewProduct {
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
  modelId: string;
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
  userId: string;
  name: string;
  email: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses", "Brands", "Categories", "Models"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    // Brand endpoints
    getBrands: build.query<Brand[], string | void>({
      query: (search) => ({
        url: "/brands",
        params: search ? { search } : {},
      }),
      providesTags: ["Brands"],
    }),
    getBrandById: build.query<Brand, string>({
      query: (brandId) => `/brands/${brandId}`,
      providesTags: ["Brands"],
    }),
    createBrand: build.mutation<Brand, NewBrand>({
      query: (newBrand) => ({
        url: "/brands",
        method: "POST",
        body: { brandId: crypto.randomUUID(), ...newBrand },
      }),
      invalidatesTags: ["Brands"],
    }),
    updateBrand: build.mutation<Brand, { brandId: string; data: Partial<NewBrand> }>({
      query: ({ brandId, data }) => ({
        url: `/brands/${brandId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Brands"],
    }),
    deleteBrand: build.mutation<void, string>({
      query: (brandId) => ({
        url: `/brands/${brandId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Brands"],
    }),
    // Category endpoints
    getCategories: build.query<Category[], { search?: string; brandId?: string } | void>({
      query: (params) => ({
        url: "/categories",
        params,
      }),
      providesTags: ["Categories"],
    }),
    getCategoryById: build.query<Category, string>({
      query: (categoryId) => `/categories/${categoryId}`,
      providesTags: ["Categories"],
    }),
    createCategory: build.mutation<Category, NewCategory>({
      query: (newCategory) => ({
        url: "/categories",
        method: "POST",
        body: { categoryId: crypto.randomUUID(), ...newCategory },
      }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: build.mutation<Category, { categoryId: string; data: Partial<NewCategory> }>({
      query: ({ categoryId, data }) => ({
        url: `/categories/${categoryId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),
    deleteCategory: build.mutation<void, string>({
      query: (categoryId) => ({
        url: `/categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
    // Model endpoints
    getModels: build.query<Model[], { search?: string; categoryId?: string } | void>({
      query: (params) => ({
        url: "/models",
        params,
      }),
      providesTags: ["Models"],
    }),
    getModelById: build.query<Model, string>({
      query: (modelId) => `/models/${modelId}`,
      providesTags: ["Models"],
    }),
    createModel: build.mutation<Model, NewModel>({
      query: (newModel) => ({
        url: "/models",
        method: "POST",
        body: { modelId: crypto.randomUUID(), ...newModel },
      }),
      invalidatesTags: ["Models"],
    }),
    updateModel: build.mutation<Model, { modelId: string; data: Partial<NewModel> }>({
      query: ({ modelId, data }) => ({
        url: `/models/${modelId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Models"],
    }),
    deleteModel: build.mutation<void, string>({
      query: (modelId) => ({
        url: `/models/${modelId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Models"],
    }),
    // Product endpoints (updated)
    getProducts: build.query<Product[], { search?: string; modelId?: string } | void>({
      query: (params) => ({
        url: "/products",
        params,
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
        body: { productId: crypto.randomUUID(), ...newProduct },
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
    // Existing endpoints
    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
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
  // Model hooks
  useGetModelsQuery,
  useGetModelByIdQuery,
  useCreateModelMutation,
  useUpdateModelMutation,
  useDeleteModelMutation,
  // Product hooks
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  // Existing hooks
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
} = api;
