"use client"

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MetricCard } from '@/components/DashboardCards';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  User,
  Package,
  DollarSign,
  MapPin,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface RentalRequest {
  id: string;
  product_id: string;
  customer_id: string;
  start_date: Date;
  end_date: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'paid' | 'approved';
  price: number;
  rental_period: number;
  pickup_location: string;
  return_location: string;
  created_at: Date;
  product?: {
    id: string;
    title: string;
    image_url?: string;
    rental_price: number;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface RequestStats {
  totalRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  completedRequests: number;
  totalRevenue: number;
}

export default function RentalRequestsManagement() {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [stats, setStats] = useState<RequestStats>({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    rejectedRequests: 0,
    completedRequests: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/rental-requests?asOwner=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formattedRequests = data.data.map((request: any) => ({
            ...request,
            start_date: new Date(request.start_date),
            end_date: new Date(request.end_date),
            created_at: new Date(request.created_at),
          }));
          setRequests(formattedRequests);
          calculateStats(formattedRequests);
        } else {
          setError(data.message || 'Failed to fetch rental requests');
        }
      } else {
        setError('Failed to fetch rental requests');
      }
    } catch (err) {
      console.error('Error fetching rental requests:', err);
      setError('Failed to fetch rental requests');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requests: RentalRequest[]) => {
    const stats: RequestStats = {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      acceptedRequests: requests.filter(r => r.status === 'accepted').length,
      rejectedRequests: requests.filter(r => r.status === 'rejected').length,
      completedRequests: requests.filter(r => r.status === 'completed').length,
      totalRevenue: requests
        .filter(r => r.status === 'completed' || r.status === 'accepted')
        .reduce((sum, r) => sum + r.price, 0),
    };
    setStats(stats);
  };

  const handleUpdateRequestStatus = async (id: string, status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => {
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setActionLoading(false);
        return;
      }

      const response = await fetch(`/api/rental-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedRequests = requests.map(request => 
          request.id === id ? { ...request, status } : request
        );
        setRequests(updatedRequests);
        calculateStats(updatedRequests);
      } else {
        setError('Failed to update request status');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      setError('Failed to update request status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: 'accept' | 'reject') => {
    if (selectedRequests.length === 0) return;
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setActionLoading(false);
        return;
      }

      const status = action === 'accept' ? 'accepted' : 'rejected';
      
      // Update each selected request
      const updatePromises = selectedRequests.map(id =>
        fetch(`/api/rental-requests/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        })
      );

      const responses = await Promise.all(updatePromises);
      
      if (responses.every(response => response.ok)) {
        const updatedRequests = requests.map(request =>
          selectedRequests.includes(request.id) ? { ...request, status: status as 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' } : request
        );
        setRequests(updatedRequests);
        calculateStats(updatedRequests);
        setSelectedRequests([]);
      } else {
        setError('Failed to update some requests');
      }
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError('Failed to perform bulk action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectRequest = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(requestId => requestId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  // const handleSelectAll = () => {
  //   if (selectedRequests.length === filteredRequests.length) {
  //     setSelectedRequests([]);
  //   } else {
  //     setSelectedRequests(filteredRequests.map(request => request.id));
  //   }
  // };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

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

  // Filter and sort requests
  const filteredRequests = requests
    .filter(request => {
      const matchesSearch = 
        request.product?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.customer?.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = new Date(request.created_at).toDateString() === today.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = new Date(request.created_at) >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = new Date(request.created_at) >= monthAgo;
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        return sortOrder === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'start_date') {
        return sortOrder === 'asc' 
          ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      } else if (sortBy === 'price') {
        return sortOrder === 'asc' 
          ? a.price - b.price
          : b.price - a.price;
      }
      return 0;
    });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header skeleton */}
          <div>
            <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-5 animate-pulse">
                <div className="flex items-center">
                  <div className="h-6 w-6 bg-gray-300 rounded"></div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters skeleton */}
          <div className="bg-white shadow rounded-lg p-4 animate-pulse">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-9 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>

          {/* Requests list skeleton */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md animate-pulse">
            <ul className="divide-y divide-gray-200">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-start">
                      <div className="flex items-center h-5 mt-1">
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-lg"></div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <div className="h-6 bg-gray-300 rounded w-48 mb-1"></div>
                                <div className="h-4 bg-gray-200 rounded-full w-16"></div>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="mx-2 h-4 bg-gray-100 rounded w-1"></div>
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="mx-2 h-4 bg-gray-100 rounded w-1"></div>
                                <div className="h-4 bg-gray-200 rounded w-12"></div>
                                <div className="mx-2 h-4 bg-gray-100 rounded w-1"></div>
                                <div className="h-4 bg-gray-200 rounded w-8"></div>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                                <div className="mx-2 h-4 bg-gray-100 rounded w-1"></div>
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex space-x-2 mb-2">
                              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DashboardLayout>
    );
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
                  onClick={fetchRequests}
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rental Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage rental requests for your products
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          <MetricCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Pending"
            value={stats.pendingRequests}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Accepted"
            value={stats.acceptedRequests}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Rejected"
            value={stats.rejectedRequests}
            icon={<XCircle className="h-6 w-6" />}
            color="red"
          />
          <MetricCard
            title="Completed"
            value={stats.completedRequests}
            icon={<CheckCircle className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
        </div>

        {/* Filters and search */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 sm:text-sm border border-gray-300 rounded-md h-9 "
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base shadow-sm border border-gray-300 focus:outline-none focus:ring-black focus:border-black focus:border-2 sm:text-sm rounded-md"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="start_date-desc">Start Date (Newest)</option>
                <option value="start_date-asc">Start Date (Oldest)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="price-asc">Price (Low to High)</option>
              </select>
            </div>
          </div>
          
          {/* Bulk actions */}
          {selectedRequests.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {selectedRequests.length} selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('accept')}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Accept Selected
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Requests list */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <li key={request.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-start">
                      <div className="flex items-center h-5 mt-1">
                        {request.status == 'pending' && <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={() => handleSelectRequest(request.id)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 relative">
                              {request.product?.image_url ? (
                                <Image
                                  src={request.product.image_url[0]}
                                  alt={request.product.title}
                                  fill
                                  className="rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-full w-full rounded-md bg-gray-200 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <h3 className="text-lg font-medium text-blue-600 truncate">
                                  <Link href={`/products/${request.product_id}`} className="hover:underline">
                                    {request.product?.title || 'Product'}
                                  </Link>
                                </h3>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                  {getStatusIcon(request.status)}
                                  <span className="ml-1 capitalize">{request.status}</span>
                                </span>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  <span>{request.customer?.name || 'Customer'}</span>
                                </div>
                                <span className="mx-2">•</span>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>
                                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                                  </span>
                                </div>
                                <span className="mx-2">•</span>
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  <span>${request.price}</span>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>Pickup: {request.pickup_location}</span>
                                </div>
                                <span className="mx-2">•</span>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>Return: {request.return_location}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex space-x-2">
                              <Link
                                href={`/rental-requests/${request.id}`}
                                className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              
                              {/* Show "Mark as Completed" for paid/active rentals */}
                              {(request.status === 'paid' || request.status === 'approved') && (
                                <button
                                  onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                                  disabled={actionLoading}
                                  className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Requested: {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rental requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'No requests match your filters'
                    : 'You have no rental requests yet.'}
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
