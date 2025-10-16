'use client';

import { Payment, RentalRequest } from '@/types/models';

interface OfflinePaymentInstructionsProps {
  payment: Payment & {
    rentalRequest: RentalRequest & {
      product: {
        title: string;
        user: {
          name: string;
          email: string;
          phone?: string;
        };
      };
    };
  };
}

export default function OfflinePaymentInstructions({ payment }: OfflinePaymentInstructionsProps) {
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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Offline Payment Instructions</h2>
      
      <div className="space-y-6">
        {/* Payment Overview */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-blue-800 mb-2">Payment Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><span className="font-medium">Total Amount:</span> ${payment.amount.toFixed(2)}</p>
              <p><span className="font-medium">Payment ID:</span> {payment.id}</p>
            </div>
            <div>
              <p><span className="font-medium">Due Date:</span> {getDueDate()}</p>
              <p><span className="font-medium">Status:</span> Pending Verification</p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">How to Complete Your Payment</h3>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-600">
            <li className="pl-2">
              <span className="font-medium text-gray-900">Contact the Owner</span>
              <p className="mt-1">
                Reach out to the owner using the contact information provided below to arrange a payment method and location.
              </p>
            </li>
            <li className="pl-2">
              <span className="font-medium text-gray-900">Choose Payment Method</span>
              <p className="mt-1">
                Select from the accepted payment methods listed below. The owner may have specific preferences.
              </p>
            </li>
            <li className="pl-2">
              <span className="font-medium text-gray-900">Make Payment</span>
              <p className="mt-1">
                Complete the payment before the due date. Be sure to get a receipt or proof of payment.
              </p>
            </li>
            <li className="pl-2">
              <span className="font-medium text-gray-900">Payment Verification</span>
              <p className="mt-1">
                The owner will verify your payment and update the status. You'll receive a confirmation once verified.
              </p>
            </li>
            <li className="pl-2">
              <span className="font-medium text-gray-900">Rental Confirmation</span>
              <p className="mt-1">
                After payment verification, your rental will be confirmed and you'll receive further instructions.
              </p>
            </li>
          </ol>
        </div>

        {/* Accepted Payment Methods */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Accepted Payment Methods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600">💵</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">Cash</h4>
              </div>
              <p className="text-sm text-gray-600">
                Pay in person with cash. Ensure you get a written receipt from the owner.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600">📝</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">Check</h4>
              </div>
              <p className="text-sm text-gray-600">
                Personal or cashier's check made payable to the owner. Allow time for processing.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600">🏦</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">Bank Transfer</h4>
              </div>
              <p className="text-sm text-gray-600">
                Direct transfer to the owner's bank account. Get the account details from the owner.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600">🔄</span>
                </div>
                <h4 className="ml-3 text-sm font-medium text-gray-900">Other Methods</h4>
              </div>
              <p className="text-sm text-gray-600">
                Other arrangements may be possible. Discuss directly with the owner.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Owner Name:</span> {payment.rentalRequest.product.user.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {payment.rentalRequest.product.user.email}
            </p>
            {payment.rentalRequest.product.user.phone && (
              <p>
                <span className="font-medium">Phone:</span> {payment.rentalRequest.product.user.phone}
              </p>
            )}
            <p>
              <span className="font-medium">Product:</span> {payment.rentalRequest.product.title}
            </p>
            <p>
              <span className="font-medium">Rental Period:</span> {formatDate(payment.rentalRequest.start_date)} - {formatDate(payment.rentalRequest.end_date)}
            </p>
          </div>
          
          <div className="mt-4">
            <button
              onClick={() => {
                const email = payment.rentalRequest.product.user.email;
                const subject = `Regarding Offline Payment for ${payment.rentalRequest.product.title}`;
                const body = `Hello ${payment.rentalRequest.product.user.name},\n\nI would like to arrange payment for the rental of ${payment.rentalRequest.product.title} from ${formatDate(payment.rentalRequest.start_date)} to ${formatDate(payment.rentalRequest.end_date)}.\n\nPlease let me know what payment methods you accept and how we can arrange the payment.\n\nThank you.`;
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Contact Owner
            </button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 p-4 rounded-md">
          <h3 className="font-medium text-yellow-800 mb-2">Important Notes</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700">
            <li>Payment must be completed by the due date to secure your rental</li>
            <li>Always get a receipt or proof of payment</li>
            <li>The owner will verify your payment before confirming the rental</li>
            <li>Contact the owner as soon as possible to arrange payment</li>
            <li>Keep all communication records for reference</li>
          </ul>
        </div>
      </div>
    </div>
  );
}