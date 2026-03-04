/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  
  // Enable trailing slashes for better caching
  trailingSlash: false,
  
  images: {
    // Unoptimized only in dev, optimize in production
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3-inventorymanagement.s3.us-east-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
    // Optimize images with next/image
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
