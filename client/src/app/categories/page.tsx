"use client";

import { useGetCategoriesQuery, useDeleteCategoryMutation, useGetBrandsQuery } from "@/state/api";
import type { Brand, Category } from "@/state/api";
import { PlusCircleIcon, SearchIcon, EditIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Header from "@/app/(components)/Header";
import CreateCategoryModal from "./CreateCategoryModal";

const Categories = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [brandSearchTerm, setBrandSearchTerm] = useState("");
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [pageSize] = useState<number>(18);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const {
        data: brands,
        isLoading: isBrandsLoading,
        isError: isBrandsError,
    } = useGetBrandsQuery(undefined);

    useEffect(() => {
        if (selectedBrandId === null && brands?.length) {
            setSelectedBrandId(brands[0].id);
        }
    }, [selectedBrandId, brands]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, selectedBrandId]);

    const selectedBrand = useMemo(() => {
        if (!selectedBrandId || !brands) return null;
        return brands.find((brand) => brand.id === selectedBrandId) || null;
    }, [brands, selectedBrandId]);

    const filteredBrands = useMemo(() => {
        if (!brands) return [];
        const query = brandSearchTerm.trim().toLowerCase();
        if (!query) return brands;
        return brands.filter((brand) => {
            const nameMatch = brand.name.toLowerCase().includes(query);
            const descriptionMatch = brand.description?.toLowerCase().includes(query);
            return nameMatch || descriptionMatch;
        });
    }, [brands, brandSearchTerm]);

    const getSeriesCount = (brand: Brand) =>
        brand.categories?.reduce((sum, category) => sum + (category.series?.length ?? 0), 0) ?? 0;

    const selectedBrandStats = useMemo(() => {
        if (!selectedBrand) return null;
        return {
            categoriesCount: selectedBrand.categories?.length ?? 0,
            seriesCount: getSeriesCount(selectedBrand),
        };
    }, [selectedBrand]);

    const {
        data: categoriesResponse,
        isLoading: isCategoriesLoading,
        isError: isCategoriesError,
    } = useGetCategoriesQuery(
        {
            search: searchTerm,
            brandId: selectedBrandId || undefined,
            page,
            pageSize,
        },
        { skip: !selectedBrandId }
    );

    const categories = categoriesResponse?.data || [];
    const total = categoriesResponse?.total || 0;
    const totalPages = categoriesResponse?.totalPages || 1;
    const [deleteCategory] = useDeleteCategoryMutation();

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await deleteCategory(id).unwrap();
            } catch (error: any) {
                alert(error.data?.message || "Failed to delete category");
            }
        }
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const isLoading = isBrandsLoading || (selectedBrandId ? isCategoriesLoading : false);
    const isError = isBrandsError || isCategoriesError;

    if (isError) {
        return (
            <div className="text-center text-red-500 py-6">
                Failed to fetch categories
            </div>
        );
    }

    return (
        <div className="font-space-grotesk mx-auto pb-6 w-full">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <Header name="Categories" />
                    <p className="mt-1 text-sm text-slate-500">
                        Start with a brand, then manage its categories and series without repeated rows.
                    </p>
                </div>
                <button
                    className="flex items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    onClick={() => setIsModalOpen(true)}
                >
                    <PlusCircleIcon className="h-5 w-5" />
                    Create Category
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
                <aside className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-white via-sky-50 to-white p-5 shadow-sm">
                    <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-sky-200/60 blur-2xl" aria-hidden="true" />
                    <div className="relative space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                                Brand Directory
                            </span>
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                                {brands?.length ?? 0}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
                            <SearchIcon className="h-4 w-4 text-sky-500" />
                            <input
                                className="w-full bg-transparent outline-none placeholder:text-slate-400"
                                placeholder="Search brands..."
                                value={brandSearchTerm}
                                onChange={(e) => setBrandSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                            {isBrandsLoading && (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                            key={`brand-skeleton-${index}`}
                                            className="h-16 rounded-xl border border-sky-100 bg-white/70 animate-pulse"
                                        />
                                    ))}
                                </div>
                            )}
                            {!isBrandsLoading && filteredBrands.map((brand, index) => {
                                const isActive = selectedBrandId === brand.id;
                                const seriesCount = getSeriesCount(brand);
                                return (
                                    <button
                                        key={brand.id}
                                        type="button"
                                        onClick={() => setSelectedBrandId(brand.id)}
                                        className={`rise-in w-full text-left rounded-xl border px-4 py-3 transition ${isActive
                                            ? "border-sky-200 bg-white shadow-sm"
                                            : "border-transparent bg-white/70 hover:border-sky-100 hover:bg-white"
                                            }`}
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {brand.name}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {brand.description || "No description yet."}
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-slate-500 text-right">
                                                <div>{brand.categories?.length ?? 0} cat</div>
                                                <div>{seriesCount} series</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {!isBrandsLoading && filteredBrands.length === 0 && (
                                <div className="rounded-xl border border-dashed border-sky-200 bg-white p-4 text-center text-xs text-slate-500">
                                    No brands match this search.
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <section className="space-y-5">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="absolute -left-10 -top-12 h-28 w-28 rounded-full bg-sky-100/80 blur-2xl" aria-hidden="true" />
                        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                                    Selected Brand
                                </div>
                                <div className="mt-1 text-2xl font-semibold text-slate-900">
                                    {selectedBrand?.name || "Pick a brand"}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedBrand?.description || "Choose a brand to view its categories and series."}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                        Categories
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {selectedBrandStats?.categoriesCount ?? 0}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                        Series
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {selectedBrandStats?.seriesCount ?? 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                                <SearchIcon className="h-4 w-4 text-slate-400" />
                                <input
                                    className="w-full bg-transparent outline-none placeholder:text-slate-400"
                                    placeholder="Search categories in this brand..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={!selectedBrandId}
                                />
                            </div>
                            <div className="text-xs text-slate-500">
                                {selectedBrandId && !isCategoriesLoading
                                    ? `Showing ${categories.length} of ${total} categories`
                                    : ""}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {!selectedBrandId && (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                Add a brand to start listing categories.
                            </div>
                        )}
                        {selectedBrandId && isLoading && (
                            <>
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={`category-skeleton-${index}`}
                                        className="h-40 rounded-2xl border border-slate-100 bg-slate-50 animate-pulse"
                                    />
                                ))}
                            </>
                        )}
                        {selectedBrandId && !isLoading && categories.map((category, index) => {
                            const seriesPreview = category.series?.slice(0, 3) ?? [];
                            const remainingSeries = (category.series?.length ?? 0) - seriesPreview.length;
                            return (
                                <div
                                    key={category.id}
                                    className="rise-in group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-sky-50/50 p-4 shadow-sm transition hover:shadow-md"
                                    style={{ animationDelay: `${index * 40}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-base font-semibold text-slate-900">
                                                {category.name}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {category.description || "No description provided."}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                aria-label="Edit category"
                                            >
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="text-red-600 hover:text-red-900"
                                                aria-label="Delete category"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        <span className="rounded-full bg-sky-100/70 px-2.5 py-1 text-sky-800">
                                            {category.series?.length ?? 0} series
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                            {category.createdAt
                                                ? new Date(category.createdAt).toLocaleDateString()
                                                : "No date"}
                                        </span>
                                    </div>
                                    {seriesPreview.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {seriesPreview.map((series) => (
                                                <span
                                                    key={series.id}
                                                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
                                                >
                                                    {series.name}
                                                </span>
                                            ))}
                                            {remainingSeries > 0 && (
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                                                    +{remainingSeries} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {selectedBrandId && !isLoading && categories.length === 0 && (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                No categories found for this brand.
                            </div>
                        )}
                    </div>

                    {selectedBrandId && totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <div>
                                Page {page} of {totalPages} - {total} categories
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <CreateCategoryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                category={editingCategory}
            />
        </div>
    );
};

export default Categories;