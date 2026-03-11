import { useGetDashboardMetricsQuery } from "@/state/api";
import { ShoppingBag } from "lucide-react";
import React from "react";
import Rating from "../(components)/Rating";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/app/redux";

const CardPopularProducts = () => {
  const storeId = useAppSelector((state) => state.user.currentUser?.storeId);
  const { data: dashboardMetrics, isLoading } = useGetDashboardMetricsQuery(storeId || undefined);
  const router = useRouter();

  return (
    <div className="row-span-3 xl:row-span-6 bg-white shadow-md rounded-2xl pb-16">
      {isLoading ? (
        <div className="m-5">Loading...</div>
      ) : (
        <>
          <h3 className="text-lg font-semibold px-7 pt-5 pb-2">
            Popular Products
          </h3>
          <hr />
          <div className="overflow-auto h-full">
            {dashboardMetrics?.popularProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 px-5 py-7 border-b"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={
                      product?.imageUrl
                        ? (product.imageUrl as string)
                        : "/logo.jpg"
                    }
                    alt={product.name}
                    width={48}
                    height={48}
                    className="rounded-lg w-14 h-14"
                    onError={(event) => {
                      const target = event.currentTarget as HTMLImageElement;
                      if (!target.src.endsWith("/logo.jpg")) {
                        target.src = "/logo.jpg";
                      }
                    }}
                    unoptimized
                  />
                  <div className="flex flex-col justify-between gap-1">
                    <div className="font-bold text-gray-700">
                      {product.name}
                    </div>
                    {Number(product.sellingPrice) > 0 && (
                      <div className="flex text-sm items-center">
                        <span className="font-bold text-blue-500 text-xs">
                          PKR {Number(product.sellingPrice).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs flex items-center">
                  <button
                    className="p-2 rounded-full bg-blue-100 text-blue-600 mr-2"
                    onClick={() =>
                      router.push(`/products?search=${encodeURIComponent(product.name)}`)
                    }
                    aria-label={`View ${product.name}`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CardPopularProducts;
