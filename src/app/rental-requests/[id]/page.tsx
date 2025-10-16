'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import RentalRequestStatus from '@/components/RentalRequestStatus';
import OfflinePaymentVerification from '@/components/OfflinePaymentVerification';
import OfflinePaymentInstructions from '@/components/OfflinePaymentInstructions';
import { RentalRequest, Product, User, Payment, Invoice } from '@/types/models';

interface ExtendedRentalRequest extends RentalRequest {
  product: Product & { user: User };
  customer: User;
  payment?: Payment;
  invoice?: Invoice;
}

export default function RentalRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  
  const [rentalRequest, setRentalRequest] = useState<ExtendedRentalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  // Check if user is logged in and fetch rental request
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchRentalRequest();
  }, [requestId]);

  // Fetch rental request details
  const fetchRentalRequest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`/api/rental-requests/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch rental request');
      }
      
      setRentalRequest(result.data);
      
      // Check if current user is the owner
      const userId = JSON.parse(atob(token.split('.')[1])).userId;
      setIsOwner(result.data.product.user_id === userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = (status: 'accepted' | 'rejected' | 'completed' | 'cancelled') => {
    if (rentalRequest) {
      setRentalRequest({ ...rentalRequest, status });
    }
  };

  // Handle offline payment verification
  const handlePaymentVerification = (payment: Payment) => {
    if (rentalRequest && rentalRequest.payment) {
      setRentalRequest({
        ...rentalRequest,
        payment: { ...rentalRequest.payment, ...payment },
        status: 'paid'
      });
      setShowVerificationForm(false);
      setVerificationError(null);
    }
  };

  // Handle verification error
  const handleVerificationError = (errorMessage: string) => {
    setVerificationError(errorMessage);
  };

  // Toggle verification form
  const toggleVerificationForm = () => {
    setShowVerificationForm(!showVerificationForm);
    setVerificationError(null);
  };

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date and time for display
  const formatDateTime = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get invoice status color
  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/rental-requests"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Rental Requests
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : rentalRequest ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Product Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Card */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="relative w-48 h-48 rounded-md overflow-hidden bg-gray-100">
                        <Image
                          src={rentalRequest.product.image_url[0] || '/placeholder-product.jpg'}
                          alt={rentalRequest.product.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link 
                            href={`/products/${rentalRequest.product.id}`}
                            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {rentalRequest.product.title}
                          </Link>
                          
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {rentalRequest.product.category}
                            </span>
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rentalRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          rentalRequest.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          rentalRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          rentalRequest.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rentalRequest.status.charAt(0).toUpperCase() + rentalRequest.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="mt-3 text-gray-600">
                        {rentalRequest.product.description || 'No description available.'}
                      </p>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center text-gray-600">
                          <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {rentalRequest.product.location}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          ${rentalRequest.product.rental_price.toFixed(2)} per day
                        </div>
                      </div>
                      
                      {/* Owner/Customer Information */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900">
                          {isOwner ? 'Customer Information' : 'Owner Information'}
                        </h4>
                        <div className="mt-2 flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {(isOwner ? rentalRequest.customer.name : rentalRequest.product.user.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {isOwner ? rentalRequest.customer.name : rentalRequest.product.user.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {isOwner ? rentalRequest.customer.email : rentalRequest.product.user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rental Details */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rental Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Rental Period</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(rentalRequest.start_date)} - {formatDate(rentalRequest.end_date)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {rentalRequest.rental_period} day{rentalRequest.rental_period !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Total Price</h4>
                    <p className="mt-1 text-sm text-gray-900">${rentalRequest.price.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Pickup Location</h4>
                    <p className="mt-1 text-sm text-gray-900">{rentalRequest.pickup_location}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Return Location</h4>
                    <p className="mt-1 text-sm text-gray-900">{rentalRequest.return_location}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Request Date</h4>
                    <p className="mt-1 text-sm text-gray-900">{formatDateTime(rentalRequest.created_at)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Request ID</h4>
                    <p className="mt-1 text-sm text-gray-900">{rentalRequest.id}</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {rentalRequest.payment && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Payment Status</h4>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(rentalRequest.payment.payment_status)}`}>
                          {rentalRequest.payment.payment_status.charAt(0).toUpperCase() + rentalRequest.payment.payment_status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                      <p className="mt-1 text-sm text-gray-900">${rentalRequest.payment.amount.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Payment Method</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {rentalRequest.payment.payment_method === 'offline' ? 'Offline Payment' : rentalRequest.payment.payment_method}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Transaction ID</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {rentalRequest.payment.transaction_id || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Payment Date</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDateTime(rentalRequest.payment.created_at)}
                      </p>
                    </div>
                    
                    {rentalRequest.payment.notes && (
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                        <p className="mt-1 text-sm text-gray-900">{rentalRequest.payment.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Offline Payment Verification (for owners) */}
                  {isOwner && rentalRequest.payment.payment_method === 'offline' && rentalRequest.payment.payment_status === 'pending' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-medium text-gray-900">Offline Payment Verification</h4>
                        <button
                          onClick={toggleVerificationForm}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          {showVerificationForm ? 'Hide Form' : 'Verify Payment'}
                        </button>
                      </div>
                      
                      {verificationError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                          {verificationError}
                        </div>
                      )}
                      
                      {showVerificationForm && (
                        <OfflinePaymentVerification
                          payment={{
                            ...rentalRequest.payment,
                            rentalRequest: {
                              ...rentalRequest,
                              product: {
                                ...rentalRequest.product,
                                user: {
                                  id: rentalRequest.product.user.id,
                                  name: rentalRequest.product.user.name,
                                  email: rentalRequest.product.user.email
                                }
                              },
                              customer: {
                                id: rentalRequest.customer.id,
                                name: rentalRequest.customer.name,
                                email: rentalRequest.customer.email
                              }
                            }
                          }}
                          onVerificationComplete={handlePaymentVerification}
                          onError={handleVerificationError}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Offline Payment Instructions (for customers) */}
                  {!isOwner && rentalRequest.payment.payment_method === 'offline' && rentalRequest.payment.payment_status === 'pending' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <OfflinePaymentInstructions payment={{
                        ...rentalRequest.payment,
                        rentalRequest: rentalRequest
                      }} />
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Information */}
              {rentalRequest.invoice && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Invoice Status</h4>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(rentalRequest.invoice.invoice_status)}`}>
                          {rentalRequest.invoice.invoice_status.charAt(0).toUpperCase() + rentalRequest.invoice.invoice_status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                      <p className="mt-1 text-sm text-gray-900">${rentalRequest.invoice.amount.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(rentalRequest.invoice.due_date)}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Invoice Date</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDateTime(rentalRequest.invoice.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messaging Section (Placeholder) */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Messaging feature will be available soon.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Status and Actions */}
            <div className="space-y-6">
              {/* Status Component */}
              <RentalRequestStatus
                rentalRequest={rentalRequest}
                isOwner={isOwner}
                onUpdateStatus={handleStatusUpdate}
              />

              {/* Action Buttons */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                
                <div className="space-y-3">
                  {rentalRequest.status === 'accepted' && !rentalRequest.payment && (
                    <button
                      onClick={() => router.push(`/checkout?rental_request_id=${rentalRequest.id}`)}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Make Payment
                    </button>
                  )}
                  
                  {rentalRequest.status === 'accepted' && rentalRequest.payment && rentalRequest.payment.payment_status === 'pending' && (
                    <button
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Complete Payment
                    </button>
                  )}
                  
                  {rentalRequest.invoice && rentalRequest.invoice.invoice_status === 'sent' && (
                    <button
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Download Invoice
                    </button>
                  )}
                  
                  <Link
                    href={`/products/${rentalRequest.product.id}`}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Rental request not found</h3>
            <p className="mt-1 text-gray-500">
              The rental request you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <div className="mt-6">
              <Link
                href="/rental-requests"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Rental Requests
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
