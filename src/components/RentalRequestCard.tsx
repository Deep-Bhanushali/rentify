'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RentalRequest, Product, User } from '@/types/models';

interface RentalRequestCardProps {
  rentalRequest: RentalRequest & {
    product: Product & { user: User };
    customer: User;
  };
  isOwner?: boolean;
  onUpdateStatus?: (id: string, status: 'accepted' | 'rejected') => void;
  viewMode?: 'card' | 'list';
}

export default function RentalRequestCard({
  rentalRequest,
  isOwner = false,
  onUpdateStatus,
  viewMode = 'card'
}: RentalRequestCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status update
  const handleStatusUpdate = async (status: 'accepted' | 'rejected') => {
    if (!onUpdateStatus) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/rental-requests/${rentalRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update rental request');
      }

      onUpdateStatus(rentalRequest.id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle request cancellation
  const handleCancellation = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/rental-requests/${rentalRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to cancel rental request');
      }

      // Update the rental request status locally
      rentalRequest.status = 'cancelled';

      // Force a re-render by triggering a state update
      setError('');
      setTimeout(() => setError(null), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className={
      viewMode === 'card'
        ? "bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
        : "bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200"
    }>
      <div className={viewMode === 'card' ? "p-6" : "p-4"}>
        {viewMode === 'card' ? (
          /* Card View Layout */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={rentalRequest.product.image_url[0] || '/placeholder-product.jpg'}
                    alt={rentalRequest.product.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <Link
                    href={`/products/${rentalRequest.product.id}`}
                    className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors"
                  >
                    {rentalRequest.product.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {rentalRequest.product.category}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(rentalRequest.status)}`}>
                {rentalRequest.status.charAt(0).toUpperCase() + rentalRequest.status.slice(1)}
              </span>
            </div>

            {/* User Info */}
            <div className="text-sm text-gray-600">
              {isOwner ? (
                <div>
                  <span className="font-medium text-gray-900">Customer:</span> {rentalRequest.customer.name}
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-gray-500">{rentalRequest.customer.email}</span>
                </div>
              ) : (
                <div>
                  <span className="font-medium text-gray-900">Owner:</span> {rentalRequest.product.user.name}
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-gray-500">{rentalRequest.product.user.email}</span>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Rental Period</p>
                    <p className="text-gray-600">{formatDate(rentalRequest.start_date)} - {formatDate(rentalRequest.end_date)}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Total Price</p>
                    <p className="text-gray-600 font-semibold text-lg">${rentalRequest.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Pickup Location</p>
                    <p className="text-gray-600">{rentalRequest.pickup_location}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Return Location</p>
                    <p className="text-gray-600">{rentalRequest.return_location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100">
              {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/rental-requests/${rentalRequest.id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </Link>
                {!isOwner && (
                  <>
                    {rentalRequest.status === 'pending' && (
                      <button
                        type="button"
                        onClick={handleCancellation}
                        disabled={isCancelling}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}
                    {rentalRequest.status === 'cancelled' && (
                      <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                        Request Cancelled
                      </span>
                    )}
                  </>
                )}
                {isOwner && rentalRequest.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('accepted')}
                      disabled={isUpdating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={isUpdating}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      {isUpdating ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View Layout - Improved Similar to ProductCard */
          <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col lg:flex-row">
            {/* Product Image */}
            <div className="w-full lg:w-1/3 relative h-48 lg:h-auto">
              <Image
                src={rentalRequest.product.image_url[0] || '/placeholder-product.jpg'}
                alt={rentalRequest.product.title}
                fill
                className="object-cover"
                onError={() => {
                  // Handle error if needed
                }}
              />
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rentalRequest.status)}`}>
                {rentalRequest.status.charAt(0).toUpperCase() + rentalRequest.status.slice(1)}
              </div>
            </div>

            {/* Request Details */}
            <div className="w-full lg:w-3/4 p-4 lg:p-6 flex flex-col justify-between flex-1">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 lg:mb-4">
                  <Link
                    href={`/products/${rentalRequest.product.id}`}
                    className="text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-0 hover:text-indigo-600 transition-colors line-clamp-1"
                  >
                    {rentalRequest.product.title}
                  </Link>
                  <span className="inline-flex items-center bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1 rounded-full self-start">
                    {rentalRequest.product.category}
                  </span>
                </div>

                <div className="mb-3 lg:mb-4">
                  {isOwner ? (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Customer:</span> {rentalRequest.customer.name} • {rentalRequest.customer.email}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Owner:</span> {rentalRequest.product.user.name} • {rentalRequest.product.user.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4">
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Rental Period</p>
                      <p className="text-gray-600 text-xs">{formatDate(rentalRequest.start_date)} - {formatDate(rentalRequest.end_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Pickup</p>
                      <p className="text-gray-600 text-xs truncate max-w-[120px]">{rentalRequest.pickup_location}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Return</p>
                      <p className="text-gray-600 text-xs truncate max-w-[120px]">{rentalRequest.return_location}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="flex items-center gap-4">
                  <span className="text-xl lg:text-2xl font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    ${rentalRequest.price.toFixed(2)}
                    <span className="text-sm font-medium text-gray-600 ml-1">total</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/rental-requests/${rentalRequest.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:shadow-md"
                  >
                    View Details
                  </Link>
                  {!isOwner && rentalRequest.status === 'pending' && (
                    <button
                      type="button"
                      onClick={handleCancellation}
                      disabled={isCancelling}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:shadow-md disabled:opacity-50"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  )}
                  {isOwner && rentalRequest.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate('accepted')}
                        disabled={isUpdating}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate('rejected')}
                        disabled={isUpdating}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
