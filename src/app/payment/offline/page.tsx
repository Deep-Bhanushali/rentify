'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Payment, RentalRequest, Product } from '@/types/models';
import Navigation from '@/components/Navigation';

interface OfflinePaymentConfirmationProps {
  payment: Payment & {
    rentalRequest: RentalRequest & {
      product: Product & {
        user: {
          name: string;
          email: string;
          phone?: string;
        };
      };
    };
  };
}

function OfflinePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');

  const [payment, setPayment] = useState<OfflinePaymentConfirmationProps['payment'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        if (!paymentId) {
          setError('Payment ID is required');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message || 'Failed to fetch payment details');
          setLoading(false);
          return;
        }

        setPayment(data.data);
      } catch (err) {
        setError('An error occurred while fetching payment details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId, router]);

  // Calculate due date (7 days from now)
  const getDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error || 'Payment not found'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Offline Payment Confirmation</h1>
            <p className="mt-2 text-gray-600">
              Your offline payment has been initiated. Please follow the instructions below to complete your payment.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Payment details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Rental Details */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Details</h2>

                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="font-medium text-gray-900">{payment.rentalRequest.product.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{payment.rentalRequest.product.category}</p>
                  <p className="text-sm text-gray-500 mt-1">{payment.rentalRequest.product.location}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental Period</span>
                    <span className="font-medium">
                      {formatDate(payment.rentalRequest.start_date)} - {formatDate(payment.rentalRequest.end_date)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">{payment.rentalRequest.rental_period} days</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Rate</span>
                    <span className="font-medium">${(payment.amount / payment.rentalRequest.rental_period).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup Location</span>
                    <span className="font-medium">{payment.rentalRequest.pickup_location}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Location</span>
                    <span className="font-medium">{payment.rentalRequest.return_location}</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-semibold text-gray-900">${payment.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Instructions</h2>

                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium text-blue-800 mb-2">How to Complete Your Payment</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-blue-700">
                    <li>Contact the owner using the information provided below</li>
                    <li>Arrange a suitable payment method (cash, check, or bank transfer)</li>
                    <li>Complete the payment before the due date</li>
                    <li>Keep your payment receipt for verification</li>
                    <li>The owner will verify your payment and confirm your rental</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Accepted Payment Methods</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700">
                    <li>Cash (in person)</li>
                    <li>Personal or cashier&apos;s check</li>
                    <li>Bank transfer</li>
                    <li>Other arrangements as agreed with the owner</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="font-medium text-green-800 mb-2">Payment Verification</h3>
                  <p className="text-sm text-green-700">
                    Once you&apos;ve made the payment, the owner will verify it and update the payment status.
                    You&apos;ll receive a notification when your payment has been confirmed and your rental is finalized.
                  </p>
                </div>
              </div>
            </div>

            {/* Right column - Owner info and payment status */}
            <div className="space-y-6">
              {/* Owner Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Owner Information</h2>

                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {payment.rentalRequest.product.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {payment.rentalRequest.product.user.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.rentalRequest.product.user.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Contact for Payment</h3>
                    <p className="text-sm text-gray-900">
                      Please contact the owner to arrange payment. You can reach them at the email address above.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Payment Location</h3>
                    <p className="text-sm text-gray-900">
                      To be arranged with the owner. Typically at the pickup location or another mutually agreed place.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Status</h2>

                <div className="mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-yellow-400"></div>
                    <span className="ml-2 text-sm font-medium text-gray-900">Pending Payment</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Your payment is pending verification by the owner
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Due Date</span>
                    <span className="font-medium">{getDueDate()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium">Offline</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID</span>
                    <span className="font-medium">{payment.id}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/rental-requests/${payment.rentalRequest.id}`)}
                    className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  >
                    View Rental Request
                  </button>
                </div>

                <div className="mt-3">
                  <button
                    onClick={() => {
                      const email = payment.rentalRequest.product.user.email;
                      window.location.href = `mailto:${email}?subject=Regarding Offline Payment for ${payment.rentalRequest.product.title}`;
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    Contact Owner
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

export default function OfflinePaymentConfirmationPage() {
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
      <OfflinePaymentContent />
    </Suspense>
  );
}
