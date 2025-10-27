"use client"

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  MetricCard, 
  RecentActivityCard, 
  CalendarCard, 
  QuickActionsCard 
} from '@/components/DashboardCards';
import {
  Package,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalProducts: number;
  availableProducts: number;
  rentedProducts: number;
  pendingRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalRequests: number;
}

interface DownloadStats {
  totalInvoices: number;
  downloadedInvoices: number;
  pdfDownloads: number;
  excelDownloads: number;
  csvDownloads: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'pending' | 'completed' | 'rejected' | 'accepted';
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'pickup' | 'return' | 'maintenance';
}

interface UpcomingEvent {
  id: string;
  title: string;
  product: string;
  date: string;
  type: 'pickup' | 'return';
  customer: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    availableProducts: 0,
    rentedProducts: 0,
    pendingRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalRequests: 0,
  });
  const [downloadStats, setDownloadStats] = useState<DownloadStats>({
    totalInvoices: 0,
    downloadedInvoices: 0,
    pdfDownloads: 0,
    excelDownloads: 0,
    csvDownloads: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentCalendarDate]);

  const fetchCalendarEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const year = currentCalendarDate.getFullYear();
      const month = currentCalendarDate.getMonth();

      const eventsResponse = await fetch(`/api/dashboard/calendar-events?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        if (eventsData.success) {
          setCalendarEvents(eventsData.data.map((event: any) => ({
            ...event,
            date: new Date(event.date),
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (typeof window === 'undefined') {
        setError('Client-side required');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      // Fetch recent activities
      const activitiesResponse = await fetch('/api/dashboard/recent-activities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.data);
        }
      }



      // Fetch upcoming events
      const upcomingResponse = await fetch('/api/dashboard/upcoming-events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        if (upcomingData.success) {
          setUpcomingEvents(upcomingData.data);
        }
      }

      // Fetch download statistics
      const downloadStatsResponse = await fetch('/api/dashboard/download-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (downloadStatsResponse.ok) {
        const downloadStatsData = await downloadStatsResponse.json();
        if (downloadStatsData.success) {
          setDownloadStats(downloadStatsData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentCalendarDate(date);
  };

  const quickActions = [
    {
      id: 'add-product',
      title: 'Add Product',
      description: 'List a new product for rent',
      icon: <Plus className="h-6 w-6" />, 
      onClick: () => {},
      color: 'blue' as const,
    },
    {
      id: 'view-requests',
      title: 'View Requests',
      description: 'Manage rental requests',
      icon: <Eye className="h-6 w-6" />,
      onClick: () => {},
      color: 'green' as const,
    },
    {
      id: 'manage-returns',
      title: 'Manage Returns',
      description: 'Handle product returns and damage assessments',
      icon: <CheckCircle className="h-6 w-6" />,
      onClick: () => {},
      color: 'purple' as const,
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header skeleton */}
          <div>
            <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 7 }, (_, i) => (
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

          {/* Download Statistics skeleton */}
          <div className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="h-5 bg-gray-300 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mb-6">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-100">
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-400 rounded w-12"></div>
                </div>
              ))}
            </div>
            <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-64"></div>
          </div>

          {/* Main content grid skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Calendar skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="h-5 bg-gray-300 rounded w-32 mb-4"></div>
                <div className="space-y-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex justify-between">
                      {Array.from({ length: 7 }, (_, j) => (
                        <div key={j} className="w-8 h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions skeleton */}
            <div>
              <div className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="h-5 bg-gray-300 rounded w-24 mb-4"></div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-gray-300 rounded mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom grid skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Activities skeleton */}
            <div className="bg-white shadow rounded-lg p-6 animate-pulse">
              <div className="h-5 bg-gray-300 rounded w-36 mb-4"></div>
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events skeleton */}
            <div className="bg-white shadow rounded-lg p-6 animate-pulse">
              <div className="h-5 bg-gray-300 rounded w-48 mb-4"></div>
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-4">
                    <div className="w-8 h-8 bg-gray-300 rounded-md"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                  onClick={fetchDashboardData}
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your rental business
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <MetricCard
            title="Total Products"
            value={stats.totalProducts}
            change={{ value: 12, type: 'increase' }}
            icon={<Package className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Available Products"
            value={stats.availableProducts}
            change={{ value: 5, type: 'increase' }}
            icon={<Package className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Rented Products"
            value={stats.rentedProducts}
            change={{ value: 5, type: 'increase' }}
            icon={<Package className="h-6 w-6" />}
            color="red"
          />
          <MetricCard
            title="Active Requests"
            value={stats.activeRequests}
            change={{ value: 12, type: 'increase' }}
            icon={<Calendar className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Pending Requests"
            value={stats.pendingRequests}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Completed Requests"
            value={stats.completedRequests}
            change={{ value: 25, type: 'increase' }}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            change={{ value: 20, type: 'increase' }}
            icon={<DollarSign className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Download Statistics */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Invoice Download Statistics</h2>
            <Link
              href="/invoices"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all invoices<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800">Total Invoices</h3>
              <p className="text-2xl font-bold text-blue-600">{downloadStats.totalInvoices}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">Downloaded</h3>
              <p className="text-2xl font-bold text-green-600">{downloadStats.downloadedInvoices}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-800">PDF Downloads</h3>
              <p className="text-2xl font-bold text-red-600">{downloadStats.pdfDownloads}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">Excel Downloads</h3>
              <p className="text-2xl font-bold text-green-600">{downloadStats.excelDownloads}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800">CSV Downloads</h3>
              <p className="text-2xl font-bold text-blue-600">{downloadStats.csvDownloads}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-800 mb-3">Download Rate</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${downloadStats.totalInvoices > 0 ? Math.round((downloadStats.downloadedInvoices / downloadStats.totalInvoices) * 100) : 0}%` }}
              ></div>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {downloadStats.totalInvoices > 0 ? Math.round((downloadStats.downloadedInvoices / downloadStats.totalInvoices) * 100) : 0}% of invoices have been downloaded
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <CalendarCard
              title="Rental Calendar"
              currentDate={currentCalendarDate}
              onDateChange={handleDateChange}
              events={calendarEvents}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActionsCard
              title="Quick Actions"
              actions={quickActions.map(action => ({
                ...action,
                onClick: () => {
                  if (action.id === 'add-product') {
                    // Navigate to add product page
                    window.location.href = '/products/new';
                  } else if (action.id === 'view-requests') {
                    // Navigate to requests page
                    window.location.href = '/dashboard/requests';
                  } else if (action.id === 'manage-returns') {
                    // Navigate to returns page
                    window.location.href = '/dashboard/returns';
                  }
                }
              }))}
            />
          </div>
        </div>

        {/* Recent Activities and Upcoming Events */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Activities */}
          <RecentActivityCard
            title="Recent Activities"
            activities={recentActivities}
          />

          {/* Upcoming Events */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upcoming Pickups & Returns</h3>
              <div className="flow-root">
                <ul className="divide-y divide-gray-200">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => (
                      <li key={event.id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className={`flex-shrink-0 rounded-md p-2 ${
                            event.type === 'pickup' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {event.type === 'pickup' ? (
                              <Package className="h-5 w-5 text-green-600" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {event.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {event.product} • {event.customer}
                            </p>
                          </div>
                          <div>
                            <div className="text-sm text-gray-900">{event.date}</div>
                            <div className={`text-xs font-medium ${
                              event.type === 'pickup' ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {event.type === 'pickup' ? 'Pickup' : 'Return'}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-4 text-center">
                      <p className="text-sm text-gray-500">No upcoming events</p>
                    </li>
                  )}
                </ul>
              </div>
              {upcomingEvents.length > 0 && (
                <div className="mt-6">
                  <Link
                    href="/dashboard/calendar"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all events<span aria-hidden="true"> &rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
