'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InvoiceComponent from '@/components/Invoice';
import { CSVExport } from '@/lib/csvExport';
import { toast } from 'react-toastify';
import { Invoice, ApiResponse } from '@/types/models';

interface DownloadHistory {
  id: string;
  format: 'pdf' | 'excel' | 'csv';
  timestamp: Date;
  success: boolean;
}

const PAYMENT_TIME_LIMIT_MINUTES = 5; // 5 minutes payment window

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'csv'>('excel');
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentTimer, setPaymentTimer] = useState<number>(0);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const decoded = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
          setCurrentUserId(decoded.userId);
        }
      } catch (err) {
        console.error('Failed to decode user token:', err);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchInvoice();
    loadDownloadHistory();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data: ApiResponse<Invoice> = await response.json();

      if (data.success) {
        setInvoice(data.data);
        // Set default email subject and body
        setEmailSubject(`Invoice ${data.data?.invoice_number} from Rentify`);
        setEmailBody(`Please find attached invoice ${data.data?.invoice_number} for your recent rental.`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch invoice');
      console.error('Error fetching invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDownloadHistory = () => {
    // In a real implementation, this would fetch from an API
    // For now, we'll use mock data
    const mockHistory: DownloadHistory[] = [
      { id: '1', format: 'pdf', timestamp: new Date(Date.now() - 86400000), success: true },
      { id: '2', format: 'excel', timestamp: new Date(Date.now() - 172800000), success: true },
    ];
    setDownloadHistory(mockHistory);
  };

  const handleDownload = async (format?: 'excel' | 'csv') => {
    if (!invoice) return;

    const actualFormat = format || downloadFormat;
    setDownloadFormat(actualFormat); // Update the current format

    setDownloading(true);

    try {
      switch (actualFormat) {
        case 'excel':
          // Use API route for Excel download - POST single invoice
          const excelResponse = await fetch('/api/invoices/bulk-download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              invoiceIds: [invoice.id],
              format: 'excel'
            })
          });

          if (!excelResponse.ok) {
            throw new Error('Failed to generate Excel download');
          }

          const excelData = await excelResponse.json();
          const excelBlob = new Blob([Uint8Array.from(atob(excelData.data.fileContent), c => c.charCodeAt(0))], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });

          const excelUrl = window.URL.createObjectURL(excelBlob);
          const excelLink = document.createElement('a');
          excelLink.href = excelUrl;
          excelLink.download = excelData.data.fileName;
          document.body.appendChild(excelLink);
          excelLink.click();
          document.body.removeChild(excelLink);
          window.URL.revokeObjectURL(excelUrl);
          break;
        case 'csv':
          await CSVExport.exportInvoiceToCSV(invoice);
          break;
      }

      // Add to download history - call API endpoint to record download
      try {
        await fetch(`/api/invoices/${invoice.id}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ format: actualFormat, fileSize: null })
        });
      } catch (apiErr) {
        console.warn('Failed to record download:', apiErr);
      }

      // Add to local download history
      const newDownload: DownloadHistory = {
        id: Date.now().toString(),
        format: actualFormat,
        timestamp: new Date(),
        success: true
      };
      setDownloadHistory(prev => [newDownload, ...prev]);
    } catch (err) {
      console.error(`Error downloading ${actualFormat.toUpperCase()}:`, err);
      alert(`Failed to download ${actualFormat.toUpperCase()}. Please try again.`);

      // Add failed download to history
      const newDownload: DownloadHistory = {
        id: Date.now().toString(),
        format: actualFormat,
        timestamp: new Date(),
        success: false
      };
      setDownloadHistory(prev => [newDownload, ...prev]);
    } finally {
      setDownloading(false);
    }
  };

  // Calculate time remaining for payment
  const getTimeRemaining = () => {
    if (!invoice || invoice.invoice_status === 'paid') return null;

    const invoiceCreateTime = new Date(invoice.created_at);
    const paymentDeadline = new Date(invoiceCreateTime.getTime() + PAYMENT_TIME_LIMIT_MINUTES * 60 * 1000);
    const now = new Date();

    const timeRemaining = paymentDeadline.getTime() - now.getTime();
    if (timeRemaining <= 0) return { expired: true, minutes: 0, seconds: 0 };

    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    return { expired: false, minutes, seconds };
  };


  const handlePayInvoice = async () => {
    if (!invoice) return;

    setPaying(true);

    try {
      // Check if product is available - if not available, redirect with error
      const rentalRequest = invoice.rentalRequest;
      if (!rentalRequest) {
        router.push('/products/[id]');
        return;
      }

      // Check product status and show appropriate toast notifications
      const productCheck = await fetch(`/api/products/${rentalRequest.product_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const productData = await productCheck.json();

      if (productData.success && productData.data.status === 'rented') {
        toast.info('📅 Checking rental availability...', {
          position: "top-center",
          autoClose: 2000,
        });

        // Check for date conflicts with existing paid rentals
        const availabilityCheck = await fetch('/api/rental-requests/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            product_id: rentalRequest.product_id,
            start_date: rentalRequest.start_date,
            end_date: rentalRequest.end_date
          })
        });

        const availabilityData = await availabilityCheck.json();

        if (!availabilityData.success) {
          toast.error('❌ This product is currently rented for your selected dates.', {
            position: "top-center",
            autoClose: 4000,
          });

          // Delete the rental request and invoice, then redirect
          setTimeout(async () => {
            try {
              await Promise.all([
                fetch(`/api/rental-requests/${rentalRequest.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }),
                fetch(`/api/invoices/${invoice.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                })
              ]);

              toast.info('🧹 Cleaning up rental request...', {
                position: "top-center",
                autoClose: 2000,
              });

              setTimeout(() => {
                router.push(`/products/${rentalRequest.product_id}`);
              }, 2000);
            } catch (cleanupError) {
              console.error('Failed to cleanup:', cleanupError);
              router.push(`/products/${rentalRequest.product_id}`);
            }
          }, 1000);

          setPaying(false);
          return;
        }

        toast.success('✅ Product available for your dates!', {
          position: "top-center",
          autoClose: 2000,
        });
      }

      // If product available, create payment attempt
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rental_request_id: rentalRequest.id,
          payment_method: 'card'
        })
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        // Set payment timer and redirect to payment page
        setPaymentExpiresAt(new Date(paymentData.data.expires_at));
        setPaymentTimer(10 * 60); // 10 minutes

        // Navigate to payment page with payment details
        router.push(`/payment?invoiceId=${invoice.id}&client_secret=${paymentData.data.client_secret}&expires_at=${paymentData.data.expires_at}`);
      } else {
        setError(paymentData.message);
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      setError('Failed to initiate payment process');
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {

    if (!invoice) return;

    const printContents = document.getElementById('invoice-container')?.innerHTML;
    if (!printContents) return;

    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to re-mount the React app properly
  };


  const handleSendEmail = async () => {
    if (!invoice || !emailAddress) return;

    setSendingEmail(true);
    try {
      // Call the API to send the invoice via email and create notification
      const response = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientEmail: emailAddress,
          subject: emailSubject,
          message: emailBody
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invoice');
      }

      const result = await response.json();
      console.log('✅ Email sent successfully to:', emailAddress);
      toast.success('Invoice sent successfully!');
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (err) {
      console.error('❌ Error sending email:', err);
      toast.error('Failed to send invoice. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDownloadTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return '📄';
      case 'excel': return '📊';
      case 'csv': return '📋';
      default: return '📁';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Invoice not found</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors mb-4 md:mb-0"
        >
          ← Back to Invoices
        </button>
        
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {/* <div className="flex items-center">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as 'excel' | 'csv')}
              className="px-3 py-2 border border-gray-300 rounded-l-md hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-500"
            >
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>

            <button
              onClick={() => handleDownload()}
              disabled={downloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : `Download ${downloadFormat.toUpperCase()}`}
            </button>
          </div> */}
          
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Print Invoice
          </button>
          
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Email Invoice
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div id="invoice-container" className="break-inside-avoid avoid-page-break">
            <InvoiceComponent
              invoice={invoice as any}
              onDownload={handlePrint} // No-op - PDF download removed
              onPay={
                invoice.invoice_status !== 'paid' &&
                invoice.invoice_status !== 'cancelled' &&
                currentUserId === invoice.rentalRequest?.customer_id
                  ? handlePayInvoice
                  : undefined
              }
              currentUserId={currentUserId}
            />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Download History</h2>
            {downloadHistory.length === 0 ? (
              <p className="text-gray-600 text-sm">No downloads yet</p>
            ) : (
              <div className="space-y-3 text-black">
                {downloadHistory.map((download) => (
                  <div key={download.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <span className="mr-2">{getFormatIcon(download.format)}</span>
                      <span className="font-medium">{download.format.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">{formatDownloadTime(download.timestamp)}</div>
                      <div className={`text-xs ${download.success ? 'text-green-600' : 'text-red-600'}`}>
                        {download.success ? 'Success' : 'Failed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Actions</h2>
            <div className="space-y-3">
              {invoice.invoice_status !== 'paid' && invoice.invoice_status !== 'cancelled' && currentUserId === invoice.rentalRequest?.customer_id && (
                <button
                  onClick={handlePayInvoice}
                  disabled={paying}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {paying ? 'Processing...' : 'Pay Invoice'}
                </button>
              )}

              {invoice.invoice_status === 'paid' && currentUserId !== invoice.rentalRequest?.customer_id && (
                <div className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-md text-center">
                  Invoice Paid by Customer
                </div>
              )}

              <button
                onClick={handlePrint}
                disabled={downloading}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <span className="mr-2">📄</span>
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </button>

              <button
                onClick={() => handleDownload('excel')}
                disabled={downloading}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <span className="mr-2">📊</span>
                {downloading && downloadFormat === 'excel' ? 'Generating Excel...' : 'Download Excel'}
              </button>

              <button
                onClick={() => handleDownload('csv')}
                disabled={downloading}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <span className="mr-2">📋</span>
                {downloading && downloadFormat === 'csv' ? 'Generating CSV...' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Email Invoice</h2>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Download Progress */}
      {downloading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
              <span>Generating {downloadFormat.toUpperCase()}...</span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
