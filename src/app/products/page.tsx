"use client"

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import { Product } from '@/types/models';

// Loading Skeleton Component
function ProductSkeleton({ isListView = false }: { isListView?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse ${isListView ? 'flex flex-row' : ''}`}>
      <div className={`relative ${isListView ? 'w-1/3 h-48' : 'w-full h-56'} bg-gray-200`}>
        <div className="absolute top-4 right-4 w-20 h-6 bg-gray-300 rounded-full"></div>
      </div>
      <div className={`p-6 ${isListView ? 'w-2/3' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-300 rounded-xl w-24"></div>
        </div>
      </div>
    </div>
  );
}

// Component to handle the product listing with search params
function ProductListing() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [allProductsLoaded, setAllProductsLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const initialProductsPerPage = 12;
  const loadMoreCount = 8;

  // Build query parameters for API call
  const buildQueryParams = () => {
    const params: Record<string, string> = {};
    
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const location = searchParams.get('location');
    
    if (search) params.search = search;
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (location) params.location = location;
    
    return params;
  };

  // Reset products when filters change
  useEffect(() => {
    setProducts([]);
    setHasMore(true);
    setAllProductsLoaded(false);
  }, [searchParams.toString()]);

  // Load mounted state for cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load more products function for infinite scroll
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore || allProductsLoaded) return;

    setLoadingMore(true);

    try {
      const totalLoaded = products.length;
      const params = buildQueryParams();
      const queryString = new URLSearchParams({
        ...params,
        offset: totalLoaded.toString(),
        limit: loadMoreCount.toString()
      }).toString();

      // Get auth token and include in headers
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/products${queryString ? `?${queryString}` : ''}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch more products');
      }

      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.length === 0) {
          setHasMore(false);
          setAllProductsLoaded(true);
        } else {
          setProducts(prev => [...prev, ...data.data]);

          // If fewer products returned than requested, we've reached the end
          if (data.data.length < loadMoreCount) {
            setHasMore(false);
            setAllProductsLoaded(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading more products:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, products.length, buildQueryParams, loadMoreCount]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMoreProducts, hasMore, loadingMore]);

  // Initial load when filters change
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      setError(null);
      setAllProductsLoaded(false);

      try {
        const params = buildQueryParams();
        const queryString = new URLSearchParams({
          ...params,
          limit: initialProductsPerPage.toString()
        }).toString();

        // Get auth token and include in headers
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/products${queryString ? `?${queryString}` : ''}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();

        if (data.success) {
          setProducts(data.data);
          setHasMore(data.data.length === initialProductsPerPage);

          // If fewer products returned than requested, we've reached the end
          if (data.data.length < initialProductsPerPage) {
            setAllProductsLoaded(true);
            setHasMore(false);
          }
        } else {
          setError(data.message || 'Failed to fetch products');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, [searchParams.toString()]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Available Products</h1>

        {/* View Toggle Buttons */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 self-start md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Grid View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="List View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Filters */}
      <ProductFilters />


      
      {/* Loading State */}
      {loading && (
          <div className={`grid ${viewMode === 'grid' ? 'gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'gap-4 grid-cols-1'}`}>
          {Array.from({ length: 8 }, (_, i) => (
            <ProductSkeleton key={i} isListView={viewMode === 'list'} />
          ))}
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* No Products Found */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to find what you&apos;re looking for.</p>
        </div>
      )}
      
      {/* Product Grid/List */}
      {!loading && !error && products.length > 0 && (
        <>
          <div className={`grid ${viewMode === 'grid' ? 'gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'gap-4 grid-cols-1'}`}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isListView={viewMode === 'list'}
              />
            ))}
          </div>

          {/* Load More Trigger */}
          {hasMore && !loadingMore && (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-8"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading more products...</span>
            </div>
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading more products...</span>
            </div>
          )}

          {/* End of Results Message */}
          {!hasMore && products.length > 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                You&apos;ve seen all available products
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    }>
      <ProductListing />
    </Suspense>
  );
}
