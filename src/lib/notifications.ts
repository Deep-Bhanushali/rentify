import { PrismaClient } from '@prisma/client';
import { emailService, EmailService } from './email';
import { getUserRoom } from './config';

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
        include: {
          rentalRequest: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  rental_price: true
                }
              }
            }
          }
        }
      });

      // Emit real-time notification via Socket.IO
      try {
        if (typeof global !== 'undefined' && global.io) {
          global.io.to(getUserRoom(data.userId)).emit('new-notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: false,
            createdAt: notification.createdAt.toISOString(),
            rentalRequest: notification.rentalRequest ? {
              id: notification.rentalRequest.id,
              product: {
                title: notification.rentalRequest.product.title
              }
            } : undefined
          });
        }
      } catch (socketError) {
        console.warn('Failed to emit socket notification:', socketError);
      }

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

  // Create notification for return initiation (to product owner)
  static async notifyReturnInitiated(rentalRequest: any) {
    try {
      // Notify the product owner
      await this.createNotification({
        userId: rentalRequest.product.user_id,
        type: 'return_initiated',
        title: 'Return Initiated',
        message: `${rentalRequest.customer.name} has initiated a return for ${rentalRequest.product.title}. Please review and confirm the return.`,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: rentalRequest.product.title,
          customerName: rentalRequest.customer.name,
          returnDate: new Date(),
        },
      });

      // Send email to product owner
      try {
        const emailData = EmailService.generateReturnInitiatedEmail({
          recipientName: rentalRequest.product.user.name,
          customerName: rentalRequest.customer.name,
          productTitle: rentalRequest.product.title,
          rentalRequestId: rentalRequest.id,
        });

        await emailService.sendEmail({
          to: rentalRequest.product.user.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Error sending return initiated email:', emailError);
      }
    } catch (error) {
      console.error('Error creating return initiated notification:', error);
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

  // Create notification for rental request status updates (accepted, rejected, cancelled)
  static async notifyRentalRequestStatusUpdate(rentalRequest: any, oldStatus: string, newStatus: string) {
    try {
      const { customer, product } = rentalRequest;

      // Determine notification type and message based on new status
      let notificationType: string;
      let title: string;
      let message: string;
      let userId: string;
      let shouldEmail = false;

      if (newStatus === 'accepted') {
        notificationType = 'approved';
        title = 'Rental Request Approved';
        message = `Your rental request for ${product.title} has been approved by the owner`;
        userId = customer.id;
        shouldEmail = true;
      } else if (newStatus === 'rejected') {
        notificationType = 'rejected';
        title = 'Rental Request Rejected';
        message = `Your rental request for ${product.title} has been rejected by the owner`;
        userId = customer.id;
        shouldEmail = true;
      } else if (newStatus === 'cancelled') {
        notificationType = 'cancelled';
        title = 'Rental Request Cancelled';
        message = `Your rental request for ${product.title} has been cancelled`;
        userId = customer.id;
        shouldEmail = true;
      } else if (newStatus === 'returned') {
        notificationType = 'returned';
        title = 'Return Confirmed';
        message = `Your return for ${product.title} has been confirmed. The product is now available for rent again.`;
        userId = customer.id;
        shouldEmail = true;
      } else if (newStatus === 'completed') {
        notificationType = 'completed';
        title = 'Rental Completed';
        message = `Your rental for ${product.title} has been marked as completed`;
        userId = customer.id;
        shouldEmail = true;
      } else {
        return; // Don't create notification for other status changes
      }

      // Create notification for customer
      await this.createNotification({
        userId,
        type: notificationType,
        title,
        message,
        rentalRequestId: rentalRequest.id,
        data: {
          productTitle: product.title,
          productId: product.id,
          oldStatus,
          newStatus,
          startDate: rentalRequest.start_date,
          endDate: rentalRequest.end_date,
          updatedAt: new Date(),
        },
      });

      // Also notify product owner about status changes
      if (oldStatus !== newStatus) {
        const ownerNotificationType = `customer_${newStatus}`;
        let ownerTitle: string;
        let ownerMessage: string;

        if (newStatus === 'accepted') {
          ownerTitle = 'Request Accepted by Customer';
          ownerMessage = `${customer.name} has accepted your rental offer for ${product.title}`;
        } else if (newStatus === 'rejected') {
          ownerTitle = 'Request Rejected by Customer';
          ownerMessage = `${customer.name} has rejected your rental offer for ${product.title}`;
        } else if (newStatus === 'cancelled') {
          ownerTitle = 'Request Cancelled by Customer';
          ownerMessage = `${customer.name} has cancelled their rental request for ${product.title}`;
        } else if (newStatus === 'returned') {
          ownerTitle = 'Product Returned by Customer';
          ownerMessage = `${customer.name} has returned your product ${product.title}`;
        } else if (newStatus === 'completed') {
          ownerTitle = 'Rental Completed by Customer';
          ownerMessage = `${customer.name} has marked the rental for ${product.title} as completed`;
        } else {
          return;
        }

        await this.createNotification({
          userId: product.user_id,
          type: ownerNotificationType,
          title: ownerTitle,
          message: ownerMessage,
          rentalRequestId: rentalRequest.id,
          data: {
            customerName: customer.name,
            customerId: customer.id,
            productTitle: product.title,
            productId: product.id,
            oldStatus,
            newStatus,
            startDate: rentalRequest.start_date,
            endDate: rentalRequest.end_date,
            updatedAt: new Date(),
          },
        });
      }

      // Send email if required
      if (shouldEmail) {
        try {
          let emailData;
          if (newStatus === 'accepted') {
            emailData = EmailService.generateRequestApprovedEmail({
              recipientName: customer.name,
              productTitle: product.title,
              startDate: new Date(rentalRequest.start_date).toLocaleDateString(),
              endDate: new Date(rentalRequest.end_date).toLocaleDateString(),
              rentalRequestId: rentalRequest.id,
            });
          } else if (newStatus === 'rejected') {
            emailData = EmailService.generateRequestRejectedEmail({
              recipientName: customer.name,
              productTitle: product.title,
              rentalRequestId: rentalRequest.id,
            });
          }
          // Add more email cases as needed

          if (emailData) {
            await emailService.sendEmail({
              to: customer.email,
              subject: emailData.subject,
              html: emailData.html,
              text: emailData.text,
            });
          }
        } catch (emailError) {
          console.error('Error sending status update email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error creating rental request status update notification:', error);
    }
  }

  // Create notification for payment status updates
  static async notifyPaymentStatusUpdate(payment: any, oldStatus: string, newStatus: string) {
    try {
      const { rentalRequest } = payment;
      const { customer, product } = rentalRequest;

      // Determine notification details based on new status
      let notificationType: string;
      let title: string;
      let message: string;
      let userId: string;

      if (newStatus === 'completed') {
        // Notify product owner
        notificationType = 'payment_received';
        title = 'Payment Received';
        message = `Payment of $${payment.amount} received for ${product.title} rental`;
        userId = product.user_id;
      } else if (newStatus === 'failed') {
        // Notify customer
        notificationType = 'payment_failed';
        title = 'Payment Failed';
        message = `Your payment for ${product.title} rental has failed. Please try again.`;
        userId = customer.id;
      } else if (newStatus === 'pending') {
        // Notify customer
        notificationType = 'payment_pending';
        title = 'Payment Processing';
        message = `Your payment for ${product.title} rental is being processed`;
        userId = customer.id;
      } else if (newStatus === 'refunded') {
        // Notify customer
        notificationType = 'payment_refunded';
        title = 'Payment Refunded';
        message = `Your payment of $${payment.amount} for ${product.title} rental has been refunded`;
        userId = customer.id;
      } else {
        return; // Don't notify for other statuses
      }

      await this.createNotification({
        userId,
        type: notificationType,
        title,
        message,
        rentalRequestId: payment.rental_request_id,
        data: {
          productTitle: product.title,
          amount: payment.amount,
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          oldStatus,
          newStatus,
          updatedAt: new Date(),
        },
      });

    } catch (error) {
      console.error('Error creating payment status update notification:', error);
    }
  }

  // Create notification for invoice status updates
  static async notifyInvoiceStatusUpdate(invoice: any, oldStatus: string, newStatus: string) {
    try {
      const { rentalRequest } = invoice;
      const { customer, product } = rentalRequest;

      // Determine notification details
      let notificationType: string;
      let title: string;
      let message: string;
      let userId: string;

      if (newStatus === 'paid') {
        // Notify both customer and owner
        notificationType = 'invoice_paid';
        title = 'Invoice Paid';
        message = `Invoice ${invoice.invoice_number} for ${product.title} has been paid`;
        userId = product.user_id; // Notify owner

        // Also notify customer
        await this.createNotification({
          userId: customer.id,
          type: 'invoice_paid_customer',
          title: 'Payment Confirmed',
          message: `Your payment for ${product.title} has been confirmed`,
          rentalRequestId: invoice.rental_request_id,
          data: {
            invoiceNumber: invoice.invoice_number,
            amount: invoice.amount,
            productTitle: product.title,
          },
        });
      } else if (newStatus === 'overdue') {
        // Notify customer
        notificationType = 'invoice_overdue';
        title = 'Invoice Overdue';
        message = `Invoice ${invoice.invoice_number} for ${product.title} is now overdue`;
        userId = customer.id;
      } else {
        return; // Don't notify for other statuses
      }

      await this.createNotification({
        userId,
        type: notificationType,
        title,
        message,
        rentalRequestId: invoice.rental_request_id,
        data: {
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          productTitle: product.title,
          oldStatus,
          newStatus,
          dueDate: invoice.due_date,
          updatedAt: new Date(),
        },
      });

    } catch (error) {
      console.error('Error creating invoice status update notification:', error);
    }
  }

  // Generic notification for any update that should notify both parties
  static async notifyGeneralUpdate(rentalRequest: any, updateType: string, title: string, message: string, additionalData: any = {}) {
    try {
      const { customer, product } = rentalRequest;

      const baseData = {
        updateType,
        productTitle: product.title,
        productId: product.id,
        customerId: customer.id,
        customerName: customer.name,
        rentalRequestId: rentalRequest.id,
        updatedAt: new Date(),
        ...additionalData,
      };

      // Notify customer
      await this.createNotification({
        userId: customer.id,
        type: `customer_${updateType}`,
        title: `Customer: ${title}`,
        message,
        rentalRequestId: rentalRequest.id,
        data: baseData,
      });

      // Notify owner
      await this.createNotification({
        userId: product.user_id,
        type: `owner_${updateType}`,
        title: `Owner: ${title}`,
        message,
        rentalRequestId: rentalRequest.id,
        data: baseData,
      });

    } catch (error) {
      console.error(`Error creating ${updateType} notification:`, error);
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
