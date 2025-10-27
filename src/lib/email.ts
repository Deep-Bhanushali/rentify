import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private initTransporter() {
    if (typeof window === 'undefined' && !this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Using Gmail, can be changed to other providers
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      this.initTransporter();
      if (!this.transporter) {
        throw new Error('Transporter not initialized');
      }

      // Add better error logging
      console.log('Attempting to send email:', {
        to: options.to,
        subject: options.subject,
        from: process.env.EMAIL_USER
      });

      const mailOptions = {
        from: `"Rentify" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });
      return info;
    } catch (error: any) {
      console.error('❌ Error sending email:', {
        error: error.message,
        code: error.code,
        response: error.response,
        to: options.to,
        subject: options.subject
      });

      // Add specific error information
      if (error.code === 'EAUTH') {
        console.error('❌ Email authentication failed - check EMAIL_PASSWORD');
      } else if (error.code === 'ENOTFOUND') {
        console.error('❌ Email server connection failed');
      } else if (error.response) {
        console.error('❌ Email server response:', error.response);
      }

      // Still throw error for proper handling
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // Email templates
  static generateNewRentalRequestEmail(data: {
    recipientName: string;
    customerName: string;
    productTitle: string;
    startDate: string;
    endDate: string;
    productId: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = 'New Rental Request - Action Required';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Rental Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔔 New Rental Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>You have received a new rental request for your product. Here are the details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Rental Details</h3>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Product:</strong> ${data.productTitle}</p>
              <p><strong>Start Date:</strong> ${data.startDate}</p>
              <p><strong>End Date:</strong> ${data.endDate}</p>
            </div>

            <p>Please review and respond to this request as soon as possible. You can approve or reject the request through your dashboard.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${data.rentalRequestId}" class="button">View Request in Dashboard</a>

            <p>If you have any questions about this request, please contact us.</p>

            <div class="footer">
              <p>This email was sent by Rentify. If you didn't expect this email, please ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      New Rental Request

      Hello ${data.recipientName},

      You have received a new rental request for your product:

      Customer: ${data.customerName}
      Product: ${data.productTitle}
      Start Date: ${data.startDate}
      End Date: ${data.endDate}

      Please review this request at: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${data.rentalRequestId}

      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }

  static generateRequestApprovedEmail(data: {
    recipientName: string;
    productTitle: string;
    startDate: string;
    endDate: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = '🎉 Your Rental Request Has Been Approved!';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rental Request Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Good News!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>Congratulations! Your rental request has been approved. Here are the rental details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Rental Details</h3>
              <p><strong>Product:</strong> ${data.productTitle}</p>
              <p><strong>Start Date:</strong> ${data.startDate}</p>
              <p><strong>End Date:</strong> ${data.endDate}</p>
            </div>

            <p>You can now proceed with the payment and pickup arrangements. Check your dashboard for any further instructions.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/rental-requests/${data.rentalRequestId}" class="button">View Request Details</a>

            <p>Enjoy your rental!</p>

            <div class="footer">
              <p>This email was sent by Rentify. Happy renting! 🎪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Rental Request Approved!

      Hello ${data.recipientName},

      Congratulations! Your rental request has been approved.

      Product: ${data.productTitle}
      Start Date: ${data.startDate}
      End Date: ${data.endDate}

      View details at: ${process.env.NEXT_PUBLIC_APP_URL}/rental-requests/${data.rentalRequestId}

      Happy renting!
      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }

  static generateRequestRejectedEmail(data: {
    recipientName: string;
    productTitle: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = 'Rental Request Update';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rental Request Rejected</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rental Request Update</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>We regret to inform you that your rental request has been rejected. Here are the details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Request Details</h3>
              <p><strong>Product:</strong> ${data.productTitle}</p>
            </div>

            <p>This could be due to availability conflicts, scheduling issues, or other reasons. You can explore other rental options or contact the product owner for more information.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/products" class="button">Browse Other Products</a>

            <p>Thank you for your understanding.</p>

            <div class="footer">
              <p>This email was sent by Rentify. If you have any questions, please contact us.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Rental Request Update

      Hello ${data.recipientName},

      We regret to inform you that your rental request has been rejected.

      Product: ${data.productTitle}

      You can browse other products at: ${process.env.NEXT_PUBLIC_APP_URL}/products

      Thank you for your understanding.
      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }

  static generatePaymentCompletedEmail(data: {
    recipientName: string;
    customerName: string;
    productTitle: string;
    amount: number;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = '💰 Payment Received - Product Rented';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💰 Payment Received!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>Great news! We've received payment for your rental. Your product is now rented out. Here are the details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Product:</strong> ${data.productTitle}</p>
              <p><strong>Amount Received:</strong> $${data.amount.toFixed(2)}</p>
            </div>

            <p>Your product is now marked as rented. Please ensure you're prepared for the rental period and have communicated pickup/handover arrangements with your customer.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${data.rentalRequestId}" class="button">View Rental Details</a>

            <p>Thank you for using Rentify!</p>

            <div class="footer">
              <p>This email was sent by Rentify. Happy renting! 🚀</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Payment Received!

      Hello ${data.recipientName},

      Great news! We've received payment for your rental.

      Customer: ${data.customerName}
      Product: ${data.productTitle}
      Amount Received: $${data.amount.toFixed(2)}

      Your product is now rented. View details at: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${data.rentalRequestId}

      Thank you for using Rentify!
    `;

    return { subject, html, text };
  }

  static generatePaymentConfirmedEmail(data: {
    recipientName: string;
    productTitle: string;
    amount: number;
    startDate: string;
    endDate: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = '✅ Payment Confirmed - Enjoy Your Rental!';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Payment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>Your payment has been confirmed! Here are your rental details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Rental Details</h3>
              <p><strong>Product:</strong> ${data.productTitle}</p>
              <p><strong>Amount Paid:</strong> $${data.amount.toFixed(2)}</p>
              <p><strong>Rental Period:</strong> ${data.startDate} to ${data.endDate}</p>
            </div>

            <p>Enjoy your rental! Please make sure to arrange pickup and return according to the agreed terms. You should have received contact information from the product owner.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/rental-requests/${data.rentalRequestId}" class="button">View Your Rental</a>

            <p>If you have any questions about your rental, please don't hesitate to contact us or the product owner.</p>

            <div class="footer">
              <p>This email was sent by Rentify. Happy renting! 🎪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Payment Confirmed!

      Hello ${data.recipientName},

      Your payment has been confirmed!

      Product: ${data.productTitle}
      Amount Paid: $${data.amount.toFixed(2)}
      Rental Period: ${data.startDate} to ${data.endDate}

      Enjoy your rental!
      View details at: ${process.env.NEXT_PUBLIC_APP_URL}/rental-requests/${data.rentalRequestId}

      Happy renting!
      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }

  static generateReturnInitiatedEmail(data: {
    recipientName: string;
    customerName: string;
    productTitle: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = 'Return Initiated - Review Required';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Return Initiated</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📦 Return Initiated</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>A return has been initiated for one of your products. Here are the details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Return Details</h3>
              <p><strong>Customer:</strong> ${data.customerName}</p>
              <p><strong>Product:</strong> ${data.productTitle}</p>
            </div>

            <p>Please review the return details and confirm the return when you receive the product. Once confirmed, the customer will be notified and the product will be available for rent again.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/returns/${data.rentalRequestId}" class="button">Review Return Request</a>

            <p>If you have any questions about this return, please contact the customer directly.</p>

            <div class="footer">
              <p>This email was sent by Rentify. Happy renting! 🎪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Return Initiated

      Hello ${data.recipientName},

      A return has been initiated for your product. Here are the details:

      Customer: ${data.customerName}
      Product: ${data.productTitle}

      Please review and confirm the return at: ${process.env.NEXT_PUBLIC_APP_URL}/returns/${data.rentalRequestId}

      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }

  static generateReturnConfirmedEmail(data: {
    recipientName: string;
    productTitle: string;
    returnDate: string;
    rentalRequestId: string;
  }): { subject: string; html: string; text: string } {
    const subject = '🏠 Return Confirmed - Product Available Again';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Return Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏠 Return Confirmed</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>Your return has been confirmed and your product is available for rent again. Here are the details:</p>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #333;">Return Details</h3>
              <p><strong>Product:</strong> ${data.productTitle}</p>
              <p><strong>Return Date:</strong> ${data.returnDate}</p>
            </div>

            <p>Thank you for returning the product in good condition. Your product is now listed as available and can receive new rental requests.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products" class="button">View Your Products</a>

            <p>Thank you for using Rentify! We hope you had a great rental experience.</p>

            <div class="footer">
              <p>This email was sent by Rentify. See you on your next rental! 🎪</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Return Confirmed!

      Hello ${data.recipientName},

      Your return has been confirmed.

      Product: ${data.productTitle}
      Return Date: ${data.returnDate}

      Your product is now available for rent again.
      View your products at: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products

      Thank you for using Rentify!
    `;

    return { subject, html, text };
  }

  static generateInvoiceEmail(data: {
    recipientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    productTitle: string;
    rentalPeriod: string;
    invoiceId: string;
  }): { subject: string; html: string; text: string } {
    const subject = `Invoice ${data.invoiceNumber} from Rentify`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice - ${data.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .highlight { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .invoice-details { border: 1px solid #e1e5e9; border-radius: 6px; overflow: hidden; margin: 20px 0; }
            .invoice-header { background: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #e1e5e9; }
            .invoice-body { padding: 15px; }
            .total { font-size: 18px; font-weight: bold; color: #28a745; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 Invoice - ${data.invoiceNumber}</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>

            <p>Please find attached your invoice from Rentify. Here are the details:</p>

            <div class="invoice-details">
              <div class="invoice-header">
                <h3 style="margin: 0; color: #333;">Invoice Summary</h3>
              </div>
              <div class="invoice-body">
                <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
                <p><strong>Product:</strong> ${data.productTitle}</p>
                <p><strong>Rental Period:</strong> ${data.rentalPeriod}</p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
                <p class="total"><strong>Total Amount:</strong> $${data.amount.toFixed(2)}</p>
              </div>
            </div>

            <p>For your records, this invoice can be downloaded from your Rentify dashboard.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/invoices/${data.invoiceId}" class="button">View Invoice Online</a>

            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

            <div class="footer">
              <p>This email was sent by Rentify. If you didn't expect this email, please ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Invoice ${data.invoiceNumber} from Rentify

      Hello ${data.recipientName},

      Please find attached your invoice. Here are the details:

      Invoice Number: ${data.invoiceNumber}
      Product: ${data.productTitle}
      Rental Period: ${data.rentalPeriod}
      Due Date: ${data.dueDate}
      Total Amount: $${data.amount.toFixed(2)}

      View invoice online: ${process.env.NEXT_PUBLIC_APP_URL}/invoices/${data.invoiceId}

      If you have any questions, please contact us.

      This email was sent by Rentify.
    `;

    return { subject, html, text };
  }
}

// Export singleton instance
export const emailService = new EmailService();
export { EmailService };
