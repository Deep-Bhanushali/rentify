'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Payment, RentalRequest, Product } from '@/types/models';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  rentalRequest: RentalRequest & { product: Product };
  onSuccess: (payment: Payment) => void;
  onError: (error: string) => void;
  paymentMethod?: string;
}

export function PaymentForm({ rentalRequest, onSuccess, onError, paymentMethod = 'card' }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent on the server
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          payment_method: paymentMethod,
        }),
      });

      const { success, message, data } = await response.json();

      if (!success) {
        throw new Error(message || 'Failed to create payment intent');
      }

      const { client_secret } = data;

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (paymentError) {
        throw new Error(paymentError.message || 'Payment failed');
      }

      if (paymentIntent.status === 'succeeded') {
        // Payment successful, update the payment record
        const paymentResponse = await fetch(`/api/payments/${rentalRequest.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            payment_status: 'completed',
            transaction_id: paymentIntent.id,
          }),
        });

        const paymentResult = await paymentResponse.json();
        
        if (paymentResult.success) {
          onSuccess(paymentResult.data);
        } else {
          throw new Error(paymentResult.message || 'Failed to update payment status');
        }
      }
    } catch (error: any) {
      onError(error.message || 'An error occurred during payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={billingDetails.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={billingDetails.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address.line1" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              id="address.line1"
              name="address.line1"
              value={billingDetails.address.line1}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              id="address.city"
              name="address.city"
              value={billingDetails.address.city}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              id="address.state"
              name="address.state"
              value={billingDetails.address.state}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address.postal_code" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              id="address.postal_code"
              name="address.postal_code"
              value={billingDetails.address.postal_code}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Information
          </label>
          <div className="p-3 border border-gray-300 rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Terms and Conditions</h3>
        <div className="h-32 overflow-y-auto p-3 bg-gray-50 rounded-md mb-4 text-sm text-gray-600">
          <p>
            By completing this payment, you agree to the rental terms and conditions for the product: 
            {rentalRequest.product.title}. The rental period is from {new Date(rentalRequest.start_date).toLocaleDateString()} 
            to {new Date(rentalRequest.end_date).toLocaleDateString()}. The total rental cost is ${rentalRequest.price.toFixed(2)}.
          </p>
          <p className="mt-2">
            Cancellation policy: Cancellations made at least 48 hours before the rental start date will receive a full refund. 
            Cancellations made less than 48 hours before the rental start date will be charged 50% of the rental fee.
          </p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="terms"
            required
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
            I agree to the terms and conditions
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : `Pay $${rentalRequest.price.toFixed(2)}`}
      </button>
    </form>
  );
}

interface PaymentStatusProps {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export function PaymentStatus({ status }: PaymentStatusProps) {
  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800',
      text: 'Pending',
    },
    completed: {
      color: 'bg-green-100 text-green-800',
      text: 'Completed',
    },
    failed: {
      color: 'bg-red-100 text-red-800',
      text: 'Failed',
    },
    refunded: {
      color: 'bg-blue-100 text-blue-800',
      text: 'Refunded',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.text}
    </span>
  );
}

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
}

export function PaymentMethodSelector({ selectedMethod, onMethodChange }: PaymentMethodSelectorProps) {
  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', type: 'online' },
    { id: 'paypal', name: 'PayPal', icon: '🔵', type: 'online' },
    { id: 'apple_pay', name: 'Apple Pay', icon: '🍎', type: 'online' },
    { id: 'google_pay', name: 'Google Pay', icon: '🔍', type: 'online' },
    { id: 'offline', name: 'Offline Payment', icon: '💵', type: 'offline' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedMethod === method.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => onMethodChange(method.id)}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{method.icon}</span>
              <div>
                <span className="font-medium block">{method.name}</span>
                {method.type === 'offline' && (
                  <span className="text-xs text-gray-500">Pay in person or by other manual methods</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OfflinePaymentFormProps {
  rentalRequest: RentalRequest & { product: Product };
  onSuccess: (payment: Payment) => void;
  onError: (error: string) => void;
}

export function OfflinePaymentForm({ rentalRequest, onSuccess, onError }: OfflinePaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!agreedToTerms) {
      onError('You must agree to the terms and conditions');
      return;
    }

    setIsProcessing(true);

    try {
      // Create offline payment record
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          payment_method: 'offline',
        }),
      });

      const { success, message, data } = await response.json();

      if (!success) {
        throw new Error(message || 'Failed to initiate offline payment');
      }

      onSuccess(data);
    } catch (error: any) {
      onError(error.message || 'An error occurred during payment initiation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Offline Payment Information</h3>
        <div className="bg-blue-50 p-4 rounded-md mb-4">
          <h4 className="font-medium text-blue-800 mb-2">How Offline Payment Works</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
            <li>Select offline payment to pay in person or through other manual methods</li>
            <li>You'll receive payment instructions after initiating this process</li>
            <li>The owner will verify your payment once received</li>
            <li>Your rental will be confirmed after payment verification</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-md">
          <h4 className="font-medium text-yellow-800 mb-2">Payment Instructions</h4>
          <p className="text-sm text-yellow-700">
            After initiating offline payment, you'll need to contact the owner to arrange payment.
            Accepted payment methods typically include cash, check, or bank transfer.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Terms and Conditions</h3>
        <div className="h-32 overflow-y-auto p-3 bg-gray-50 rounded-md mb-4 text-sm text-gray-600">
          <p>
            By initiating offline payment, you agree to the rental terms and conditions for the product:
            {rentalRequest.product.title}. The rental period is from {new Date(rentalRequest.start_date).toLocaleDateString()}
            to {new Date(rentalRequest.end_date).toLocaleDateString()}. The total rental cost is ${rentalRequest.price.toFixed(2)}.
          </p>
          <p className="mt-2">
            You must arrange payment with the owner within 48 hours. The owner will verify your payment
            and confirm your rental once payment is received. Cancellation policy: Cancellations made
            at least 48 hours before the rental start date will receive a full refund. Cancellations
            made less than 48 hours before the rental start date will be charged 50% of the rental fee.
          </p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="offline-terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            required
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="offline-terms" className="ml-2 block text-sm text-gray-900">
            I agree to the terms and conditions for offline payment
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !agreedToTerms}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : `Initiate Offline Payment - $${rentalRequest.price.toFixed(2)}`}
      </button>
    </form>
  );
}

interface PaymentWrapperProps {
  rentalRequest: RentalRequest & { product: Product };
  onSuccess: (payment: Payment) => void;
  onError: (error: string) => void;
}

export function PaymentWrapper({ rentalRequest, onSuccess, onError }: PaymentWrapperProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [showOfflineConfirmation, setShowOfflineConfirmation] = useState(false);

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const handleOfflinePaymentSuccess = (payment: Payment) => {
    setShowOfflineConfirmation(true);
    onSuccess(payment);
  };

  if (showOfflineConfirmation) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">Offline Payment Initiated</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Your offline payment has been initiated. Please follow the instructions provided to complete your payment.
            </p>
          </div>
          <div className="mt-5">
          <button
            type="button"
            onClick={() => window.location.href = `/payment/offline`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Payment Details
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PaymentMethodSelector
        selectedMethod={selectedPaymentMethod}
        onMethodChange={handlePaymentMethodChange}
      />
      
      {selectedPaymentMethod === 'offline' ? (
        <OfflinePaymentForm
          rentalRequest={rentalRequest}
          onSuccess={handleOfflinePaymentSuccess}
          onError={onError}
        />
      ) : (
        <Elements stripe={stripePromise}>
          <PaymentForm
            rentalRequest={rentalRequest}
            onSuccess={onSuccess}
            onError={onError}
            paymentMethod={selectedPaymentMethod}
          />
        </Elements>
      )}
    </div>
  );
}
