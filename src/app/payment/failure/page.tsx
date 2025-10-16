'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Payment, RentalRequest, Product } from '@/types/models';
import { PaymentStatus } from '@/components/PaymentComponents';
import Navigation from '@/components/Navigation';

function PaymentFailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const rentalRequestId = searchParams.get('rental_request_id');
  
  const [payment, setPayment] = useState<(Payment & { 
    rentalRequest: RentalRequest & { 
      product: Product, 
      customer: { id: string; name: string; email: string }
    } 
  }) | null>(null);
  const [rentalRequest, setRentalRequest] = useState<(RentalRequest & { 
    product: Product, 
    customer: { id: string; name: string; email: string }
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Try to fetch payment details if payment_id is provided
        if (paymentId) {
          const paymentResponse = await fetch(`/api/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const paymentData = await paymentResponse.json();

          if (paymentData.success) {
            setPayment(paymentData.data);
          }
        }

        // Try to fetch rental request details if rental_request_id is provided
        if (rentalRequestId) {
          const rentalResponse = await fetch(`/api/rental-requests/${rentalRequestId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const rentalData = await rentalResponse.json();

          if (rentalData.success) {
            setRentalRequest(rentalData.data);
          }
        }

        if (!paymentId && !rentalRequestId) {
          setError('Payment ID or Rental Request ID is required');
        }
      } catch (err) {
        setError('An error occurred while fetching details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [paymentId, rentalRequestId, router]);

  const handleRetryPayment = () => {
    if (rentalRequest) {
      setRetrying(true);
      router.push(`/checkout?rental_request_id=${rentalRequest.id}`);
    } else if (payment) {
      setRetrying(true);
      router.push(`/checkout?rental_request_id=${payment.rental_request_id}`);
    }
  };

  const handleViewRentalRequest = () => {
    if (payment) {
      router.push(`/rental-requests/${payment.rental_request_id}`);
    } else if (rentalRequest) {
      router.push(`/rental-requests/${rentalRequest.id}`);
    }
  };

  const handleContactSupport = () => {
    // In a real implementation, this could open a contact form or support chat
    window.open('mailto:support@rentify.com?subject=Payment Issue', '_blank');
  };

  const handleBrowseMoreProducts = () => {
    router.push('/products');
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

  if (error || (!payment && !rentalRequest)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error || 'Payment or rental request details not found'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentRentalRequest = payment?.rentalRequest || rentalRequest;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
              <p className="text-lg text-gray-600">
                We&apos;re sorry, but your payment could not be processed.
              </p>
            </div>

            {payment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Payment Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment ID</span>
                      <span className="font-medium">{payment.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID</span>
                      <span className="font-medium">{payment.transaction_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium">{payment.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status</span>
                      <PaymentStatus status={payment.payment_status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Date</span>
                      <span className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Rental Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Details</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product</span>
                      <span className="font-medium">{currentRentalRequest?.product.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rental Period</span>
                      <span className="font-medium">
                        {currentRentalRequest?.start_date && currentRentalRequest?.end_date
                          ? `${new Date(currentRentalRequest.start_date).toLocaleDateString()} - ${new Date(currentRentalRequest.end_date).toLocaleDateString()}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium">{currentRentalRequest?.rental_period} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pickup Location</span>
                      <span className="font-medium">{currentRentalRequest?.pickup_location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Return Location</span>
                      <span className="font-medium">{currentRentalRequest?.return_location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rental Status</span>
                      <span className="font-medium capitalize">{currentRentalRequest?.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Information */}
            <div className="bg-red-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-red-900 mb-4">What Happened?</h2>
              <p className="text-red-800 mb-4">
                Your payment could not be processed. This could be due to several reasons:
              </p>
              <ul className="space-y-2 text-red-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your card may have been declined by the bank</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>There may have been a temporary issue with the payment processor</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You may have entered incorrect payment information</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your card may have expired or reached its limit</span>
                </li>
              </ul>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">What You Can Do</h2>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Try again with a different payment method</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Contact your bank to ensure there are no issues with your card</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Double-check all payment information before resubmitting</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>If the problem persists, contact our support team for assistance</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center disabled:opacity-50"
              >
                {retrying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Try Payment Again
                  </>
                )}
              </button>
              
              <button
                onClick={handleContactSupport}
                className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Contact Support
              </button>
              
              <button
                onClick={handleViewRentalRequest}
                className="bg-gray-100 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                View Rental Request
              </button>
              
              <button
                onClick={handleBrowseMoreProducts}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Browse More Products
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}
