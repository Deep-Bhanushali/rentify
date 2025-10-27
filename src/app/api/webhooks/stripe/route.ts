import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AppError, verifyWebhookSignature } from '@/lib/errorHandler';
import { InvoiceService } from '@/lib/invoiceService';
import { NotificationService } from '@/lib/notifications';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    // Verify webhook signature
    if (!signature) {
      throw new AppError('Webhook signature missing', 400);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new AppError('Webhook signature verification failed', 400);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntentSucceeded);
        break;
      case 'payment_intent.payment_failed':
        const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntentFailed);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Find payment by transaction_id (which is the payment intent ID)
    const payment = await prisma.payment.findFirst({
      where: { transaction_id: paymentIntent.id },
      include: {
        rentalRequest: {
          include: {
            product: {
              include: {
                user: true
              }
            },
            customer: true
          }
        }
      }
    });

    if (!payment) {
      console.error('Payment not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update payment status to completed
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payment_status: 'completed',
      },
      include: {
        rentalRequest: {
          include: {
            product: {
              include: {
                user: true
              }
            },
            customer: true
          }
        }
      }
    });

    // Update rental request status to paid (payment completed)
    await prisma.rentalRequest.update({
      where: { id: payment.rental_request_id },
      data: { status: 'paid' }
    });

    // Update product status to rented (product is now in use)
    await prisma.product.update({
      where: { id: payment.rentalRequest.product_id },
      data: { status: 'rented' }
    });

    // Remove payment attempt record after successful payment
    try {
      await prisma.paymentAttempt.deleteMany({
        where: { rental_request_id: payment.rental_request_id }
      });
      console.log(`Payment attempt record removed for rental ${payment.rental_request_id}`);
    } catch (attemptError) {
      console.error('Failed to remove payment attempt:', attemptError);
    }

    // Find existing invoice or mark as paid if it exists
    try {
      const existingInvoice = await prisma.invoice.findFirst({
        where: { rental_request_id: payment.rental_request_id }
      });

      if (existingInvoice) {
        // Invoice already exists, just mark it as paid
        await InvoiceService.markAsPaid(existingInvoice.id);
        console.log(`Existing invoice ${existingInvoice.invoice_number} marked as paid`);
      } else {
        // Create new invoice if one doesn't exist (fallback)
        console.log('No existing invoice found, creating new invoice');
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        const invoice = await InvoiceService.createInvoice(
          payment.rental_request_id,
          dueDate,
          'Payment completed successfully'
        );

        // Mark invoice as paid
        await InvoiceService.markAsPaid(invoice.id);
        console.log(`New invoice ${invoice.invoice_number} created and marked as paid`);
      }
    } catch (invoiceError) {
      console.error('Error handling invoice:', invoiceError);
      // Don't throw here as the payment is already processed
      // We'll log the error and continue
    }

    // Send notification to product owner that payment is completed and product is now rented
    try {
      await NotificationService.notifyPaymentCompleted(updatedPayment);
      console.log(`Payment notification sent to owner: ${payment.rentalRequest.product.user_id}`);
    } catch (notificationError) {
      console.error('Failed to send payment notification to owner:', notificationError);
      // Don't throw here as the payment processing is already done
    }

    // Send confirmation notification to customer
    try {
      await NotificationService.notifyCustomerPaymentConfirmed(updatedPayment);
      console.log(`Payment confirmation sent to customer: ${payment.rentalRequest.customer.email}`);
    } catch (notificationError) {
      console.error('Failed to send payment confirmation to customer:', notificationError);
      // Don't throw here as the payment processing is already done
    }

    console.log(`Payment succeeded for rental request ${payment.rental_request_id}`);
    console.log(`Customer: ${payment.rentalRequest.customer.email}`);
    console.log(`Product: ${payment.rentalRequest.product.title}`);
    console.log(`Amount: $${payment.amount.toFixed(2)}`);
    console.log(`Product status updated to: rented`);
    
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Find payment by transaction_id (which is the payment intent ID)
    const payment = await prisma.payment.findFirst({
      where: { transaction_id: paymentIntent.id },
      include: {
        rentalRequest: {
          include: {
            product: true,
            customer: true
          }
        }
      }
    });

    if (!payment) {
      console.error('Payment not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update payment status to failed
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        payment_status: 'failed',
      },
      include: {
        rentalRequest: true
      }
    });

    // TODO: Send failure notification to customer
    console.log(`Payment failed for rental request ${payment.rental_request_id}`);
    console.log(`Customer: ${payment.rentalRequest.customer.email}`);
    console.log(`Product: ${payment.rentalRequest.product.title}`);
    console.log(`Amount: $${payment.amount.toFixed(2)}`);
    console.log(`Failure reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`);
    
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}
