'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductOwnerInfo from '@/components/ProductOwnerInfo';
import RentalRequestForm from '@/components/RentalRequestForm';
import SimilarProducts from '@/components/SimilarProducts';
import WishlistButton from '@/components/WishlistButton';
import { Product } from '@/types/models';

const ProductDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-50 ">
      <div className="container mx-auto px-4 py-8 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="mb-6">
          <div className="flex" aria-label="Breadcrumb">
            <div className="flex items-center space-x-2">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-pulse">
          {/* Image gallery skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-8">
              <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
              <div className="p-4">
                <div className="flex space-x-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product details skeleton */}
          <div className="lg:col-span-1 space-y-6 animate-pulse">
            {/* Main product card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>

              <div className="mt-4 mb-4">
                <div className="h-8 bg-gray-300 rounded w-32"></div>
              </div>

              <div className="mt-4 mb-4 flex items-center">
                <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>

              <div className="mt-4 mb-6">
                <div className="h-5 bg-gray-300 rounded w-16"></div>
              </div>

              <div className="space-y-2">
                <div className="h-6 bg-gray-300 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>

            {/* Rental request form skeleton */}
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-16 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-300 rounded w-28 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="h-12 bg-gray-300 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          {/* Owner info skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <div className="h-5 bg-gray-300 rounded w-20 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="mt-4">
                <div className="h-8 bg-gray-300 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Product details skeleton */}
          <div className="lg:col-span-2 animate-pulse">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Similar products skeleton */}
        <div className="mt-12 animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-40 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch product details');
        }

        const data = await response.json();

        if (data.success) {
          setProduct(data.data);

          // Fetch similar products (same category)
          if (data.data.category) {
            const similarResponse = await fetch(`/api/products?category=${encodeURIComponent(data.data.category)}`);
            if (similarResponse.ok) {
              const similarData = await similarResponse.json();
              if (similarData.success) {
                setSimilarProducts(similarData.data);
              }
            }
          }
        } else {
          setError(data.message || 'Failed to fetch product details');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Handle rental request success
  const handleRentalRequestSuccess = () => {
    // You could add additional logic here, like showing a notification
    console.log('Rental request submitted successfully');
  };

  // Loading state
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error || 'Product not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/products" className="text-gray-700 hover:text-blue-600">
                  Products
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 ml-1 md:ml-2">{product.title}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>


        {/* Top Section - Image and Product Details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Image */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ProductImageGallery
                title={product.title}
                images={product.image_url || []}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Product Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
                  {product.status === 'rented' && product.currentRental && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Rental period ends: </span>
                      <span className="text-gray-800">
                        {new Date(product.currentRental.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="ml-2 font-medium">• Available from: </span>
                      <span className="text-gray-800">
                        {new Date(new Date(product.currentRental.end_date).getTime() + (2 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  product.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : product.status === 'rented'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {product.status === 'available' ? 'Available' : product.status}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-bold text-blue-600">${product.rental_price.toFixed(2)}</span>
                <span className="text-gray-500">/day</span>
              </div>

              <div className="mt-4 flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {product.location}
              </div>

              <div className="mt-4">
                <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">
                  {product.description || 'No description available for this product.'}
                </p>
              </div>
            </div>

            {/* Rental Request Form - Always show, but backend will validate */}
            <RentalRequestForm
              product={product}
              onSuccess={handleRentalRequestSuccess}
            />
          </div>
        </div>

        {/* Product Owner Info */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {product.user && (
              <ProductOwnerInfo
                owner={product.user}
              />
            )}
          </div>

          <div className="lg:col-span-2">
            {/* Additional product details could go here */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-medium ${
                    product.status === 'available'
                      ? 'text-green-600'
                      : product.status === 'rented'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}>
                    {product.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{product.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{product.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Listed on</p>
                  <p className="font-medium text-gray-900">
                    {new Date(product.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <SimilarProducts
          products={similarProducts}
          currentProductId={product.id}
        />
      </div>
    </div>
  );
}
