'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { debounce } from 'lodash';

export default function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      updateFilters({ search: searchTerm });
    }, 500),
    []
  );

  // Update URL when search term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  // Update filters in URL
  const updateFilters = useCallback((newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or add new filter parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Navigate to updated URL
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Handle filter changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategory(value);
    updateFilters({ category: value });
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinPrice(value);
    updateFilters({ minPrice: value });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxPrice(value);
    updateFilters({ maxPrice: value });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    updateFilters({ location: value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    updateFilters({ sort: value });
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setSortBy('newest');
    router.push('/products');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800">Filter Products</h2>
        <div className="flex space-x-2">
          {/* View Toggle for mobile - show first */}
          {/* <div className="mr-2 md:hidden">
            {toggleViewMode && (
              <button
                onClick={toggleViewMode}
                className="flex items-center space-x-1 text-sm text-gray-600 bg-gray-100 rounded-lg px-2 py-1"
              >
                {viewMode === 'grid' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>List</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Grid</span>
                  </>
                )}
              </button>
            )}
          </div> */}

          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-blue-600 underline underline-offset-2"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Search Input */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search products..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Clothing">Clothing</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Tools">Tools</option>
            <option value="Sports">Sports</option>
            <option value="Books">Books</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Price Range Filters */}
        <div>
          <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">
            Min Price ($)
          </label>
          <input
            type="number"
            id="minPrice"
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={minPrice}
            onChange={handleMinPriceChange}
          />
        </div>

        <div>
          <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">
            Max Price ($)
          </label>
          <input
            type="number"
            id="maxPrice"
            placeholder="1000"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={maxPrice}
            onChange={handleMaxPriceChange}
          />
        </div>

        {/* Location Filter */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            placeholder="Enter location..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={location}
            onChange={handleLocationChange}
          />
        </div>

        {/* Sort Filter */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sort"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={sortBy}
            onChange={handleSortChange}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popularity">Most Popular</option>
          </select>
        </div>
      </div>
    </div>
  );
}
