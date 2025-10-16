'use client';

import { useState } from 'react';
import { Payment, RentalRequest } from '@/types/models';

interface OfflinePaymentVerificationProps {
  payment: Payment & {
    rentalRequest: RentalRequest & {
      product: {
        title: string;
        user: {
          name: string;
          email: string;
        };
      };
      customer: {
        name: string;
        email: string;
      };
    };
  };
  onVerificationComplete: (payment: Payment) => void;
  onError: (error: string) => void;
}

export default function OfflinePaymentVerification({ 
  payment, 
  onVerificationComplete, 
  onError 
}: OfflinePaymentVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState({
    payment_method: '',
    amount: payment.amount.toString(),
    notes: '',
    payment_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  });
  const [showReceipt, setShowReceipt] = useState(false);

  const paymentMethods = [
    { id: 'cash', name: 'Cash' },
    { id: 'check', name: 'Check' },
    { id: 'bank_transfer', name: 'Bank Transfer' },
    { id: 'other', name: 'Other' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVerificationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationData.payment_method) {
      onError('Please select a payment method');
      return;
    }

    if (parseFloat(verificationData.amount) !== payment.amount) {
      onError('Payment amount does not match the rental amount');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          payment_status: 'completed',
          payment_method: verificationData.payment_method,
          notes: verificationData.notes,
          payment_date: new Date(verificationData.payment_date),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to verify payment');
      }

      onVerificationComplete(result.data);
      setShowReceipt(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (showReceipt) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">Payment Verified Successfully</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              The offline payment has been verified and the rental status has been updated.
            </p>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-md text-left">
            <h4 className="font-medium text-gray-900 mb-2">Payment Receipt</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Payment ID:</span> {payment.id}</p>
              <p><span className="font-medium">Rental:</span> {payment.rentalRequest.product.title}</p>
              <p><span className="font-medium">Customer:</span> {payment.rentalRequest.customer.name}</p>
              <p><span className="font-medium">Amount:</span> ${payment.amount.toFixed(2)}</p>
              <p><span className="font-medium">Payment Method:</span> {verificationData.payment_method}</p>
              <p><span className="font-medium">Verification Date:</span> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Print Receipt
            </button>
            <button
              type="button"
              onClick={() => onVerificationComplete(payment)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Verify Offline Payment</h2>
      
      <div className="mb-6 bg-blue-50 p-4 rounded-md">
        <h3 className="font-medium text-blue-800 mb-2">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <p><span className="font-medium">Customer:</span> {payment.rentalRequest.customer.name}</p>
            <p><span className="font-medium">Email:</span> {payment.rentalRequest.customer.email}</p>
          </div>
          <div>
            <p><span className="font-medium">Product:</span> {payment.rentalRequest.product.title}</p>
            <p><span className="font-medium">Amount:</span> ${payment.amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleVerifyPayment} className="space-y-6">
        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method *
          </label>
          <select
            id="payment_method"
            name="payment_method"
            value={verificationData.payment_method}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a payment method</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount *
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="amount"
              name="amount"
              value={verificationData.amount}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date *
          </label>
          <input
            type="date"
            id="payment_date"
            name="payment_date"
            value={verificationData.payment_date}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={verificationData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any additional information about the payment..."
          />
        </div>

        <div className="bg-yellow-50 p-4 rounded-md">
          <h3 className="font-medium text-yellow-800 mb-2">Verification Notice</h3>
          <p className="text-sm text-yellow-700">
            By verifying this payment, you confirm that you have received the full payment amount 
            and agree to finalize the rental agreement. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => onError('Verification cancelled')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isVerifying}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Verify Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}