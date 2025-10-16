'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Payment, RentalRequest, Product, Invoice } from '@/types/models';
import { PaymentStatus } from '@/components/PaymentComponents';
import Navigation from '@/components/Navigation';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');

  const [payment, setPayment] = useState<(Payment & {
    rentalRequest: RentalRequest & {
      product: Product,
      customer: { id: string; name: string; email: string },
      invoice?: Invoice
    }
  }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

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

        // Also fetch invoice details
        const invoiceResponse = await fetch(`/api/invoices?rental_request_id=${data.data.rental_request_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const invoiceData = await invoiceResponse.json();

        if (invoiceData.success && invoiceData.data.length > 0) {
          setPayment({
            ...data.data,
            rentalRequest: {
              ...data.data.rentalRequest,
              invoice: invoiceData.data[0]
            }
          });
        } else {
          setPayment(data.data);
        }
      } catch (err) {
        setError('An error occurred while fetching payment details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId, router]);

  const handleDownloadInvoice = async () => {
    if (!payment || !payment.rentalRequest.invoice) return;

    setDownloadingInvoice(true);
    try {
      // In a real implementation, this would generate and download a PDF invoice
      // For now, we'll simulate it with a simple text download
      const invoiceContent = `
        INVOICE
        =======

        Invoice ID: ${payment.rentalRequest.invoice.id}
        Date: ${new Date(payment.rentalRequest.invoice.created_at).toLocaleDateString()}
        Due Date: ${new Date(payment.rentalRequest.invoice.due_date).toLocaleDateString()}

        BILL TO:
        ${payment.rentalRequest.customer.name}
        ${payment.rentalRequest.customer.email}

        PRODUCT:
        ${payment.rentalRequest.product.title}
        ${payment.rentalRequest.product.category}

        RENTAL PERIOD:
        ${new Date(payment.rentalRequest.start_date).toLocaleDateString()} - ${new Date(payment.rentalRequest.end_date).toLocaleDateString()}

        ITEM DESCRIPTION:
        Rental Fee: ${payment.rentalRequest.rental_period} days @ $${(payment.amount / payment.rentalRequest.rental_period).toFixed(2)} per day

        AMOUNT PAID: $${payment.amount.toFixed(2)}

        PAYMENT STATUS: ${payment.payment_status}
        PAYMENT ID: ${payment.id}
        TRANSACTION ID: ${payment.transaction_id}

        Thank you for your business!
      `;

      const blob = new Blob([invoiceContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${payment.rentalRequest.invoice.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleViewRentalRequest = () => {
    if (payment) {
      router.push(`/rental-requests/${payment.rental_request_id}`);
    }
  };

  const handleBrowseMoreProducts = () => {
    router.push('/products');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* <Navigation /> */}
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
        {/* <Navigation /> */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">{error || 'Payment details not found'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <Navigation /> */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-lg text-gray-600">
                Thank you for your payment. Your rental has been confirmed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID</span>
                    <span className="font-medium text-gray-500 ">{payment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="font-medium text-gray-500 ">{payment.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium text-gray-500 ">{payment.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid</span>
                    <span className="font-medium text-gray-500 ">${payment.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status</span>
                    <PaymentStatus status={payment.payment_status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Date</span>
                    <span className="font-medium text-gray-500 ">{new Date(payment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Rental Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product</span>
                    <span className="font-medium text-gray-500">{payment.rentalRequest.product.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental Period</span>
                    <span className="font-medium text-gray-500">
                      {new Date(payment.rentalRequest.start_date).toLocaleDateString()} - {new Date(payment.rentalRequest.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium text-gray-500">{payment.rentalRequest.rental_period} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pickup Location</span>
                    <span className="font-medium text-gray-500">{payment.rentalRequest.pickup_location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Location</span>
                    <span className="font-medium text-gray-500">{payment.rentalRequest.return_location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rental Status</span>
                    <span className="font-medium text-gray-500 capitalize">{payment.rentalRequest.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">Next Steps</h2>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your payment has been processed and the rental has been confirmed.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Contact the product owner to coordinate pickup arrangements.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Make sure to inspect the product upon pickup and note any existing damages.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Return the product in good condition on or before the end date.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Keep this confirmation page for your records.</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {payment.rentalRequest.invoice && (
                <button
                  onClick={handleDownloadInvoice}
                  disabled={downloadingInvoice}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center disabled:opacity-50"
                >
                  {downloadingInvoice ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                      </svg>
                      Download Invoice
                    </>
                  )}
                </button>
              )}

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

export default function PaymentSuccessPage() {
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
      <PaymentSuccessContent />
    </Suspense>
  );
}
