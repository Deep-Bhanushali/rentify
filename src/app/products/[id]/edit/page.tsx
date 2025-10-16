'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { Product } from '@/types/models';

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch product details for editing
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Product not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to edit this product');
          } else {
            throw new Error('Failed to fetch product details');
          }
        }

        const data = await response.json();

        if (data.success) {
          setProduct(data.data);
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

  const handleUpdateSuccess = () => {
    // Redirect to the product detail page after successful update
    router.push(`/dashboard/products`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
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
            <div className="mt-4">
              <Link
                href="/dashboard/products"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ← Back to Products
              </Link>
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
                <Link href="/dashboard/products" className="text-gray-700 hover:text-blue-600">
                  Products
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500 ml-1 md:ml-2">Edit: {product.title}</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <ProductForm
          product={product}
          isEditing={true}
          onSuccess={handleUpdateSuccess}
        />
      </div>
    </div>
  );
}
