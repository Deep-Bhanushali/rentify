'use client';

import { useState, useEffect } from 'react';
import { RentalRequest, ProductReturn } from '@/types/models';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function ReturnsPage() {
  const [activeRentals, setActiveRentals] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const fetchActiveRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to view your rentals');
      }

      const response = await fetch('/api/rental-requests/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to fetch active rentals');
      }
      const data = await response.json();
      setActiveRentals(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const initiateReturn = async (rentalId: string) => {
    // Instead of creating return immediately, just redirect to return detail page
    // The return detail page will handle creating the return record when user confirms
    window.location.href = `/returns/${rentalId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading active rentals...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* <Navigation /> */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Product Returns</h1>
          
          {activeRentals.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">No Active Rentals</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>You don't have any active rentals that can be returned.</p>
                </div>
                <div className="mt-5">
                  <Link
                    href="/products"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Browse Products
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {activeRentals.map((rental) => (
                  <li key={rental.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="flex-shrink-0">
                              {rental.product?.image_url && rental.product.image_url.length > 0 ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={rental.product.image_url[0]}
                                  alt=""
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-gray-600 text-xs">
                                    {rental.product?.title?.charAt(0) || ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 px-4">
                              <div>
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  {rental.product?.title}
                                </p>
                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                  <span className="truncate">
                                    {rental.pickup_location} → {rental.return_location}
                                  </span>
                                </p>
                              </div>
                              <div className="mt-2 flex">
                                <div className="flex items-center text-sm text-gray-500">
                                  <svg
                                    className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span>
                                    {new Date(rental.start_date).toLocaleDateString()} -{' '}
                                    {new Date(rental.end_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                              {rental.productReturn ? (
                                <Link
                                  href={`/returns/${rental.id}`}
                                  className="ml-4 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  View Return Status
                                </Link>
                              ) : (
                                <Link
                                  href={`/returns/${rental.id}`}
                                  className="ml-4 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Initiate Return
                                </Link>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
