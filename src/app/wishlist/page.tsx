'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WishlistButton from '@/components/WishlistButton';


interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    title: string;
    description: string | null;
    rental_price: number;
    image_url: string[];
    location: string;
    status: string;
    user: {
      name: string;
    };
  };
}

const WishlistSkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 bg-gray-300 rounded w-48 mb-2"></div>
        <div className="h-5 bg-gray-200 rounded w-64"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Image skeleton */}
            <div className="aspect-square bg-gray-200 relative">
              <div className="absolute top-4 right-4 w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="absolute top-4 left-4 w-16 h-6 bg-gray-300 rounded-full"></div>
            </div>

            {/* Content skeleton */}
            <div className="p-4">
              <div className="mb-2">
                <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-6 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-10 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/wishlist', {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch wishlist');
      }

      setWishlistItems(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleWishlistChange = (productId: string, isInWishlist: boolean) => {
    if (!isInWishlist) {
      setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WishlistSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Wishlist</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchWishlist}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="mt-2 text-gray-600">
            {wishlistItems.length > 0
              ? `${wishlistItems.length} item${wishlistItems.length === 1 ? '' : 's'} saved for later`
              : 'No items in your wishlist yet'}
          </p>
        </div>

        {!wishlistItems.length ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Your wishlist is empty</h3>
            <p className="mt-2 text-gray-600">Start browsing products to add them to your wishlist.</p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="relative">
                  <div className="aspect-square bg-gray-200 flex items-center justify-center">
                    {item.product.image_url?.[0] ? (
                      <Image
                        src={item.product.image_url[0]}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Image
                        src="/placeholder-product.jpg"
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="absolute top-4 right-4">
                    <WishlistButton
                      productId={item.product_id}
                      isInWishlist={true}
                      onWishlistChange={(isInWishlist) =>
                        handleWishlistChange(item.product_id, isInWishlist)
                      }
                    />
                  </div>
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        item.product.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : item.product.status === 'rented'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.product.status.charAt(0).toUpperCase() + item.product.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {item.product.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      by {item.product.user?.name || 'Unknown Owner'}
                    </p>
                  </div>

                  {item.product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-indigo-600">
                      ${item.product.rental_price}/day
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {item.product.location}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="flex-1 text-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/products/${item.product.id}?rent=true`}
                      className={`flex-1 text-center px-4 py-2 rounded-lg transition-colors ${
                        item.product.status === 'available'
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {item.product.status === 'available' ? 'Rent Now' : 'Unavailable'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
