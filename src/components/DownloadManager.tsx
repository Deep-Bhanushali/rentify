'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/types/models';
import { PDFGenerator } from '@/lib/pdfGenerator';
import { ExcelExport } from '@/lib/excelExport';
import { CSVExport } from '@/lib/csvExport';

interface DownloadHistory {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  format: 'pdf' | 'excel' | 'csv';
  timestamp: Date;
  success: boolean;
  fileSize?: number;
}

interface DownloadManagerProps {
  invoices: Invoice[];
  onDownloadComplete?: (invoiceId: string, format: string) => void;
}

export default function DownloadManager({ invoices, onDownloadComplete }: DownloadManagerProps) {
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [downloading, setDownloading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadDownloadHistory();
  }, []);

  const loadDownloadHistory = () => {
    // In a real implementation, this would fetch from an API
    // For now, we'll use mock data
    const mockHistory: DownloadHistory[] = [
      {
        id: '1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2023-001',
        format: 'pdf',
        timestamp: new Date(Date.now() - 86400000),
        success: true,
        fileSize: 245760
      },
      {
        id: '2',
        invoiceId: 'inv-2',
        invoiceNumber: 'INV-2023-002',
        format: 'excel',
        timestamp: new Date(Date.now() - 172800000),
        success: true,
        fileSize: 51200
      },
      {
        id: '3',
        invoiceId: 'inv-3',
        invoiceNumber: 'INV-2023-003',
        format: 'csv',
        timestamp: new Date(Date.now() - 259200000),
        success: false
      }
    ];
    setDownloadHistory(mockHistory);
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(invoice => invoice.id));
    }
  };

  const handleDownload = async (invoiceId: string, format: 'pdf' | 'excel' | 'csv') => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Set active download
    setActiveDownloads(prev => ({ ...prev, [`${invoiceId}-${format}`]: true }));

    try {
      switch (format) {
        case 'pdf':
          await PDFGenerator.generateInvoicePDF(invoice, 'invoice-container', {
            includeLogo: true,
            includeQRCode: true,
            includeTerms: true,
            companyName: 'Rentify',
            companyAddress: '123 Business St, Suite 100, City, Country',
            companyContact: 'contact@rentify.com | +1 (555) 123-4567'
          });
          break;
        case 'excel':
          // Use API route for Excel download - single invoice
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

      // Add to download history
      const newDownload: DownloadHistory = {
        id: Date.now().toString(),
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        format,
        timestamp: new Date(),
        success: true,
        fileSize: Math.floor(Math.random() * 100000) + 10000 // Mock file size
      };
      setDownloadHistory(prev => [newDownload, ...prev]);

      // Notify parent component
      if (onDownloadComplete) {
        onDownloadComplete(invoiceId, format);
      }
    } catch (error) {
      console.error(`Error downloading ${format.toUpperCase()}:`, error);
      
      // Add failed download to history
      const newDownload: DownloadHistory = {
        id: Date.now().toString(),
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        format,
        timestamp: new Date(),
        success: false
      };
      setDownloadHistory(prev => [newDownload, ...prev]);
    } finally {
      // Clear active download
      setActiveDownloads(prev => ({ ...prev, [`${invoiceId}-${format}`]: false }));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0) {
      alert('Please select at least one invoice to download');
      return;
    }

    setDownloading(true);
    try {
      const selectedInvoiceData = invoices.filter(invoice =>
        selectedInvoices.includes(invoice.id)
      );

      switch (downloadFormat) {
        case 'excel':
          await ExcelExport.exportInvoicesToExcel(selectedInvoiceData, {
            includeCharts: true,
            companyName: 'Rentify',
            includeMultipleWorksheets: true
          });
          break;
        case 'csv':
          await CSVExport.exportInvoicesToCSV(selectedInvoiceData);
          break;
        default:
          // For PDF, we would need to download each invoice individually
          for (const invoice of selectedInvoiceData) {
            await handleDownload(invoice.id, 'pdf');
          }
      }
      
      // Clear selection after successful download
      setSelectedInvoices([]);
    } catch (error) {
      console.error('Error during bulk download:', error);
      alert('Failed to download selected invoices. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf': return 'text-red-600';
      case 'excel': return 'text-green-600';
      case 'csv': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Calculate download statistics
  const totalDownloads = downloadHistory.length;
  const successfulDownloads = downloadHistory.filter(d => d.success).length;
  const failedDownloads = totalDownloads - successfulDownloads;
  
  const pdfDownloads = downloadHistory.filter(d => d.format === 'pdf' && d.success).length;
  const excelDownloads = downloadHistory.filter(d => d.format === 'excel' && d.success).length;
  const csvDownloads = downloadHistory.filter(d => d.format === 'csv' && d.success).length;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Download Manager</h2>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {/* Download Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Downloads</h3>
          <p className="text-2xl font-bold text-blue-600">{totalDownloads}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Successful</h3>
          <p className="text-2xl font-bold text-green-600">{successfulDownloads}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">Failed</h3>
          <p className="text-2xl font-bold text-red-600">{failedDownloads}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800">Success Rate</h3>
          <p className="text-2xl font-bold text-purple-600">
            {totalDownloads > 0 ? Math.round((successfulDownloads / totalDownloads) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Format Distribution */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-800 mb-3">Downloads by Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center bg-red-50 p-3 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 mr-2">PDF:</span>
            <span className="text-sm font-medium">{pdfDownloads}</span>
          </div>
          
          <div className="flex items-center bg-green-50 p-3 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 mr-2">Excel:</span>
            <span className="text-sm font-medium">{excelDownloads}</span>
          </div>
          
          <div className="flex items-center bg-blue-50 p-3 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 mr-2">CSV:</span>
            <span className="text-sm font-medium">{csvDownloads}</span>
          </div>
        </div>
      </div>

      {/* Bulk Download */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-3">Bulk Download</h3>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedInvoices.length === invoices.length && invoices.length > 0}
              onChange={handleSelectAllInvoices}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            <span className="text-sm text-gray-700">
              Select All ({selectedInvoices.length}/{invoices.length})
            </span>
          </div>
          
          <div className="flex items-center">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
              className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
            <button
              onClick={handleBulkDownload}
              disabled={downloading || selectedInvoices.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : `Download Selected (${selectedInvoices.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Download History */}
      {showHistory && (
        <div>
          <h3 className="text-md font-medium text-gray-800 mb-3">Download History</h3>
          
          {downloadHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No download history available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {downloadHistory.map((download) => (
                    <tr key={download.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {download.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center ${getFormatColor(download.format)}`}>
                          <span className="mr-1">{getFormatIcon(download.format)}</span>
                          {download.format.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDownloadTime(download.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {download.fileSize ? formatFileSize(download.fileSize) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          download.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {download.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
