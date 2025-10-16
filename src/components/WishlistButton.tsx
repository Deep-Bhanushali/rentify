'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

interface WishlistButtonProps {
  productId: string;
  isInWishlist?: boolean;
  onWishlistChange?: (isInWishlist: boolean) => void;
}

export default function WishlistButton({
  productId,
  isInWishlist = false,
  onWishlistChange
}: WishlistButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [wishlistState, setWishlistState] = useState(isInWishlist);

  const handleWishlistToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const method = wishlistState ? 'DELETE' : 'POST';
      const url = wishlistState
        ? `/api/wishlist?productId=${productId}`
        : '/api/wishlist';

      const body = wishlistState ? null : JSON.stringify({ product_id: productId });

      const token = localStorage.getItem('token');

      const response = await fetch(url, {
        method,
        headers: token ? {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        } : {
          'Content-Type': 'application/json'
        },
        body: body || undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 && result.message === 'Authentication required') {
          // User is not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }
        if (response.status === 400 && result.message === 'Product is already in your wishlist') {
          // Product is already in wishlist, update local state to reflect this
          setWishlistState(true);
          toast.success('Already in wishlist!');
          return;
        }
        throw new Error(result.message || 'Failed to update wishlist');
      }

      const newWishlistState = !wishlistState;
      setWishlistState(newWishlistState);
      onWishlistChange?.(newWishlistState);

      toast.success(
        newWishlistState
          ? 'Added to wishlist!'
          : 'Removed from wishlist'
      );
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWishlistToggle}
      disabled={isLoading}
      className="p-2 rounded-full transition-all duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      title={wishlistState ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg
        className={`w-6 h-6 transition-all duration-200 ${
          wishlistState
            ? 'text-red-500 scale-110'
            : 'text-gray-400 hover:text-gray-500 hover:scale-105'
        } ${isLoading ? 'animate-pulse' : ''}`}
        fill={wishlistState ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      </svg>
    </button>
  );
}
