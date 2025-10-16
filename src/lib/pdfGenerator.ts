import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Invoice } from '@/types/models';

export class PDFGenerator {
  /**
   * Generate a PDF from an HTML element
   */
  static async generatePDFFromElement(elementId: string, filename: string = 'invoice.pdf'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID ${elementId} not found`);
      }

      // Create canvas from HTML element with mobile-responsive settings
      const canvas = await html2canvas(element, {
        scale: window.innerWidth < 768 ? 1.5 : 2, // Lower scale for mobile devices
        useCORS: true,
        allowTaint: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Generate a PDF for an invoice with enhanced features
   */
  static async generateInvoicePDF(
    invoice: Invoice,
    elementId: string,
    options: {
      includeLogo?: boolean;
      logoUrl?: string;
      includeQRCode?: boolean;
      includeTerms?: boolean;
      companyName?: string;
      companyAddress?: string;
      companyContact?: string;
    } = {}
  ): Promise<void> {
    // Since html2canvas can't handle modern CSS (oklch), use basic PDF generation
    console.log('HTML2Canvas not compatible with modern CSS, using basic PDF generation');
    this.generateBasicInvoicePDF(invoice);
  }

  /**
   * Generate a basic PDF as fallback - optimized for single page
   */
  static generateBasicInvoicePDF(invoice: Invoice): void {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4
      const filename = `invoice-${invoice.invoice_number}.pdf`;

      let yPosition = 20; // Starting position

      // Header - Large and prominent
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text('INVOICE', 20, yPosition);
      yPosition += 15;

      // Invoice number and status on same line
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      const statusText = invoice.invoice_status.toUpperCase();
      pdf.text(`#${invoice.invoice_number}`, 20, yPosition);

      // Status with background color
      const pageWidth = pdf.internal.pageSize.getWidth();
      const statusColor = this.getStatusColor(invoice.invoice_status);
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.rect(pageWidth - 60, yPosition - 5, 40, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text(statusText, pageWidth - 55, yPosition);
      yPosition += 20;

      // Date information
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(`Invoice Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, yPosition);
      yPosition += 8;

      if (invoice.invoice_status === 'paid' && invoice.paid_date) {
        pdf.text(`Payment Date: ${new Date(invoice.paid_date).toLocaleDateString()}`, 20, yPosition);
        yPosition += 8;
      }

      // Spacer
      yPosition += 10;

      // Total amount - prominent
      pdf.setFontSize(18);
      pdf.setTextColor(0, 100, 0); // Dark green for total
      pdf.text(`Total Amount: $${invoice.amount.toFixed(2)}`, 20, yPosition);
      yPosition += 20;

      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Terms and notes
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.text('Terms: Payment is due within 30 days of the invoice date.', 20, yPosition);
      yPosition += 6;
      pdf.text('Late payments are subject to a 5% late fee.', 20, yPosition);
      yPosition += 6;
      pdf.text('Please contact support@rentify.com for any questions.', 20, yPosition);
      yPosition += 15;

      // Footer company info
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      const footerY = 280; // Near bottom of page
      pdf.text('Rentify Rental Services', 20, footerY);
      pdf.text('123 Business St, Suite 100, City, Country', 20, footerY + 4);
      pdf.text('support@rentify.com | +1 (555) 123-4567', 20, footerY + 8);

      // Add watermark if needed
      if (invoice.invoice_status === 'paid') {
        this.addWatermark(pdf, 'PAID', 0.05);
      } else if (invoice.invoice_status === 'overdue') {
        this.addWatermark(pdf, 'OVERDUE', 0.05);
      } else if (invoice.invoice_status === 'pending') {
        this.addWatermark(pdf, 'PENDING', 0.1);
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error generating basic PDF:', error);
      throw new Error('Failed to generate basic PDF');
    }
  }

  /**
   * Get color for status
   */
  static getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case 'paid':
        return [46, 204, 113]; // Green
      case 'pending':
        return [241, 196, 15]; // Yellow
      case 'sent':
        return [52, 152, 219]; // Blue
      case 'overdue':
        return [231, 76, 60]; // Red
      case 'cancelled':
        return [149, 165, 166]; // Gray
      default:
        return [149, 165, 166]; // Gray
    }
  }

  /**
   * Add watermark to PDF
   */
  static addWatermark(pdf: jsPDF, text: string, opacity: number = 0.1): void {
    const pageCount = (pdf as any).getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Set font size and calculate text dimensions
      pdf.setFontSize(60);
      const textWidth = pdf.getTextWidth(text);
      
      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate position to center the watermark
      const x = (pageWidth - textWidth) / 2;
      const y = pageHeight / 2;
      
      // Set text color with opacity
      pdf.setTextColor(200, 200, 200);
      
      // Rotate the text for diagonal watermark
      pdf.text(text, x, y, { angle: 45 });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
    }
  }

  /**
   * Add payment status indicator to PDF
   */
  static addPaymentStatusIndicator(pdf: jsPDF, status: string): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Set color based on status
    switch (status) {
      case 'paid':
        pdf.setFillColor(46, 204, 113); // Green
        break;
      case 'pending':
        pdf.setFillColor(241, 196, 15); // Yellow
        break;
      case 'sent':
        pdf.setFillColor(52, 152, 219); // Blue
        break;
      case 'overdue':
        pdf.setFillColor(231, 76, 60); // Red
        break;
      case 'cancelled':
        pdf.setFillColor(149, 165, 166); // Gray
        break;
      default:
        pdf.setFillColor(149, 165, 166); // Gray
    }
    
    // Draw status indicator rectangle
    pdf.rect(pageWidth - 50, 10, 35, 15, 'F');
    
    // Add status text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text(status.toUpperCase(), pageWidth - 48, 20);
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
  }

  /**
   * Add terms and conditions to PDF
   */
  static addTermsAndConditions(pdf: jsPDF): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add a new page for terms and conditions
    pdf.addPage();
    
    // Set title
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Terms and Conditions', 15, 20);
    
    // Add terms content
    pdf.setFontSize(10);
    const terms = [
      '1. Payment is due within 30 days of the invoice date.',
      '2. Late payments are subject to a 5% late fee.',
      '3. All rentals are subject to the terms and conditions agreed upon at the time of booking.',
      '4. The customer is responsible for any damage to the rented item during the rental period.',
      '5. The company is not liable for any loss or damage incurred during the rental period.',
      '6. Cancellations must be made at least 48 hours before the rental start time.',
      '7. Refunds are subject to the company\'s refund policy.',
      '8. The company reserves the right to modify these terms and conditions at any time.'
    ];
    
    let yPosition = 30;
    terms.forEach(term => {
      const lines = pdf.splitTextToSize(term, pageWidth - 30);
      pdf.text(lines, 15, yPosition);
      yPosition += lines.length * 5 + 2;
    });
    
    // Add contact information
    yPosition += 10;
    pdf.text('For questions about these terms, please contact us at:', 15, yPosition);
    yPosition += 5;
    pdf.text('contact@rentify.com | +1 (555) 123-4567', 15, yPosition);
  }

  /**
   * Generate a PDF with barcode or QR code
   */
  static async generateInvoiceWithBarcode(
    invoice: Invoice,
    elementId: string,
    barcodeData: string = invoice.invoice_number,
    options: {
      includeLogo?: boolean;
      logoUrl?: string;
      includeQRCode?: boolean;
      includeTerms?: boolean;
      companyName?: string;
      companyAddress?: string;
      companyContact?: string;
    } = {}
  ): Promise<void> {
    try {
      const filename = `invoice-${invoice.invoice_number}.pdf`;
      
      // First generate the basic PDF
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID ${elementId} not found`);
      }

      const canvas = await html2canvas(element, {
        scale: window.innerWidth < 768 ? 1.5 : 2, // Lower scale for mobile devices
        useCORS: true,
        allowTaint: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Add company logo if requested
      if (options.includeLogo) {
        try {
          const logoImg = new Image();
          logoImg.src = options.logoUrl || '/placeholder-logo.png';
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
          });
          
          const logoCanvas = document.createElement('canvas');
          const logoCtx = logoCanvas.getContext('2d');
          logoCanvas.width = logoImg.width;
          logoCanvas.height = logoImg.height;
          logoCtx?.drawImage(logoImg, 0, 0);
          
          const logoDataUrl = logoCanvas.toDataURL('image/png');
          pdf.addImage(logoDataUrl, 'PNG', 15, 15, 30, 30);
        } catch (error) {
          console.warn('Failed to load logo:', error);
        }
      }
      
      // Add QR code if requested
      if (options.includeQRCode) {
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(barcodeData, {
            width: 100,
            margin: 1
          });
          pdf.addImage(qrCodeDataUrl, 'PNG', 170, 15, 25, 25);
        } catch (error) {
          console.warn('Failed to generate QR code:', error);
        }
      }
      
      // Add barcode at the bottom of the page
      // Note: This is a placeholder. In a real implementation, you would use a barcode library
      // like JsBarcode to generate the barcode image and then add it to the PDF
      pdf.setFontSize(10);
      pdf.text(`Invoice ID: ${barcodeData}`, 15, pageHeight - 10);
      
      // Add company information
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(options.companyName || 'Rentify', 15, pageHeight - 25);
      pdf.text(options.companyAddress || '123 Business St, Suite 100, City, Country', 15, pageHeight - 20);
      pdf.text(options.companyContact || 'contact@rentify.com | +1 (555) 123-4567', 15, pageHeight - 15);
      
      // Add payment status indicator
      this.addPaymentStatusIndicator(pdf, invoice.invoice_status);
      
      // Add terms and conditions if requested
      if (options.includeTerms) {
        this.addTermsAndConditions(pdf);
      }
      
      // Add watermark based on status
      if (invoice.invoice_status === 'paid') {
        this.addWatermark(pdf, 'PAID', 0.05);
      } else if (invoice.invoice_status === 'pending') {
        this.addWatermark(pdf, 'DRAFT', 0.1);
      } else if (invoice.invoice_status === 'overdue') {
        this.addWatermark(pdf, 'OVERDUE', 0.1);
      }
      
      // Save the PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating invoice with barcode:', error);
      throw new Error('Failed to generate invoice with barcode');
    }
  }
}
