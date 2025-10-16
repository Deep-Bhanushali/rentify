"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Package, Calendar, DollarSign } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is logged in
  useEffect(() => {
    if (typeof window === "undefined") return; // Skip during SSR

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchPendingRequestsCount(token);
  }, [router]);

  // Fetch pending requests count
  const fetchPendingRequestsCount = async (token: string) => {
    try {
      const response = await fetch(
        "/api/rental-requests?status=pending&asOwner=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPendingRequestsCount(data.data.length);
        }
      }
    } catch (error) {
      console.error("Error fetching pending requests count:", error);
    }
  };

  // Navigation items
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Products", href: "/dashboard/products", icon: Package },
    {
      name: "Rental Requests",
      href: "/dashboard/requests",
      icon: Calendar,
      count: pendingRequestsCount,
    },
    { name: "Returns", href: "/dashboard/returns", icon: Package },
    { name: "Revenue", href: "/dashboard/revenue", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 md:pt-4 pt-2">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:top-16 md:bottom-0 md:left-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-indigo-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive
                          ? "text-blue-500"
                          : "text-gray-400 group-hover:text-gray-500"
                      }`}
                    />
                    <div className="flex w-full justify-between">
                      <div>{item.name}</div>
                      {item.count && item.count > 0 && (
                        <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-red-500 text-white">
                          {item.count}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Page content */}
        <main className="flex-1">
          <div className="md:py-6 py-2">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
