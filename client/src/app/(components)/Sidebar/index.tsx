"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import {
  Archive,
  CircleDollarSign,
  Clipboard,
  Layout,
  LucideIcon,
  Menu,
  SlidersHorizontal,
  User,
  Tag,
  FolderTree,
  Box,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  Package,
  BarChart3,
  Bell,
  FileCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href}>
      <div
        className={`cursor-pointer flex items-center ${isCollapsed ? "justify-center py-4" : "justify-start px-8 py-4"
          }
        hover:text-blue-500 hover:bg-blue-100 gap-3 transition-colors ${isActive ? "bg-blue-200 text-white" : ""
          }
      }`}
      >
        <Icon className="w-6 h-6 !text-gray-700" />

        <span
          className={`${isCollapsed ? "hidden" : "block"
            } font-medium text-gray-700`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const user = useAppSelector((state) => state.user.currentUser);
  const role = user?.role;

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const isSalesman = role === "SALESMAN";

  const sidebarClassNames = `fixed flex flex-col ${isSidebarCollapsed ? "w-0 md:w-16" : "w-72 md:w-64"
    } bg-white transition-all duration-300 overflow-hidden h-full shadow-md z-40`;

  return (
    <div className={sidebarClassNames}>
      {/* TOP LOGO */}
      <div
        className={`flex gap-3 justify-between md:justify-normal items-center pt-8 ${isSidebarCollapsed ? "px-5" : "px-8"
          }`}
      >
        <Image
          src="/logo.jpg"
          alt="khtab-engineering-logo"
          width={150}
          height={127}
          className="rounded "
        />
        <h1
          className={`${isSidebarCollapsed ? "hidden" : "block"
            } font-extrabold whitespace-nowrap`}
        >

        </h1>


        <button
          className="md:hidden px-3 py-3 bg-gray-100 rounded-full hover:bg-blue-100"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* LINKS */}
      <div className="flex-grow mt-8 overflow-y-auto">
        {/* Dashboard - Admin sees full admin dashboard */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/dashboard"
            icon={Layout}
            label="Dashboard"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Inventory & Products - Admin and Accountant */}
        {(isAdmin || isAccountant) && (
          <>
            <SidebarLink
              href="/inventory"
              icon={Archive}
              label="Inventory"
              isCollapsed={isSidebarCollapsed}
            />
            <SidebarLink
              href="/products"
              icon={Box}
              label="Products"
              isCollapsed={isSidebarCollapsed}
            />
            <SidebarLink
              href="/brands"
              icon={Tag}
              label="Brands"
              isCollapsed={isSidebarCollapsed}
            />
            <SidebarLink
              href="/categories"
              icon={FolderTree}
              label="Categories"
              isCollapsed={isSidebarCollapsed}
            />
            <SidebarLink
              href="/series"
              icon={Package}
              label="Series"
              isCollapsed={isSidebarCollapsed}
            />
          </>
        )}

        {/* Quotations - Accountant creates, Admin views */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/quotations"
            icon={FileCheck}
            label="Quotations"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* POS Sales - Accountant creates, Admin reviews */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/sales"
            icon={ShoppingCart}
            label="POS Sales"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Sales Orders - Accountant and Salesman create, Admin views */}
        {(isAdmin || isAccountant || isSalesman) && (
          <SidebarLink
            href="/sales-orders"
            icon={Clipboard}
            label="Sales Orders"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Suppliers & Purchases - Admin only */}
        {isAdmin && (
          <>
            <SidebarLink
              href="/suppliers"
              icon={Truck}
              label="Suppliers"
              isCollapsed={isSidebarCollapsed}
            />
            <SidebarLink
              href="/purchases"
              icon={Package}
              label="Purchases"
              isCollapsed={isSidebarCollapsed}
            />
          </>
        )}

        {/* Customers - Accountant manages */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/customers"
            icon={Users}
            label="Customers"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Employees - Admin only */}
        {isAdmin && (
          <SidebarLink
            href="/employees"
            icon={User}
            label="Employees"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Invoices - Admin & Accountant */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/invoices"
            icon={FileText}
            label="Invoices"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Reports - Admin & Accountant */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/reports"
            icon={BarChart3}
            label="Reports"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Expenses - Admin & Accountant */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/expenses"
            icon={CircleDollarSign}
            label="Expenses"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Notifications - Admin & Accountant */}
        {(isAdmin || isAccountant) && (
          <SidebarLink
            href="/notifications"
            icon={Bell}
            label="Notifications"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* User Management - Admin only */}
        {isAdmin && (
          <SidebarLink
            href="/users"
            icon={User}
            label="Users"
            isCollapsed={isSidebarCollapsed}
          />
        )}

        {/* Salesman - minimal menu */}
        {isSalesman && (
          <>
            <SidebarLink
              href="/dashboard"
              icon={Layout}
              label="My Dashboard"
              isCollapsed={isSidebarCollapsed}
            />
          </>
        )}

        {/* Settings - all roles */}
        <SidebarLink
          href="/settings"
          icon={SlidersHorizontal}
          label="Settings"
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* FOOTER */}
      <div className={`${isSidebarCollapsed ? "hidden" : "block"} mb-10`}>
        <p className="text-center text-xs text-gray-500">&copy; 2026 Khtab Engineering and Services</p>
      </div>
    </div>
  );
};

export default Sidebar;
