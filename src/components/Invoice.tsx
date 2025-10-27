'use client';

import { Invoice as InvoiceType, User } from '@/types/models';
import { format } from 'date-fns';
import Image from 'next/image';

interface InvoiceProps {
  invoice: InvoiceType & {
    rentalRequest: {
      product: {
        title: string;
        category: string;
        user: User;
      };
      customer: User;
      start_date: Date;
      end_date: Date;
      pickup_location: string;
      return_location: string;
    };
    invoiceItems: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      item_type: string;
    }>;
  };
  isPreview?: boolean;
  showActions?: boolean;
  onDownload?: () => void;
  onPay?: () => void;
  currentUserId?: string | null;
}

export default function Invoice({ 
  invoice, 
  isPreview = false, 
  showActions = true,
  onDownload,
  onPay 
}: InvoiceProps) {
  const formatDate = (date: Date) => format(new Date(date), 'MMM dd, yyyy');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Invoice Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-gray-600 mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.invoice_status)}`}>
              {invoice.invoice_status.charAt(0).toUpperCase() + invoice.invoice_status.slice(1)}
            </span>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Date:</span> {formatDate(invoice.created_at)}
            </p>
            {invoice.paid_date && (
              <p className="text-gray-600">
                <span className="font-medium">Paid Date:</span> {formatDate(invoice.paid_date)}
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">From:</h2>
            <p className="text-gray-700">{invoice.rentalRequest.product.user.name}</p>
            <p className="text-gray-600">{invoice.rentalRequest.product.user.email}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">To:</h2>
            <p className="text-gray-700">{invoice.rentalRequest.customer.name}</p>
            <p className="text-gray-600">{invoice.rentalRequest.customer.email}</p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Rental Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">
              <span className="font-medium">Product:</span> {invoice.rentalRequest.product.title}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Category:</span> {invoice.rentalRequest.product.category}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Rental Period:</span> {formatDate(invoice.rentalRequest.start_date)} - {formatDate(invoice.rentalRequest.end_date)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">
              <span className="font-medium">Pickup Location:</span> {invoice.rentalRequest.pickup_location}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Return Location:</span> {invoice.rentalRequest.return_location}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Due Date:</span> {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="mt-4">
            <p className="text-gray-600">
              <span className="font-medium">Notes:</span> {invoice.notes}
            </p>
          </div>
        )}
      </div>

      {/* Invoice Items */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.invoiceItems && invoice.invoiceItems.length > 0 ? (
                invoice.invoiceItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No invoice items available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="p-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-800">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax ({(invoice.tax_rate * 100).toFixed(0)}%):</span>
                <span className="text-gray-800">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              {invoice.late_fee > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Late Fee:</span>
                  <span className="text-gray-800">{formatCurrency(invoice.late_fee)}</span>
                </div>
              )}
              {invoice.damage_fee > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Damage Fee:</span>
                  <span className="text-gray-800">{formatCurrency(invoice.damage_fee)}</span>
                </div>
              )}
              {invoice.additional_charges > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Additional Charges:</span>
                  <span className="text-gray-800">{formatCurrency(invoice.additional_charges)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-gray-200 mt-2 pt-2">
                <span className="text-lg font-semibold text-gray-800">Total:</span>
                <span className="text-lg font-semibold text-gray-800">{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="p-6 bg-gray-50 border-t">
        <h3 className="text-md font-semibold text-gray-800 mb-2">Payment Terms</h3>
        <p className="text-sm text-gray-600">
          Payment is due within 30 days of the invoice date. Late payments are subject to a 5% late fee.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Please make payments to the account details provided by the product owner.
        </p>
      </div>

      {/* Action Buttons */}
      {showActions && !isPreview && (
        <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3">
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Download PDF
            </button>
          )}
          {invoice.invoice_status !== 'paid' && invoice.invoice_status !== 'cancelled' && onPay && (
            <button
              onClick={onPay}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Pay Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
