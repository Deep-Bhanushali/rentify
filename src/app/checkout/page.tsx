'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Payment, RentalRequest, Product } from '@/types/models';
import { PaymentWrapper, PaymentStatus } from '@/components/PaymentComponents';
import Navigation from '@/components/Navigation';

interface CheckoutPageProps {
  searchParams: Promise<{ rental_request_id: string }>;
}

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const router = useRouter();
  const [rentalRequest, setRentalRequest] = useState<(RentalRequest & { product: Product }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRentalRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const params = await searchParams;
        if (!params.rental_request_id) {
          setError('Rental request ID is required');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/rental-requests/${params.rental_request_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message || 'Failed to fetch rental request');
          setLoading(false);
          return;
        }

        setRentalRequest(data.data);
      } catch (err) {
        setError('An error occurred while fetching rental request');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalRequest();
  }, [searchParams, router]);

  const handlePaymentSuccess = (payment: Payment) => {
    setPaymentSuccess(true);
    // Redirect to success page after a short delay
    setTimeout(() => {
      router.push(`/payment/success?payment_id=${payment.id}`);
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setPaymentError(errorMessage);
  };

  const handleRetryPayment = () => {
    setPaymentError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rentalRequest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error || 'Rental request not found'}</p>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rentalRequest.status !== 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-600 mb-4">Rental Request Not Accepted</h2>
            <p className="text-gray-700 mb-6">
              This rental request has not been accepted yet. Please wait for the owner to accept your request before making a payment.
            </p>
            <button
              onClick={() => router.push(`/rental-requests/${rentalRequest.id}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              View Rental Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h2>
            <p className="text-gray-700 mb-6">
              Redirecting to confirmation page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Payment form */}
            <div className="lg:col-span-2">
              {paymentError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        {paymentError}
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={handleRetryPayment}
                          className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <PaymentWrapper
                rentalRequest={rentalRequest}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
            
            {/* Right column - Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="font-medium text-gray-900">{rentalRequest.product.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{rentalRequest.product.category}</p>
                  <p className="text-sm text-gray-500 mt-1">{rentalRequest.product.location}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental Period</span>
                    <span className="font-medium">
                      {new Date(rentalRequest.start_date).toLocaleDateString()} - {new Date(rentalRequest.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">{rentalRequest.rental_period} days</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Rate</span>
                    <span className="font-medium">${(rentalRequest.price / rentalRequest.rental_period).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup Location</span>
                    <span className="font-medium">{rentalRequest.pickup_location}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Location</span>
                    <span className="font-medium">{rentalRequest.return_location}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-semibold text-gray-900">${rentalRequest.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">Payment Status</h3>
                  <div className="flex items-center">
                    <PaymentStatus status="pending" />
                    <span className="ml-2 text-sm text-blue-700">Awaiting payment</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/products/${rentalRequest.product_id}`)}
                    className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  >
                    Back to Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
