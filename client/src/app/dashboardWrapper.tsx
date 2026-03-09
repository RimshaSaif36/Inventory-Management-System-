"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "./redux";
import { getSession } from "@/lib/authService";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    // Suppress console errors (only once)
    if (typeof window === "undefined") return;

    const origConsoleError = console.error;
    console.error = (...args: any[]) => {
      try {
        const first = args[0];
        if (typeof first === "string" && first.includes("Accessing element.ref was removed in React 19")) {
          return;
        }
      } catch (e) {
        // ignore
      }
      origConsoleError.apply(console, args);
    };

    return () => {
      console.error = origConsoleError;
    };
  }, []);

  // Optimize dark mode application
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const method = isDarkMode ? "add" : "remove";
    root.classList[method]("dark");
    root.classList[method === "add" ? "remove" : "add"]("light");
  }, [isDarkMode]);

  return (
    <div
      className={`${isDarkMode ? "dark" : "light"
        } flex bg-gray-50 text-gray-900 w-full min-h-screen`}
    >
      <Sidebar />
      <main
        className={`flex flex-col w-full h-full py-7 px-9 bg-gray-50 ${isSidebarCollapsed ? "md:pl-24" : "md:pl-72"
          }`}
      >
        <Navbar />
        {children}
      </main>
    </div>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const currentUser = useAppSelector((state) => state.user?.currentUser);

  // Public routes that don't require authentication (memoized)
  const publicRoutes = ["/auth/login", "/auth/register", "/auth/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    // Skip auth check for public routes
    if (isPublicRoute) {
      setIsAuthenticated(true);
      return;
    }

    // Check authentication
    const checkAuth = async () => {
      try {
        // Prefer Redux user state if available (already hydrated from localStorage)
        if (currentUser) {
          setIsAuthenticated(true);
          return;
        }

        // Fallback to Supabase session check
        const session = await getSession();
        if (session) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace("/auth/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        router.replace("/auth/login");
      }
    };

    // Small delay to allow Redux PersistGate to hydrate from localStorage
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [pathname, isPublicRoute, currentUser, router]);

  // For public routes, render immediately without any loading state
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show full layout with sidebar and navbar
  if (isAuthenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Fallback: redirect to login
  return null;
};

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  return <DashboardWrapper>{children}</DashboardWrapper>;
};

export default AppWrapper;
