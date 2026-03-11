"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { clearUser } from "@/state/userSlice";
import { Bell, Menu, Settings, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/authService";
import { apiClient } from "@/lib/apiClient";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const notificationsEnabled = useAppSelector(
    (state) => state.global.notificationsEnabled
  );
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const canViewNotifications =
    (currentUser?.role === "ADMIN" || currentUser?.role === "ACCOUNTANT") &&
    notificationsEnabled;
  const storeId = currentUser?.storeId;
  const roleLabel = currentUser?.role
    ? `${currentUser.role[0]}${currentUser.role.slice(1).toLowerCase()}`
    : "User";

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!canViewNotifications) {
      setUnreadCount(0);
      return;
    }
    try {
      const params: Record<string, string> = { unreadOnly: "true", limit: "1" };
      if (storeId) params.storeId = storeId;
      const response = await apiClient.get("/notifications", { params });
      const count = response.data?.unreadCount;
      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    }
  }, [canViewNotifications, storeId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleOpenNotifications = () => {
    if (canViewNotifications) {
      router.push("/notifications");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      dispatch(clearUser());
      localStorage.removeItem("persist:root");
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex justify-between items-center w-full mb-7">
      {/* LEFT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <button
          className="px-3 py-3 bg-gray-100 rounded-full hover:bg-blue-100"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative">
          <input
            type="search"
            placeholder="Start type to search groups & products"
            className="pl-10 pr-4 py-2 w-50 md:w-60 border-2 border-gray-300 bg-white rounded-lg focus:outline-none focus:border-blue-500"
          />

          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-non">
            <Bell className="text-gray-500" size={20} />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <div className="hidden md:flex justify-between items-center gap-5">
          {canViewNotifications && (
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative"
              title="Notifications"
            >
              <Bell
                className={`cursor-pointer ${unreadCount > 0 ? "text-red-500" : "text-gray-500"}`}
                size={24}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-[0.4rem] py-1 text-xs font-semibold leading-none text-red-100 bg-red-400 rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <hr className="w-0 h-7 border border-solid border-l border-gray-300 mx-3" />
          <div className="flex items-center gap-3 cursor-pointer">
            <Image
              src="/log.png"
              alt="Profile"
              width={50}
              height={50}
              className="rounded-full h-full object-cover"
              unoptimized
            />
            <span className="font-semibold">{roleLabel}</span>
          </div>
          <hr className="w-0 h-7 border border-solid border-l border-gray-300 mx-3" />
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
            title="Logout"
          >
            <LogOut size={24} />
            {isLoggingOut ? "Logging out..." : ""}
          </button>
        </div>
        <Link href="/settings">
          <Settings className="cursor-pointer text-gray-500" size={24} />
        </Link>
      </div>
    </div>
  );
};

export default Navbar;
