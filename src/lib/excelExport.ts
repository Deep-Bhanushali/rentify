import * as XLSX from 'xlsx';
import { Invoice } from '@/types/models';

export class ExcelExport {
  /**
   * Export a single invoice to Excel format and return as buffer
   */
  static async exportInvoiceToExcelBuffer(
    invoice: Invoice,
    options: {
      includeCharts?: boolean;
      companyName?: string;
      includeMultipleWorksheets?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      const {
        includeCharts = true,
        companyName = 'Rentify',
        includeMultipleWorksheets = true
      } = options;
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create invoice details worksheet
      const invoiceDetailsData = this.prepareInvoiceDetailsData(invoice, companyName);
      const invoiceDetailsWorksheet = XLSX.utils.json_to_sheet(invoiceDetailsData);
      
      // Format the invoice details worksheet
      this.formatInvoiceDetailsWorksheet(invoiceDetailsWorksheet);
      
      // Add the invoice details worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, invoiceDetailsWorksheet, 'Invoice Details');
      
      if (includeMultipleWorksheets) {
        // Create invoice items worksheet
        const invoiceItemsData = this.prepareInvoiceItemsData(invoice);
        const invoiceItemsWorksheet = XLSX.utils.json_to_sheet(invoiceItemsData);
        
        // Format the invoice items worksheet
        this.formatInvoiceItemsWorksheet(invoiceItemsWorksheet);
        
        // Add the invoice items worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, invoiceItemsWorksheet, 'Invoice Items');
        
        // Create rental details worksheet
        const rentalDetailsData = this.prepareRentalDetailsData(invoice);
        const rentalDetailsWorksheet = XLSX.utils.json_to_sheet(rentalDetailsData);
        
        // Format the rental details worksheet
        this.formatRentalDetailsWorksheet(rentalDetailsWorksheet);
        
        // Add the rental details worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, rentalDetailsWorksheet, 'Rental Details');
        
        // Create payment details worksheet
        const paymentDetailsData = this.preparePaymentDetailsData(invoice);
        const paymentDetailsWorksheet = XLSX.utils.json_to_sheet(paymentDetailsData);
        
        // Format the payment details worksheet
        this.formatPaymentDetailsWorksheet(paymentDetailsWorksheet);
        
        // Add the payment details worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, paymentDetailsWorksheet, 'Payment Details');
        
        // Create summary worksheet
        const summaryData = this.prepareSummaryData(invoice);
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
        
        // Format the summary worksheet
        this.formatSummaryWorksheet(summaryWorksheet);
        
        // Add the summary worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      }
      
      // Generate Excel file as buffer
      const buffer = XLSX.write(workbook, { type: 'buffer' });
      return buffer as Buffer;
    } catch (error) {
      console.error('Error exporting invoice to Excel:', error);
      throw new Error('Failed to export invoice to Excel');
    }
  }
  
  /**
   * Export multiple invoices to Excel format
   */
  static async exportInvoicesToExcel(
    invoices: Invoice[],
    options: {
      includeCharts?: boolean;
      companyName?: string;
      includeMultipleWorksheets?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const {
        includeCharts = true,
        companyName = 'Rentify',
        includeMultipleWorksheets = true
      } = options;
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create invoices list worksheet
      const invoicesListData = this.prepareInvoicesListData(invoices);
      const invoicesListWorksheet = XLSX.utils.json_to_sheet(invoicesListData);
      
      // Format the invoices list worksheet
      this.formatInvoicesListWorksheet(invoicesListWorksheet);
      
      // Add the invoices list worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, invoicesListWorksheet, 'Invoices List');
      
      // Create summary statistics worksheet
      const summaryStatsData = this.prepareSummaryStatsData(invoices);
      const summaryStatsWorksheet = XLSX.utils.json_to_sheet(summaryStatsData);
      
      // Format the summary statistics worksheet
      this.formatSummaryStatsWorksheet(summaryStatsWorksheet);
      
      // Add the summary statistics worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, summaryStatsWorksheet, 'Summary Statistics');
      
      // Generate Excel file and trigger download
      const filename = `invoices-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting invoices to Excel:', error);
      throw new Error('Failed to export invoices to Excel');
    }
  }
  
  /**
   * Prepare invoice details data for Excel export
   */
  private static prepareInvoiceDetailsData(invoice: Invoice, companyName: string): any[] {
    return [
      { Field: 'Company Name', Value: companyName },
      { Field: 'Invoice Number', Value: invoice.invoice_number },
      { Field: 'Invoice Status', Value: invoice.invoice_status },
      { Field: 'Invoice Date', Value: new Date(invoice.created_at).toLocaleDateString() },
      { Field: 'Due Date', Value: new Date(invoice.due_date).toLocaleDateString() },
      { Field: 'Paid Date', Value: invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A' },
      { Field: 'Customer ID', Value: invoice.rentalRequest?.customer_id || 'N/A' },
      { Field: 'Product Name', Value: invoice.rentalRequest?.product?.title || 'N/A' },
      { Field: 'Product Category', Value: invoice.rentalRequest?.product?.category || 'N/A' },
      { Field: 'Owner Name', Value: invoice.rentalRequest?.product?.user?.name || 'N/A' },
      { Field: 'Owner Email', Value: invoice.rentalRequest?.product?.user?.email || 'N/A' },
      { Field: 'Subtotal', Value: invoice.subtotal },
      { Field: 'Tax Rate', Value: `${(invoice.tax_rate * 100).toFixed(0)}%` },
      { Field: 'Tax Amount', Value: invoice.tax_amount },
      { Field: 'Late Fee', Value: invoice.late_fee },
      { Field: 'Damage Fee', Value: invoice.damage_fee },
      { Field: 'Additional Charges', Value: invoice.additional_charges },
      { Field: 'Total Amount', Value: invoice.amount },
      { Field: 'Notes', Value: invoice.notes || 'N/A' }
    ];
  }
  
  /**
   * Prepare invoice items data for Excel export
   */
  private static prepareInvoiceItemsData(invoice: Invoice): any[] {
    return (invoice.invoiceItems || []).map((item, index) => ({
      'Item #': index + 1,
      'Description': item.description,
      'Quantity': item.quantity,
      'Unit Price': item.unit_price,
      'Total Price': item.total_price,
      'Item Type': item.item_type
    }));
  }
  
  /**
   * Prepare rental details data for Excel export
   */
  private static prepareRentalDetailsData(invoice: Invoice): any[] {
    return [
      { Field: 'Start Date', Value: invoice.rentalRequest?.start_date ? new Date(invoice.rentalRequest.start_date).toLocaleDateString() : 'N/A' },
      { Field: 'End Date', Value: invoice.rentalRequest?.end_date ? new Date(invoice.rentalRequest.end_date).toLocaleDateString() : 'N/A' },
      { Field: 'Rental Duration (Days)', Value: invoice.rentalRequest?.start_date && invoice.rentalRequest?.end_date ? this.calculateRentalDuration(invoice.rentalRequest.start_date, invoice.rentalRequest.end_date) : 'N/A' },
      { Field: 'Pickup Location', Value: invoice.rentalRequest?.pickup_location || 'N/A' },
      { Field: 'Return Location', Value: invoice.rentalRequest?.return_location || 'N/A' },
      { Field: 'Daily Rate', Value: invoice.rentalRequest?.price || 'N/A' }
    ];
  }
  
  /**
   * Prepare payment details data for Excel export
   */
  private static preparePaymentDetailsData(invoice: Invoice): any[] {
    return [
      { Field: 'Payment Status', Value: invoice.invoice_status },
      { Field: 'Payment Status', Value: invoice.invoice_status },
      { Field: 'Payment Date', Value: invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A' }
    ];
  }
  
  /**
   * Prepare summary data for Excel export
   */
  private static prepareSummaryData(invoice: Invoice): any[] {
    return [
      { Metric: 'Total Invoices', Value: 1 },
      { Metric: 'Total Revenue', Value: invoice.invoice_status === 'paid' ? invoice.amount : 0 },
      { Metric: 'Outstanding Amount', Value: invoice.invoice_status !== 'paid' ? invoice.amount : 0 },
      { Metric: 'Tax Collected', Value: invoice.invoice_status === 'paid' ? invoice.tax_amount : 0 },
      { Metric: 'Late Fees', Value: invoice.late_fee },
      { Metric: 'Damage Fees', Value: invoice.damage_fee },
      { Metric: 'Additional Charges', Value: invoice.additional_charges }
    ];
  }
  
  /**
   * Prepare invoices list data for Excel export
   */
  private static prepareInvoicesListData(invoices: Invoice[]): any[] {
    return invoices.map(invoice => ({
      'Invoice Number': invoice.invoice_number,
      'Customer ID': invoice.rentalRequest?.customer_id || 'N/A',
      'Product Name': invoice.rentalRequest?.product?.title || 'N/A',
      'Invoice Date': new Date(invoice.created_at).toLocaleDateString(),
      'Due Date': new Date(invoice.due_date).toLocaleDateString(),
      'Status': invoice.invoice_status,
      'Amount': invoice.amount,
      'Paid Date': invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : 'N/A'
    }));
  }
  
  /**
   * Prepare summary statistics data for Excel export
   */
  private static prepareSummaryStatsData(invoices: Invoice[]): any[] {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.invoice_status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => inv.invoice_status === 'pending' || inv.invoice_status === 'sent').length;
    const overdueInvoices = invoices.filter(inv => inv.invoice_status === 'overdue').length;
    
    const totalRevenue = invoices
      .filter(inv => inv.invoice_status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
      
    const outstandingAmount = invoices
      .filter(inv => inv.invoice_status !== 'paid' && inv.invoice_status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.amount, 0);
      
    const totalTaxCollected = invoices
      .filter(inv => inv.invoice_status === 'paid')
      .reduce((sum, inv) => sum + inv.tax_amount, 0);
      
    const totalLateFees = invoices.reduce((sum, inv) => sum + inv.late_fee, 0);
    const totalDamageFees = invoices.reduce((sum, inv) => sum + inv.damage_fee, 0);
    const totalAdditionalCharges = invoices.reduce((sum, inv) => sum + inv.additional_charges, 0);
    
    return [
      { Metric: 'Total Invoices', Value: totalInvoices },
      { Metric: 'Paid Invoices', Value: paidInvoices },
      { Metric: 'Pending Invoices', Value: pendingInvoices },
      { Metric: 'Overdue Invoices', Value: overdueInvoices },
      { Metric: 'Total Revenue', Value: totalRevenue },
      { Metric: 'Outstanding Amount', Value: outstandingAmount },
      { Metric: 'Total Tax Collected', Value: totalTaxCollected },
      { Metric: 'Total Late Fees', Value: totalLateFees },
      { Metric: 'Total Damage Fees', Value: totalDamageFees },
      { Metric: 'Total Additional Charges', Value: totalAdditionalCharges }
    ];
  }
  
  /**
   * Calculate rental duration in days
   */
  private static calculateRentalDuration(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Format invoice details worksheet
   */
  private static formatInvoiceDetailsWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Field column
      { wch: 30 }  // Value column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:B1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
  }
  
  /**
   * Format invoice items worksheet
   */
  private static formatInvoiceItemsWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, // Item # column
      { wch: 40 }, // Description column
      { wch: 10 }, // Quantity column
      { wch: 15 }, // Unit Price column
      { wch: 15 }, // Total Price column
      { wch: 15 }  // Item Type column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:F1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
    
    // Format currency columns
    const currencyColumns = [3, 4]; // Unit Price and Total Price columns (0-indexed)
    const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = dataRange.s.r + 1; R <= dataRange.e.r; ++R) {
      for (const C of currencyColumns) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Format as currency
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          numFmt: '"$"#,##0.00'
        };
        
        // Convert to number if it's a string
        if (typeof worksheet[cellAddress].v === 'string') {
          worksheet[cellAddress].v = parseFloat(worksheet[cellAddress].v);
          worksheet[cellAddress].t = 'n';
        }
      }
    }
  }
  
  /**
   * Format rental details worksheet
   */
  private static formatRentalDetailsWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Field column
      { wch: 30 }  // Value column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:B1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
  }
  
  /**
   * Format payment details worksheet
   */
  private static formatPaymentDetailsWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Field column
      { wch: 30 }  // Value column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:B1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
  }
  
  /**
   * Format summary worksheet
   */
  private static formatSummaryWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Metric column
      { wch: 15 }  // Value column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:B1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
    
    // Format currency columns
    const currencyColumn = 1; // Value column (0-indexed)
    const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = dataRange.s.r + 1; R <= dataRange.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: currencyColumn });
      if (!worksheet[cellAddress]) continue;
      
      // Format as currency
      worksheet[cellAddress].s = {
        ...worksheet[cellAddress].s,
        numFmt: '"$"#,##0.00'
      };
      
      // Convert to number if it's a string
      if (typeof worksheet[cellAddress].v === 'string') {
        worksheet[cellAddress].v = parseFloat(worksheet[cellAddress].v);
        worksheet[cellAddress].t = 'n';
      }
    }
  }
  
  /**
   * Format invoices list worksheet
   */
  private static formatInvoicesListWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Invoice Number column
      { wch: 25 }, // Customer Name column
      { wch: 30 }, // Product Name column
      { wch: 15 }, // Invoice Date column
      { wch: 15 }, // Due Date column
      { wch: 15 }, // Status column
      { wch: 15 }, // Amount column
      { wch: 15 }  // Paid Date column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:H1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
    
    // Format currency columns
    const currencyColumn = 6; // Amount column (0-indexed)
    const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = dataRange.s.r + 1; R <= dataRange.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: currencyColumn });
      if (!worksheet[cellAddress]) continue;
      
      // Format as currency
      worksheet[cellAddress].s = {
        ...worksheet[cellAddress].s,
        numFmt: '"$"#,##0.00'
      };
      
      // Convert to number if it's a string
      if (typeof worksheet[cellAddress].v === 'string') {
        worksheet[cellAddress].v = parseFloat(worksheet[cellAddress].v);
        worksheet[cellAddress].t = 'n';
      }
    }
  }
  
  /**
   * Format summary statistics worksheet
   */
  private static formatSummaryStatsWorksheet(worksheet: XLSX.WorkSheet): void {
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Metric column
      { wch: 15 }  // Value column
    ];
    
    // Apply styling to header row
    const headerRange = XLSX.utils.decode_range('A1:B1');
    for (let R = headerRange.s.r; R <= headerRange.e.r; ++R) {
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        // Make header bold
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E3F2FD" } },
          alignment: { horizontal: "center" }
        };
      }
    }
    
    // Format currency columns
    const currencyColumn = 1; // Value column (0-indexed)
    const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = dataRange.s.r + 1; R <= dataRange.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: currencyColumn });
      if (!worksheet[cellAddress]) continue;
      
      // Format as currency
      worksheet[cellAddress].s = {
        ...worksheet[cellAddress].s,
        numFmt: '"$"#,##0.00'
      };
      
      // Convert to number if it's a string
      if (typeof worksheet[cellAddress].v === 'string') {
        worksheet[cellAddress].v = parseFloat(worksheet[cellAddress].v);
        worksheet[cellAddress].t = 'n';
      }
    }
  }
}
