import { PrismaClient } from '@prisma/client';
import { emailService, EmailService } from './email';

const prisma = new PrismaClient();

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  rentalRequestId?: string;
  data?: Record<string, any>;
}

export class NotificationService {

  // Create a new notification
  static async createNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          rentalRequestId: data.rentalRequestId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data ? JSON.stringify(data.data) : null,
        },
      });
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notification for new rental request
  static async notifyNewRentalRequest(rentalRequest: any) {
    try {
      // Notify the product owner
      await this.createNotification({
        userId: rentalRequest.product.user_id,
        type: 'new_request',
        title: 'New Rental Request',
        message: `${rentalRequest.customer.name} has requested to rent your ${rentalRequest.product.title}`,
        rentalRequestId: rentalRequest.id,
        data: {
          customerName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          startDate: rentalRequest.start_date,
          endDate: rentalRequest.end_date,
        },
      });

      // Send email to product owner
      try {
        const emailData = EmailService.generateNewRentalRequestEmail({
          recipientName: rentalRequest.product.user.name,
          customerName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          startDate: new Date(rentalRequest.start_date).toLocaleDateString(),
          endDate: new Date(rentalRequest.end_date).toLocaleDateString(),
          productId: rentalRequest.product_id,
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.product.user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending new request email:', emailError);
      }
    } catch (error) {
      console.error('Error creating new request notification:', error);
    }
  }

  // Create notification for request approval
  static async notifyRequestApproved(rentalRequest: any) {
    try {
      // Notify the customer
      await this.createNotification({
        userId: rentalRequest.customer_id,
        type: 'approved',
        title: 'Rental Request Approved',
        message: `Your rental request for ${rentalRequest.product.title} has been approved`,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: rentalRequest.product.title,
          startDate: rentalRequest.start_date,
          endDate: rentalRequest.end_date,
        },
      });

      // Send email to customer
      try {
        const emailData = EmailService.generateRequestApprovedEmail({
          recipientName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          startDate: new Date(rentalRequest.start_date).toLocaleDateString(),
          endDate: new Date(rentalRequest.end_date).toLocaleDateString(),
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.customer.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }
    } catch (error) {
      console.error('Error creating approval notification:', error);
    }
  }

  // Create notification for request rejection
  static async notifyRequestRejected(rentalRequest: any) {
    try {
      // Notify the customer
      await this.createNotification({
        userId: rentalRequest.customer_id,
        type: 'rejected',
        title: 'Rental Request Rejected',
        message: `Your rental request for ${rentalRequest.product.title} has been rejected`,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: rentalRequest.product.title,
        },
      });

      // Send email to customer
      try {
        const emailData = EmailService.generateRequestRejectedEmail({
          recipientName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.customer.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
      }
    } catch (error) {
      console.error('Error creating rejection notification:', error);
    }
  }

  // Create notification for payment completion (to product owner)
  static async notifyPaymentCompleted(payment: any) {
    try {
      // Notify the product owner
      await this.createNotification({
        userId: payment.rentalRequest.product.user_id,
        type: 'payment_completed',
        title: 'Payment Received',
        message: `Payment received for ${payment.rentalRequest.product.title}. Product is now rented.`,
        rentalRequestId: payment.rental_request_id,
        data: {
          productTitle: payment.rentalRequest.product.title,
          customerName: payment.rentalRequest.customer.name,
          amount: payment.amount,
        },
      });

      // Send email to product owner
      try {
        const emailData = EmailService.generatePaymentCompletedEmail({
          recipientName: payment.rentalRequest.product.user.name,
          customerName: payment.rentalRequest.customer.name,
          productTitle: payment.rentalRequest.product.title,
          amount: payment.amount,
          rentalRequestId: payment.rental_request_id,
        });

        await emailService.sendEmail({
          to: payment.rentalRequest.product.user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending payment completion email:', emailError);
      }
    } catch (error) {
      console.error('Error creating payment completion notification:', error);
    }
  }

  // Create notification for payment confirmation (to customer)
  static async notifyCustomerPaymentConfirmed(payment: any) {
    try {
      // Notify the customer
      await this.createNotification({
        userId: payment.rentalRequest.customer_id,
        type: 'payment_confirmed',
        title: 'Payment Confirmed',
        message: `Your payment for ${payment.rentalRequest.product.title} has been confirmed. Enjoy your rental!`,
        rentalRequestId: payment.rental_request_id,
        data: {
          productTitle: payment.rentalRequest.product.title,
          amount: payment.amount,
          startDate: payment.rentalRequest.start_date,
          endDate: payment.rentalRequest.end_date,
        },
      });

      // Send email to customer
      try {
        const emailData = EmailService.generatePaymentConfirmedEmail({
          recipientName: payment.rentalRequest.customer.name,
          productTitle: payment.rentalRequest.product.title,
          amount: payment.amount,
          startDate: new Date(payment.rentalRequest.start_date).toLocaleDateString(),
          endDate: new Date(payment.rentalRequest.end_date).toLocaleDateString(),
          rentalRequestId: payment.rental_request_id,
        });

        await emailService.sendEmail({
          to: payment.rentalRequest.customer.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Error creating payment confirmation notification:', error);
    }
  }

  // Create notification for return confirmation (to customer)
  static async notifyReturnConfirmed(rentalRequest: any) {
    try {
      // Notify the customer
      await this.createNotification({
        userId: rentalRequest.customer_id,
        type: 'return_confirmed',
        title: 'Return Confirmed',
        message: `Your return for ${rentalRequest.product.title} has been confirmed. Product is now available for rent again.`,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: rentalRequest.product.title,
          returnDate: rentalRequest.productReturn?.return_date || new Date(),
        },
      });

      // Send email to customer
      try {
        const emailData = EmailService.generateReturnConfirmedEmail({
          recipientName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          returnDate: new Date(rentalRequest.productReturn?.return_date || new Date()).toLocaleDateString(),
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.customer.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending return confirmation email:', emailError);
      }
    } catch (error) {
      console.error('Error creating return confirmation notification:', error);
    }
  }

  // Create notification for invoice emailed (to recipient)
  static async notifyInvoiceEmailed(invoice: any, recipientEmail: string) {
    try {
      // Determine the recipient user ID based on whether the sender is owner or customer
      // Since invoice.email.ts can't access auth context, we'll need to check both scenarios
      let recipientUserId: string | null = null;
      let recipientName: string = '';

      // Check if customer is emailing
      const customer = invoice.rentalRequest.customer;
      if (customer.email === recipientEmail) {
        recipientUserId = customer.id;
        recipientName = customer.name;
      } else {
        // Owner is emailing, customer receives notification
        recipientUserId = customer.id;
        recipientName = customer.name;
      }

      if (recipientUserId) {
        // Notify the recipient
        await this.createNotification({
          userId: recipientUserId,
          type: 'invoice_emailed',
          title: 'Invoice Sent',
          message: `Invoice ${invoice.invoice_number} has been sent to your email.`,
          rentalRequestId: invoice.rental_request_id,
          data: {
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            recipientEmail: recipientEmail,
            productTitle: invoice.rentalRequest.product.title,
          },
        });

        // Send email to the recipient
        try {
          const rentalPeriod = `${new Date(invoice.rentalRequest.start_date).toLocaleDateString()} - ${new Date(invoice.rentalRequest.end_date).toLocaleDateString()}`;

          const emailData = EmailService.generateInvoiceEmail({
            recipientName: recipientName,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            dueDate: new Date(invoice.due_date).toLocaleDateString(),
            productTitle: invoice.rentalRequest.product.title,
            rentalPeriod: rentalPeriod,
            invoiceId: invoice.id,
          });

          await emailService.sendEmail({
            to: recipientEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });
        } catch (emailError) {
          console.error('Error sending invoice email:', emailError);
          throw emailError; // Re-throw to be caught by caller
        }
      }
    } catch (error) {
      console.error('Error creating invoice emailed notification:', error);
      throw error; // Re-throw to be caught by caller
    }
  }

  // Create notification for conflicting request rejection
  static async notifyConflictingRequestRejected(rentalRequest: any) {
    try {
      // Notify the customer that their request was rejected due to date conflict
      await this.createNotification({
        userId: rentalRequest.customer_id,
        type: 'conflicting_rejected',
        title: 'Rental Request Cancelled - Date Conflict',
        message: `Your rental request for ${rentalRequest.product?.title || 'the product'} has been cancelled because the requested dates are no longer available.`,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: rentalRequest.product?.title || 'Product',
          originalStartDate: rentalRequest.start_date,
          originalEndDate: rentalRequest.end_date,
          reason: 'date_conflict'
        },
      });

      // Send email to customer
      try {
        const emailData = EmailService.generateRequestRejectedEmail({
          recipientName: rentalRequest.customer.name,
          productTitle: rentalRequest.product?.title || 'Product',
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.customer.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending conflicting rejection email:', emailError);
      }
    } catch (error) {
      console.error('Error creating conflicting rejection notification:', error);
    }
  }

  // Get notification count for user
  static async getNotificationCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });
      return count;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }
}
