'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '@/lib/AuthContext';
import { Heart } from 'lucide-react';

export default function Navigation() {
  const {
    user,
    isLoggedIn,
    logout,
    pendingRequestsCount,
    unreadNotificationsCount,
    updateUnreadNotificationsCount
  } = useAuth();
  const router = useRouter();

  // Handle mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        updateUnreadNotificationsCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle mark single notification as read
  const handleMarkNotificationRead = (notificationId: string) => {
    updateUnreadNotificationsCount(unreadNotificationsCount - 1);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors duration-300">
              Rentify
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:block">
            <div className="ml-10 flex items-center space-x-1 xl:ml-16">
              <Link
                href="/products"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus:text-blue-600 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse Products
              </Link>

          {isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus:text-blue-600 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Dashboard
              </Link>

              <Link
                href="/rental-requests"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center relative focus:text-blue-600 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                My Requests
                {pendingRequestsCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
              <Link
                href="/invoices"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:text-blue-600 focus:bg-blue-50"
              >
                Invoices
              </Link>
              <Link
                href="/returns"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:text-blue-600 focus:bg-blue-50"
              >
                Returns
              </Link>
            </>
          )}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-2 md:space-x-3 xl:ml-8">
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/wishlist')}
                  className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-0.5 focus:text-blue-600 focus:bg-blue-50"
                >
                  <span className="sr-only">View wishlist</span>
                  <Heart className="h-6 w-6" />
                </button>
                  <NotificationDropdown
                    unreadCount={unreadNotificationsCount}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                    onMarkRead={handleMarkNotificationRead}
                  />
                  <Link
                    href="/products/new"
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 focus:text-blue-600 focus:bg-blue-50"
                  >
                    Add Product
                  </Link>

                  {/* User Dropdown Menu */}
                  <div className="relative group">
                    <button className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300">
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                          <span className="text-blue-600 text-xs font-bold">
                            {user ? user.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <span className="mr-1">
                          {user ? user.name : 'User'}
                        </span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-200">
                      <div className="py-1">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </Link>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                        >
                          <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Auth & Menu */}
          <div className="md:hidden flex items-center space-x-2">
            {isLoggedIn && (
              <div className="mx-2">
                <NotificationDropdown
                  unreadCount={unreadNotificationsCount}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onMarkRead={handleMarkNotificationRead}
                />
              </div>
            )}
            <button
              onClick={() => {
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu) {
                  mobileMenu.classList.toggle('hidden');
                }
              }}
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2 transition-all duration-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden hidden" id="mobile-menu">
        <div className="px-4 pt-4 pb-3 space-y-2 bg-white border-t border-gray-100 shadow-lg">
          
          <Link
            href="/products"
            className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
          >
            Browse Products
          </Link>

          {isLoggedIn && (
            <>
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                Dashboard Overview
              </Link>
              <Link
                href="/dashboard/products"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                My Products
              </Link>
              <Link
                href="/dashboard/requests"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 flex items-center justify-between"
              >
                <span> My Rental Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/revenue"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                My Revenue
              </Link> 
              <Link
                href="/dashboard/returns"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                My Returns
              </Link> 
              <Link
                href="/rental-requests"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                Requests
              </Link>
              <Link
                href="/invoices"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                Invoices
              </Link>
              <Link
                href="/returns"
                className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300"
              >
                Returns
              </Link>
            </>
          )}

          {isLoggedIn ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shadow-md">
                    <span className="text-blue-600 font-bold text-lg">
                      {user ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <Link href='/profile' className="text-base font-semibold text-gray-900">
                    {user ? user.name : 'User'}
                  </Link>
                  <div className="text-sm text-gray-500">Welcome back!</div>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/products/new"
                  className="block px-4 py-3 text-left text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
                >
                  Add Product
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex flex-col space-y-3 px-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 text-center"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white px-4 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 hover:shadow-md transition-all duration-300 text-center"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
