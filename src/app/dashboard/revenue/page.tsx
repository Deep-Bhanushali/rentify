'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MetricCard, ChartCard } from '@/components/DashboardCards';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  upcomingPayments: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  outstandingAmount: number;
  revenueByProduct: Array<{
    product_id: string;
    product_title: string;
    revenue: number;
    rental_count: number;
  }>;
  revenueOverTime: Array<{
    period: string;
    revenue: number;
  }>;
  upcomingPaymentDetails: Array<{
    id: string;
    rental_request_id: string;
    product_title: string;
    customer_name: string;
    amount: number;
    due_date: Date;
    status: 'pending' | 'overdue';
  }>;
}

interface TimeRange {
  value: string;
  label: string;
}

export default function RevenueTracking() {
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    upcomingPayments: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    outstandingAmount: 0,
    revenueByProduct: [],
    revenueOverTime: [],
    upcomingPaymentDetails: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('month');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  const timeRanges: TimeRange[] = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' },
  ];

  useEffect(() => {
    fetchRevenueData();
  }, [selectedTimeRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/dashboard/revenue?timeRange=${selectedTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formattedData = {
            ...data.data,
            upcomingPaymentDetails: data.data.upcomingPaymentDetails.map((payment: any) => ({
              ...payment,
              due_date: new Date(payment.due_date),
            })),
          };
          setRevenueData(formattedData);
          console.log('Fetched revenue data:', formattedData);  
        } else {
          setError(data.message || 'Failed to fetch revenue data');
        }
      } else {
        setError('Failed to fetch revenue data');
      }
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    // In a real app, this would generate and download a report
    alert('Export functionality would be implemented here');
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Simple chart component (in a real app, you'd use a library like Chart.js or Recharts)
  const SimpleChart = ({ data, type }: { data: Array<{ period: string; revenue: number }>, type: 'line' | 'bar' }) => {
    const maxValue = Math.max(...data.map(d => d.revenue));
    
    return (
      <div className="h-64 w-full">
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="text-xs text-gray-500 mb-1">{item.period}</div>
              <div 
                className={`w-full ${type === 'bar' ? 'bg-blue-500 rounded-t' : 'bg-blue-200 rounded-full'}`}
                style={{ 
                  height: `${(item.revenue / maxValue) * 80}%`,
                  minHeight: '4px'
                }}
              ></div>
              <div className="text-xs text-gray-500 font-medium mt-1">${item.revenue.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple pie chart component for revenue by product
  const SimplePieChart = ({ data }: { data: Array<{ product_title: string; revenue: number }> }) => {
    const total = data.reduce((sum, item) => sum + item.revenue, 0);
    
    // Generate colors for each segment
    const colors = [
      'bg-blue-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-red-500',
    ];
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48 rounded-full overflow-hidden">
          {data.map((item, index) => {
            const percentage = (item.revenue / total) * 100;
            const color = colors[index % colors.length];
            
            return (
              <div 
                key={index}
                className={`absolute top-0 left-0 w-full h-full ${color}`}
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((2 * Math.PI * (data.slice(0, index).reduce((sum, i) => sum + (i.revenue / total), 0) + percentage / 2) - 0.25))}% ${50 + 50 * Math.sin((2 * Math.PI * (data.slice(0, index).reduce((sum, i) => sum + (i.revenue / total), 0) + percentage / 2) - 0.25))}%, ${50 + 50 * Math.cos((2 * Math.PI * data.slice(0, index).reduce((sum, i) => sum + (i.revenue / total), 0) - 0.25))}% ${50 + 50 * Math.sin((2 * Math.PI * data.slice(0, index).reduce((sum, i) => sum + (i.revenue / total), 0) - 0.25))}%)`,
                }}
              ></div>
            );
          })}
        </div>
        <div className="mt-4 w-full max-w-md">
          {data.map((item, index) => {
            const percentage = ((item.revenue / total) * 100).toFixed(1);
            const color = colors[index % colors.length];
            
            return (
              <div key={index} className="flex items-center justify-between py-1">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
                  <span className="text-sm text-gray-700 truncate max-w-xs">{item.product_title}</span>
                </div>
                <div className="text-sm text-gray-900">
                  {percentage}% (${item.revenue.toLocaleString()})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-80"></div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-28"></div>
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
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

          {/* Financial summary skeleton */}
          <div className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-gray-100 p-4 rounded-lg">
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-400 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-36 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mb-6"></div>
                <div className="h-64 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>

          {/* Upcoming payments skeleton */}
          <div className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 bg-gray-300 rounded w-40"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-gray-300 rounded-full mr-4"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-40"></div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 bg-gray-300 rounded w-16 mr-4"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                </div>
              ))}
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
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={fetchRevenueData}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Retry</span>
                  <RefreshCw className="h-5 w-5" />
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
            <h1 className="text-2xl font-bold text-gray-900">Revenue Tracking</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your rental business financial performance - showing data for the selected time period
            </p>
          </div>
          <div className="flex space-x-3">
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="TotalRevenue"
            value={`$${revenueData.totalRevenue.toLocaleString()}`}
            change={{ value: 12, type: 'increase' }}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Monthly Revenue"
            value={`$${revenueData.monthlyRevenue.toLocaleString()}`}
            change={{ value: 8, type: 'increase' }}
            icon={<TrendingUp className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Total Invoices"
            value={revenueData.totalInvoices}
            icon={<CreditCard className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Paid Invoices"
            value={revenueData.paidInvoices}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Outstanding Amount"
            value={`$${revenueData.outstandingAmount.toLocaleString()}`}
            icon={<AlertCircle className="h-6 w-6" />}
            color="yellow"
          />
        </div>

        {/* Financial summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  ${revenueData.totalRevenue.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Pending Payments</div>
                <div className="mt-1 text-2xl font-semibold text-yellow-600">
                  ${revenueData.pendingPayments.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Completed Payments</div>
                <div className="mt-1 text-2xl font-semibold text-green-600">
                  ${revenueData.completedPayments.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Upcoming Payments</div>
                <div className="mt-1 text-2xl font-semibold text-purple-600">
                  ${revenueData.upcomingPayments.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue over time */}
          <ChartCard
            title="Revenue Over Time"
            description={`Revenue for ${timeRanges.find(r => r.value === selectedTimeRange)?.label}`}
            actions={
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  className={`relative inline-flex items-center px-3 py-2 rounded-l-md border text-sm font-medium ${
                    chartType === 'bar'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </button>
                <button
                  type="button"
                  className={`-ml-px relative inline-flex items-center px-3 py-2 rounded-r-md border text-sm font-medium ${
                    chartType === 'line'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setChartType('line')}
                >
                  Line
                </button>
              </div>
            }
          >
            <SimpleChart data={revenueData.revenueOverTime} type={chartType} />
          </ChartCard>

          {/* Revenue by product */}
          <ChartCard
            title="Revenue by Product"
            description="Distribution of revenue across your products"
          >
            {revenueData.revenueByProduct.length > 0 ? (
              <SimplePieChart data={revenueData.revenueByProduct} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <DollarSign className="h-12 w-12 mb-2" />
                <p>No revenue data available</p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Upcoming payments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Payments</h3>
              <span className="text-sm text-gray-500">
                {revenueData.upcomingPaymentDetails.length} payments
              </span>
            </div>
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {revenueData.upcomingPaymentDetails.length > 0 ? (
                  revenueData.upcomingPaymentDetails.map((payment) => (
                    <li key={payment.id} className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getPaymentStatusIcon(payment.status)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {payment.product_title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.customer_name} • Due: {new Date(payment.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 mr-4">
                            ${payment.amount.toLocaleString()}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-12 text-center">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming payments</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You have no upcoming payments at this time.
                    </p>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        
      </div>
    </DashboardLayout>
  );
}
