'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Invoice, ApiResponse } from '@/types/models';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

interface CheckoutFormProps {
  invoice: Invoice;
  onSuccess: (paymentIntentId: string, paymentId: string) => void;
  onError: (error: string) => void;
}

function CheckoutForm({ invoice, onSuccess, onError }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe payment system not loaded. Please refresh the page and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card input field not initialized. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rental_request_id: invoice.rentalRequest?.id,
          payment_method: 'card'
        })
      });

      const data: ApiResponse<{ client_secret: string; payment_id: string }> = await response.json();

      if (!data.success || !data.data?.client_secret) {
        onError(data.message || 'Failed to create payment intent');
        setLoading(false);
        return;
      }

      // Confirm payment
      const result = await stripe.confirmCardPayment(data.data.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Can add more billing details if needed
          },
        }
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        onSuccess(result.paymentIntent.id, data.data.payment_id);
      } else {
        onError('Payment was not completed');
      }
    } catch (err) {
      onError('An unexpected error occurred');
      console.error('Payment error:', err);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Card Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="relative">
              <div className="min-h-[40px] w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                        fontSmoothing: 'antialiased',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#dc2626',
                        iconColor: '#dc2626',
                      },
                    },
                    hidePostalCode: true,
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Your card information is secure and encrypted.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-t-2 border-white rounded-full mr-2"></span>
              Processing Payment...
            </>
          ) : (
            `Pay $${invoice.amount.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'offline'>('stripe');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const invoiceId = searchParams.get('invoiceId');

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to continue with payment');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data: ApiResponse<Invoice> = await response.json();

      if (data.success) {
        setInvoice(data.data);
      } else {
        setError(data.message || 'Failed to load invoice');
      }
    } catch (err) {
      setError('Failed to load invoice');
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string, paymentId: string) => {
    setPaymentStatus('success');
    setTimeout(() => {
      router.push(`/payment/success?payment_id=${paymentId}`);
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setPaymentStatus('error');
  };

  const handleOfflinePayment = async () => {
    if (!invoice) return;

    try {
      setLoading(true);

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rental_request_id: invoice.rentalRequest?.id,
          payment_method: 'offline'
        })
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        router.push('/payment/offline');
      } else {
        setError(data.message || 'Failed to initiate offline payment');
      }
    } catch (err) {
      setError('Failed to process offline payment');
      console.error('Offline payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error || 'Invoice not found'}</p>
                </div>
              </div>
            </div>
            <Link
              href="/invoices"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Invoices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
            <p className="text-gray-600">Securely pay for your rental invoice</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Invoice {invoice.invoice_number}
                </h2>
                <p className="text-gray-600">
                  {invoice.rentalRequest?.product?.title}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-gray-900">
                  ${invoice.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Payment Method</h3>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="stripe"
                  name="payment-method"
                  type="radio"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="stripe" className="ml-3 block text-sm font-medium text-gray-700">
                  Credit/Debit Card (Stripe)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="offline"
                  name="payment-method"
                  type="radio"
                  value="offline"
                  checked={paymentMethod === 'offline'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'offline')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="offline" className="ml-3 block text-sm font-medium text-gray-700">
                  Offline Payment (Cash, Bank Transfer, etc.)
                </label>
              </div>
            </div>
          </div>

          {paymentMethod === 'stripe' && (
            <Elements stripe={stripePromise}>
              <CheckoutForm
                invoice={invoice}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          )}

          {paymentMethod === 'offline' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Offline Payment Instructions</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900">Payment Methods:</h4>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Cash payment at pickup location</li>
                    <li>• Bank transfer to account details below</li>
                    <li>• Other offline methods (check, wire transfer)</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleOfflinePayment}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Initiate Offline Payment'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href={`/invoices/${invoiceId}`}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Invoice Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
