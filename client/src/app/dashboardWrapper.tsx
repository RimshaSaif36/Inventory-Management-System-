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
    // Suppress React 19 deprecation console error coming from some libraries
    // that access `element.ref`. This is a temporary runtime filter to
    // avoid noisy errors during development. Long-term fix: align Next/React
    // versions and upgrade MUI to a React-19-compatible release.
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

    // Apply dark mode class
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("light");
    }

    return () => {
      console.error = origConsoleError;
    };
  }, [isDarkMode]);

  return (
    <div
      className={`${
        isDarkMode ? "dark" : "light"
      } flex bg-gray-50 text-gray-900 w-full min-h-screen`}
    >
      <Sidebar />
      <main
        className={`flex flex-col w-full h-full py-7 px-9 bg-gray-50 ${
          isSidebarCollapsed ? "md:pl-24" : "md:pl-72"
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

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/register", "/auth/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    (async () => {
      try {
        // Prefer Redux user state if available (it's hydrated from localStorage)
        if (currentUser) {
          setIsAuthenticated(true);
          return;
        }

        // Fallback to Supabase session check
        const session = await getSession();
        setIsAuthenticated(!!session);

        // If not authenticated and trying to access protected route
        if (!session && !isPublicRoute) {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        if (!isPublicRoute) {
          router.push("/auth/login");
        }
      }
    })();
  }, [pathname, router, isPublicRoute, currentUser]);

  // Show nothing while checking authentication
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

  // If public route (login, register, etc), show children without layout
  if (isPublicRoute) {
    return (
      <StoreProvider>
        {children}
      </StoreProvider>
    );
  }

  // If authenticated, show full layout with sidebar and navbar
  if (isAuthenticated) {
    return (
      <StoreProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </StoreProvider>
    );
  }

  // Fallback: redirect to login
  return null;
};

export default DashboardWrapper;
