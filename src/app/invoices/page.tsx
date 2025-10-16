"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Invoice, ApiResponse } from "@/types/models";
import { ExcelExport } from "@/lib/excelExport";
import { CSVExport } from "@/lib/csvExport";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    search: "",
    downloadStatus: "all", // 'all', 'downloaded', 'not_downloaded'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [bulkDownloadFormat, setBulkDownloadFormat] = useState<
    "pdf" | "excel" | "csv"
  >("pdf");
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [showDownloadStats, setShowDownloadStats] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchInvoices();
  }, [filters.status, filters.startDate, filters.endDate, pagination.page]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      queryParams.append("page", pagination.page.toString());
      queryParams.append("limit", pagination.limit.toString());

      const response = await fetch(`/api/invoices?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<{
        invoices: Invoice[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }> = await response.json();

      if (data.success) {
        setInvoices(data.data!.invoices);
        setPagination(data.data!.pagination);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to fetch invoices");
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset to first page when filters change
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      if (prev.includes(invoiceId)) {
        return prev.filter((id) => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map((invoice) => invoice.id));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice to download");
      return;
    }

    setBulkDownloading(true);
    try {
      const response = await fetch("/api/invoices/bulk-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          invoiceIds: selectedInvoices,
          format: bulkDownloadFormat === "pdf" ? "excel" : bulkDownloadFormat, // Convert PDF to Excel for now
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate bulk download");
      }

      // Create download link for the base64 encoded file
      const { fileName, fileContent } = result.data;
      const link = document.createElement("a");
      link.href = `data:application/octet-stream;base64,${fileContent}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        `Successfully downloaded ${
          selectedInvoices.length
        } invoices as ${bulkDownloadFormat.toUpperCase()}`
      );
      setSelectedInvoices([]);
    } catch (error) {
      console.error("Error during bulk download:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download selected invoices. Please try again."
      );
    } finally {
      setBulkDownloading(false);
    }
  };

  const toggleDownloadStats = () => {
    setShowDownloadStats(!showDownloadStats);
  };

  // Calculate download statistics
  const calculateDownloadStats = () => {
    // In a real implementation, this would come from an API
    // For now, we'll use mock data
    const totalInvoices = invoices.length;
    const downloadedInvoices = Math.floor(totalInvoices * 0.7); // Mock: 70% downloaded
    const notDownloadedInvoices = totalInvoices - downloadedInvoices;

    const pdfDownloads = Math.floor(downloadedInvoices * 0.6); // Mock: 60% PDF
    const excelDownloads = Math.floor(downloadedInvoices * 0.3); // Mock: 30% Excel
    const csvDownloads = downloadedInvoices - pdfDownloads - excelDownloads; // Mock: 10% CSV

    return {
      totalInvoices,
      downloadedInvoices,
      notDownloadedInvoices,
      pdfDownloads,
      excelDownloads,
      csvDownloads,
    };
  };

  const downloadStats = calculateDownloadStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
    fetchInvoices();
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM dd, yyyy");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Invoices
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleDownloadStats}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              {showDownloadStats ? "Hide Stats" : "Show Stats"}
            </button>

            {selectedInvoices.length > 0 && (
              <div className="flex items-center">
                <select
                  value={bulkDownloadFormat}
                  onChange={(e) =>
                    setBulkDownloadFormat(
                      e.target.value as "pdf" | "excel" | "csv"
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {bulkDownloading
                    ? "Downloading..."
                    : `Download Selected (${selectedInvoices.length})`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Download Statistics */}
        {showDownloadStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Download Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">
                  Total Invoices
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  {downloadStats.totalInvoices}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">
                  Downloaded
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {downloadStats.downloadedInvoices}
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">
                  Not Downloaded
                </h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {downloadStats.notDownloadedInvoices}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">
                  Download Rate
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {downloadStats.totalInvoices > 0
                    ? Math.round(
                        (downloadStats.downloadedInvoices /
                          downloadStats.totalInvoices) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-800 mb-3">
                Downloads by Format
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">PDF: </span>
                  <span className="text-sm text-gray-500 font-medium ml-1">
                    {downloadStats.pdfDownloads}
                  </span>
                </div>

                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Excel: </span>
                  <span className="text-sm text-gray-500 font-medium ml-1">
                    {downloadStats.excelDownloads}
                  </span>
                </div>

                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">CSV: </span>
                  <span className="text-sm text-gray-500 font-medium ml-1">
                    {downloadStats.csvDownloads}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="downloadStatus"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Download Status
                </label>
                <select
                  id="downloadStatus"
                  name="downloadStatus"
                  value={filters.downloadStatus}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="downloaded">Downloaded</option>
                  <option value="not_downloaded">Not Downloaded</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invoices List */}
        {loading ? (
          <div className="space-y-6">
            {/* Download Statistics skeleton */}
            <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="bg-gray-100 p-4 rounded-lg">
                    <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-400 rounded w-16"></div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="h-5 bg-gray-300 rounded w-36 mb-3"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 mr-1"></div>
                      <div className="h-4 bg-gray-300 rounded w-8"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters skeleton */}

            {/* Table skeleton */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Array.from({ length: 8 }, (_, i) => (
                        <th key={i} className="px-6 py-3">
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 10 }, (_, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.from({ length: 8 }, (_, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-6 py-4 whitespace-nowrap"
                          >
                            <div
                              className={`h-4 bg-gray-200 rounded ${
                                colIndex === 0
                                  ? "w-4" // checkbox
                                  : colIndex === 6
                                  ? "w-16" // status badge
                                  : colIndex === 7
                                  ? "w-12" // actions
                                  : "w-24"
                              }`}
                            ></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination skeleton */}
            <div className="flex items-center justify-between animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-300 rounded w-8"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {invoices.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No invoices found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters or check back later.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedInvoices.length === invoices.length &&
                              invoices.length > 0
                            }
                            onChange={handleSelectAllInvoices}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => handleSelectInvoice(invoice.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invoice.rentalRequest?.product?.title || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(invoice.due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(invoice.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                invoice.invoice_status
                              )}`}
                            >
                              {invoice.invoice_status.charAt(0).toUpperCase() +
                                invoice.invoice_status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span>{" "}
                  results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded-md ${
                      pagination.page === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-md">
                    {pagination.page}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className={`px-3 py-1 rounded-md ${
                      pagination.page === pagination.pages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
