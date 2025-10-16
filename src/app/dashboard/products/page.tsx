'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MetricCard, ChartCard } from '@/components/DashboardCards';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  title: string;
  description?: string;
  category: string;
  rental_price: number;
  location: string;
  status: 'available' | 'rented' | 'unavailable';
  image_url?: string[];
  created_at: Date;
  rental_count?: number;
  total_revenue?: number;
}

interface ProductStats {
  totalProducts: number;
  availableProducts: number;
  rentedProducts: number;
  unavailableProducts: number;
  totalRevenue: number;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    availableProducts: 0,
    rentedProducts: 0,
    unavailableProducts: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/products?owner=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(data.data);
          calculateStats(data.data);
        } else {
          setError(data.message || 'Failed to fetch products');
        }
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (products: Product[]) => {
    const stats: ProductStats = {
      totalProducts: products.length,
      availableProducts: products.filter(p => p.status === 'available').length,
      rentedProducts: products.filter(p => p.status === 'rented').length,
      unavailableProducts: products.filter(p => p.status === 'unavailable').length,
      totalRevenue: products.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
    };
    setStats(stats);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setProducts(products.filter(product => product.id !== id));
        calculateStats(products.filter(product => product.id !== id));
      } else {
        setError('Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rented':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'unavailable':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else if (sortBy === 'rental_price') {
        return sortOrder === 'asc' 
          ? a.rental_price - b.rental_price
          : b.rental_price - a.rental_price;
      } else if (sortBy === 'created_at') {
        return sortOrder === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'rental_count') {
        return sortOrder === 'asc' 
          ? (a.rental_count || 0) - (b.rental_count || 0)
          : (b.rental_count || 0) - (a.rental_count || 0);
      }
      return 0;
    });

  // Get unique categories for filter
  const categories = [...new Set(products.map(product => product.category))];

  // Skeleton Loader Component
  const ProductsSkeleton = () => (
    <DashboardLayout>
      <div className="space-y-6 animate-pulse">
        {/* Page header skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-300 rounded w-32"></div>
            <div className="h-5 bg-gray-200 rounded w-48 mt-1"></div>
          </div>
          <div className="h-10 bg-gray-300 rounded w-32"></div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="h-8 bg-gray-300 rounded w-12 mt-1"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="h-9 bg-gray-300 rounded"></div>
            </div>
            <div className="h-9 bg-gray-300 rounded"></div>
            <div className="h-9 bg-gray-300 rounded"></div>
            <div className="h-9 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Products list skeleton */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="divide-y divide-gray-200">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16 bg-gray-300 rounded"></div>
                    <div className="ml-4 w-0 flex-1">
                      <div className="flex items-center">
                        <div className="h-5 bg-gray-300 rounded w-40"></div>
                        <div className="ml-2 h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="mt-1 h-4 bg-gray-200 rounded w-64"></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                      <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-20 mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  if (loading) {
    return <ProductsSkeleton />;
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={fetchProducts}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Retry</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your rental products
            </p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Package className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Available"
            value={stats.availableProducts}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Rented"
            value={stats.rentedProducts}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Unavailable"
            value={stats.unavailableProducts}
            icon={<XCircle className="h-6 w-6" />}
            color="red"
          />
          {/* <MetricCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            color="purple"
          /> */}
        </div>

        {/* Filters and search */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md h-9"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="rental_price-asc">Price (Low to High)</option>
                <option value="rental_price-desc">Price (High to Low)</option>
                <option value="rental_count-desc">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products list */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <li key={product.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16 relative">
                          {product.image_url && product.image_url.length > 0 && product.image_url[0] && product.image_url[0].trim() !== '' ? (
                            <Image
                              src={product.image_url[0]}
                              alt={product.title}
                              fill
                              className="rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-full w-full rounded-md bg-gray-200 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-blue-600 truncate">
                              <Link href={`/products/${product.id}`} className="hover:underline">
                                {product.title}
                              </Link>
                            </h3>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                              {getStatusIcon(product.status)}
                              <span className="ml-1 capitalize">{product.status}</span>
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span className="truncate">{product.category}</span>
                            <span className="mx-2">•</span>
                            <span className="truncate">${product.rental_price}/day</span>
                            <span className="mx-2">•</span>
                            <span className="truncate">{product.location}</span>
                          </div>
                          {product.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex space-x-2">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {product.rental_count !== undefined && product.total_revenue !== undefined && (
                          <div className="mt-2 text-sm text-gray-500">
                            <div>Rented: {product.rental_count} times</div>
                            <div>Revenue: ${product.total_revenue.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No products match your filters'
                    : 'Get started by adding a new product.'}
                </p>
                <div className="mt-6">
                  <Link
                    href="/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Link>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
