import { Invoice } from '@/types/models';

export class CSVExport {
  /**
   * Export a single invoice to CSV format
   */
  static async exportInvoiceToCSV(invoice: Invoice): Promise<void> {
    try {
      // Prepare CSV data
      const csvData = this.prepareInvoiceCSVData(invoice);
      
      // Convert to CSV string
      const csvString = this.convertToCSV(csvData);
      
      // Create a blob and trigger download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-${invoice.invoice_number}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting invoice to CSV:', error);
      throw new Error('Failed to export invoice to CSV');
    }
  }
  
  /**
   * Export multiple invoices to CSV format
   */
  static async exportInvoicesToCSV(invoices: Invoice[]): Promise<void> {
    try {
      // Prepare CSV data
      const csvData = this.prepareInvoicesCSVData(invoices);
      
      // Convert to CSV string
      const csvString = this.convertToCSV(csvData);
      
      // Create a blob and trigger download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting invoices to CSV:', error);
      throw new Error('Failed to export invoices to CSV');
    }
  }
  
  /**
   * Export invoice items to CSV format
   */
  static async exportInvoiceItemsToCSV(invoice: Invoice): Promise<void> {
    try {
      // Prepare CSV data
      const csvData = this.prepareInvoiceItemsCSVData(invoice);
      
      // Convert to CSV string
      const csvString = this.convertToCSV(csvData);
      
      // Create a blob and trigger download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-${invoice.invoice_number}-items.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting invoice items to CSV:', error);
      throw new Error('Failed to export invoice items to CSV');
    }
  }
  
  /**
   * Prepare invoice data for CSV export
   */
  private static prepareInvoiceCSVData(invoice: Invoice): Record<string, unknown>[] {
    return [
      {
        'Invoice Number': invoice.invoice_number,
        'Invoice Status': invoice.invoice_status,
        'Invoice Date': new Date(invoice.created_at).toLocaleDateString(),
        'Due Date': new Date(invoice.due_date).toLocaleDateString(),
        'Paid Date': invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '',
        'Customer ID': invoice.rentalRequest?.customer_id || '',
        'Product Name': invoice.rentalRequest?.product?.title || '',
        'Product Category': invoice.rentalRequest?.product?.category || '',
        'Owner ID': invoice.rentalRequest?.product?.user_id || '',
        'Subtotal': invoice.subtotal,
        'Tax Rate': `${(invoice.tax_rate * 100).toFixed(0)}%`,
        'Tax Amount': invoice.tax_amount,
        'Late Fee': invoice.late_fee,
        'Damage Fee': invoice.damage_fee,
        'Additional Charges': invoice.additional_charges,
        'Total Amount': invoice.amount,
        'Notes': invoice.notes || '',
        'Rental Start Date': invoice.rentalRequest?.start_date ? new Date(invoice.rentalRequest.start_date).toLocaleDateString() : '',
        'Rental End Date': invoice.rentalRequest?.end_date ? new Date(invoice.rentalRequest.end_date).toLocaleDateString() : '',
        'Pickup Location': invoice.rentalRequest?.pickup_location || '',
        'Return Location': invoice.rentalRequest?.return_location || '',
        'Rental Price': invoice.rentalRequest?.price || 0
      }
    ];
  }
  
  /**
   * Prepare invoices data for CSV export
   */
  private static prepareInvoicesCSVData(invoices: Invoice[]): Record<string, unknown>[] {
    return invoices.map(invoice => ({
      'Invoice Number': invoice.invoice_number,
      'Customer ID': invoice.rentalRequest?.customer_id || '',
      'Product Name': invoice.rentalRequest?.product?.title || '',
      'Product Category': invoice.rentalRequest?.product?.category || '',
      'Invoice Date': new Date(invoice.created_at).toLocaleDateString(),
      'Due Date': new Date(invoice.due_date).toLocaleDateString(),
      'Status': invoice.invoice_status,
      'Amount': invoice.amount,
      'Paid Date': invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '',
      'Subtotal': invoice.subtotal,
      'Tax Amount': invoice.tax_amount,
      'Late Fee': invoice.late_fee,
      'Damage Fee': invoice.damage_fee,
      'Additional Charges': invoice.additional_charges
    }));
  }
  
  /**
   * Prepare invoice items data for CSV export
   */
  private static prepareInvoiceItemsCSVData(invoice: Invoice): Record<string, unknown>[] {
    return (invoice.invoiceItems || []).map((item, index) => ({
      'Invoice Number': invoice.invoice_number,
      'Item #': index + 1,
      'Description': item.description,
      'Quantity': item.quantity,
      'Unit Price': item.unit_price,
      'Total Price': item.total_price,
      'Item Type': item.item_type
    }));
  }
  
  /**
   * Convert array of objects to CSV string
   */
  private static convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    const csvHeader = headers.map(header => this.escapeCSVValue(header)).join(',');
    
    // Create CSV data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return this.escapeCSVValue(value);
      }).join(',');
    });
    
    // Combine header and rows
    return [csvHeader, ...csvRows].join('\n');
  }
  
  /**
   * Escape CSV value to handle special characters
   */
  private static escapeCSVValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Convert to string if not already
    const stringValue = String(value);
    
    // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }
}