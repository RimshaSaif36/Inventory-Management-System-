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
  series?: Series[];
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

export interface StockRequest {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  lowStockLevel: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  requestedBy?: User;
  approvedBy?: User;
  product?: Product;
  store?: Store;
}

export interface NewStockRequest {
  storeId?: string;
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
  totalCustomers?: number;
  pendingOrders?: number;
  unpaidInvoicesTotal?: number;
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

type CurrentUserLike = {
  id?: string;
  role?: string;
} | null;

const getCurrentUserFromPersistedStore = (): CurrentUserLike => {
  if (typeof window === "undefined") return null;

  try {
    const persistedRoot = localStorage.getItem("persist:root");
    if (!persistedRoot) return null;

    const parsedRoot = JSON.parse(persistedRoot) as { user?: string };
    if (!parsedRoot.user) return null;

    const parsedUserState = JSON.parse(parsedRoot.user) as {
      currentUser?: CurrentUserLike;
    };

    return parsedUserState.currentUser ?? null;
  } catch {
    return null;
  }
};

const getAuthUser = (state: unknown): CurrentUserLike => {
  const currentUserFromState = (state as { user?: { currentUser?: CurrentUserLike } })?.user?.currentUser;

  if (currentUserFromState?.id && currentUserFromState?.role) {
    return currentUserFromState;
  }

  return getCurrentUserFromPersistedStore();
};

const getAccessTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const session = parsed?.currentSession || parsed?.session || parsed;

      if (session?.access_token) return session.access_token as string;
    }
  } catch {
    return null;
  }

  return null;
};

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000",
    prepareHeaders: (headers, { getState }) => {
      const currentUser = getAuthUser(getState());
      const accessToken = getAccessTokenFromStorage();

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      if (currentUser?.id) {
        headers.set("user-id", currentUser.id);
      }

      if (currentUser?.role) {
        headers.set("user-role", currentUser.role);
      }

      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: ["DashboardMetrics", "Products", "Users", "Expenses", "Brands", "Categories", "Series", "Stock", "StockRequests"],
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, string | undefined>({
      query: (storeId) => ({
        url: "/dashboard",
        params: storeId ? { storeId } : undefined,
      }),
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
      invalidatesTags: ["Categories", "Brands"],
    }),
    updateCategory: build.mutation<Category, { id: string; data: Partial<NewCategory> }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories", "Brands"],
    }),
    deleteCategory: build.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories", "Brands"],
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
    getStockByStore: build.query<Stock[], { storeId?: string; search?: string } | undefined>({
      query: (params) => ({
        url: "/stock",
        params: params || undefined,
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
    getStockRequests: build.query<StockRequest[], { status?: string; storeId?: string } | void>({
      query: (params) => ({
        url: "/stock/requests",
        params: params || undefined,
      }),
      providesTags: ["StockRequests"],
    }),
    createStockRequest: build.mutation<StockRequest, NewStockRequest>({
      query: (newRequest) => ({
        url: "/stock/requests",
        method: "POST",
        body: newRequest,
      }),
      invalidatesTags: ["StockRequests"],
    }),
    approveStockRequest: build.mutation<StockRequest, { id: string }>({
      query: ({ id }) => ({
        url: `/stock/requests/${id}/approve`,
        method: "PUT",
      }),
      invalidatesTags: ["StockRequests", "Stock", "Products"],
    }),
    rejectStockRequest: build.mutation<StockRequest, { id: string }>({
      query: ({ id }) => ({
        url: `/stock/requests/${id}/reject`,
        method: "PUT",
      }),
      invalidatesTags: ["StockRequests"],
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
  useGetStockRequestsQuery,
  useCreateStockRequestMutation,
  useApproveStockRequestMutation,
  useRejectStockRequestMutation,
  // User hooks
  useGetUsersQuery,
  useCreateUserMutation,
  useGetExpensesByCategoryQuery,
} = api;
