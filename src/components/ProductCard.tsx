'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Product } from "@/types/models";
import { useRouter } from 'next/navigation';
import WishlistButton from './WishlistButton';

interface ProductCardProps {
  product: Product;
  isListView?: boolean;
}

export default function ProductCard({ product, isListView = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(!!product.isInWishlist);
  const router = useRouter();

  const getStatusColor = (status: string, isBlocked?: boolean) => {
    if (isBlocked) {
      return 'bg-orange-100 text-orange-700';
    }
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'rented':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string, isBlocked?: boolean) => {
    if (isBlocked) {
      return 'In Payment Process';
    }
    switch (status.toLowerCase()) {
      case 'available':
        return 'Available';
      case 'rented':
        return 'Rented';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getImageUrl = () => {
    if (product.image_url && !imageError) {
      return product.image_url[0];
    }
    return "";
  };

  const renderImageOrFallback = () => {
    const imageUrl = getImageUrl();

    if (imageUrl) {
      return (
        <Image
          src={imageUrl}
          alt={product.title}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback with gradient and icon
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-blue-500" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm font-medium text-blue-700">{product.category}</p>
        </div>
      </div>
    );
  };

  // For list view, use horizontal layout with better information display
  if (isListView) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col md:flex-row md:h-50">
        {/* Product Image */}
        <div className="w-full md:w-1/4 relative h-48 md:h-auto">
          {renderImageOrFallback()}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
            {getStatusText(product.status)}
          </div>
          {product.status === 'rented' && product.currentRental && (
            <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-lg">
              <div className="font-medium">Rented until:</div>
              <div>{formatDate(new Date(new Date(product.currentRental.end_date).getTime() + (2 * 24 * 60 * 60 * 1000)))}</div>
            </div>
          )}
          {false && ( // Disabled for now, will enable when backend supports payment blocking status
            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-lg">
              <div className="font-medium">⏳ Payment in progress</div>
              <div className="text-center">Someone is booking</div>
            </div>
          )}
        </div>
        </div>

        {/* Product Details */}
        <div className="w-full md:w-1/2 p-3 md:p-4 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <h3 className="text-base md:text-2xl font-bold text-gray-900 mb-1 md:mb-2 line-clamp-1">{product.title}</h3>
              <span className="inline-flex items-center bg-gray-100 text-gray-700 text-sm font-medium px-2 py-1 rounded-full self-start">
                {product.category}
              </span>
            </div>
            <p className="text-xs md:text-base text-gray-600 mb-2 line-clamp-2 md:line-clamp-3">
              {product.description || 'No description available'}
            </p>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{product.location}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                ${product.rental_price.toFixed(2)}/day
              </span>
              <WishlistButton productId={product.id} isInWishlist={isInWishlist} onWishlistChange={(isWished) => setIsInWishlist(isWished)} />
            </div>
            <Link
              href={`/products/${product.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:shadow-md"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Clean, professional grid view
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-gray-100">
      {/* Product Image */}
      <div className="relative h-48">
        {renderImageOrFallback()}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
            {product.status === 'available' ? 'Available' : product.status}
          </div>
          {product.status === 'rented' && product.currentRental && (
            <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-lg">
              <div className="font-medium">Rented until:</div>
              <div>{formatDate(new Date(new Date(product.currentRental.end_date).getTime() + (2 * 24 * 60 * 60 * 1000)))}</div>
            </div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex flex-col justify-between h-64">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{product.title}</h3>
          <span className="text-lg font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
            ${product.rental_price.toFixed(2)}/day
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description || 'No description available'}
        </p>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{product.location}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
            {product.category}
          </span>

          {/* Rating */}
          <div className="flex items-center text-yellow-500">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-medium text-gray-600 ml-1">4.8</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Link
            href={`/products/${product.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            View Details
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <div className="flex items-center gap-2">
            <WishlistButton productId={product.id} isInWishlist={isInWishlist} onWishlistChange={(isWished) => setIsInWishlist(isWished)} />
            {product.status === 'available' && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:shadow-md" onClick={()=> {router.push(`/products/${product.id}`)}}>
                Rent Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
