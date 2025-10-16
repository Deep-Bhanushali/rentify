import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createPaymentSchema } from '@/lib/validations';
import { AppError } from '@/lib/errorHandler';
import { CreatePaymentRequest, ApiResponse } from '@/types/models';
import { NotificationService } from '@/lib/notifications';
import { z } from 'zod';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// POST /api/payments - Create payment (online or offline)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new AppError('Invalid token', 401);
    }

    // Validate input - remove amount from validation since we calculate it server-side
    const body = await request.json();

    if (!body.rental_request_id || !body.payment_method) {
      throw new AppError('Rental request ID and payment method are required', 400);
    }

    const { rental_request_id, payment_method } = body;

    if (!['card', 'paypal', 'apple_pay', 'google_pay', 'offline'].includes(payment_method)) {
      throw new AppError('Invalid payment method', 400);
    }

    // Check if rental request exists
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: rental_request_id },
      include: {
        customer: true,
        product: true
      }
    });

    if (!rentalRequest) {
      throw new AppError('Rental request not found', 404);
    }

    // Check if user is authorized to make payment for this rental request
    if (rentalRequest.customer_id !== decoded.userId) {
      throw new AppError('Unauthorized to make payment for this rental request', 403);
    }

    // Check if payment already exists for this rental request - atomically handle race condition
    const result = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { rental_request_id: rental_request_id }
      });

      if (existingPayment) {
        throw new AppError('Payment already exists for this rental request', 400);
      }

      // Calculate payment amount SERVER-SIDE ONLY - no client input accepted
      // The amount comes directly from the rental request which was calculated server-side in the rental request API
      const paymentAmount = rentalRequest.price;

      if (paymentAmount <= 0) {
        throw new AppError('Invalid payment amount calculated server-side', 400);
      }

      // Handle different payment methods
      if (payment_method === 'offline') {
        // Create payment record with pending status for offline payments
        const newPayment = await tx.payment.create({
          data: {
            rental_request_id: rental_request_id,
            payment_method: 'offline',
            amount: paymentAmount,
            payment_status: 'pending',
            transaction_id: null
          },
          include: {
            rentalRequest: {
              include: {
                product: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        return { type: 'offline', payment: newPayment };
      } else {
        // Create a payment intent with Stripe for online payments
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(paymentAmount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            rental_request_id: rental_request_id,
            customer_id: decoded.userId,
            product_id: rentalRequest.product_id,
          },
        });

        // Create payment record with pending status
        const newPayment = await tx.payment.create({
          data: {
            rental_request_id: rental_request_id,
            payment_method: payment_method,
            amount: paymentAmount,
            payment_status: 'pending',
            transaction_id: paymentIntent.id
          },
          include: {
            rentalRequest: {
              include: {
                product: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                },
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        return { type: 'online', payment: newPayment, client_secret: paymentIntent.client_secret };
      }
    });

    // Handle the response outside the transaction
    if (result.type === 'offline') {
      const response: ApiResponse = {
        success: true,
        message: 'Offline payment initiated successfully',
        data: {
          payment_id: result.payment.id,
          is_offline: true
        }
      };

      return NextResponse.json(response, { status: 201 });
    } else {
      const response: ApiResponse = {
        success: true,
        message: 'Payment intent created successfully',
        data: {
          client_secret: result.client_secret,
          payment_id: result.payment.id,
          is_offline: false
        }
      };

    return NextResponse.json(response, { status: 201 });
    }
  } catch (error: unknown) {
    console.error('Process payment error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: (error as z.ZodError).issues
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        message: error.message
      };
      return NextResponse.json(response, { status: error.statusCode });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to process payment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update payment status
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new AppError('Invalid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');

    if (!paymentId) {
      throw new AppError('Payment ID is required', 400);
    }

    const body = await request.json();
    const { payment_status } = body;

    if (!['completed', 'failed', 'refunded'].includes(payment_status)) {
      throw new AppError('Invalid payment status', 400);
    }

    // Find payment and ensure user has permission
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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
      throw new AppError('Payment not found', 404);
    }

    // Only allow product owner to update offline payments
    if (payment.payment_method === 'offline' && payment.rentalRequest.product.user_id !== decoded.userId) {
      throw new AppError('Unauthorized to update this payment', 403);
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        payment_status,
        payment_date: payment_status === 'completed' ? new Date() : null,
      },
      include: {
        rentalRequest: {
          include: {
            product: true,
            customer: true
          }
        }
      }
    });

    // If offline payment is completed, update rental request and product
    if (payment_status === 'completed' && payment.payment_method === 'offline') {
      // Update rental request status to active
      await prisma.rentalRequest.update({
        where: { id: payment.rental_request_id },
        data: { status: 'active' }
      });

      // Update product status to rented
      await prisma.product.update({
        where: { id: payment.rentalRequest.product_id },
        data: { status: 'rented' }
      });

      // Mark invoice as paid if it exists
      const invoice = await prisma.invoice.findFirst({
        where: { rental_request_id: payment.rental_request_id }
      });

      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            invoice_status: 'paid',
            paid_date: new Date()
          }
        });
      }

      // Send notification to product owner that offline payment was approved
      try {
        await NotificationService.notifyPaymentCompleted(updatedPayment);
        console.log(`Offline payment approval notification sent to owner: ${payment.rentalRequest.product.user_id}`);
      } catch (notificationError) {
        console.error('Failed to send offline payment notification to owner:', notificationError);
      }

      // Send confirmation notification to customer
      try {
        await NotificationService.notifyCustomerPaymentConfirmed(updatedPayment);
        console.log(`Offline payment confirmation sent to customer: ${payment.rentalRequest.customer.email}`);
      } catch (notificationError) {
        console.error('Failed to send offline payment confirmation to customer:', notificationError);
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Payment status updated successfully',
      data: updatedPayment
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Update payment error:', error);

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        message: error.message
      };
      return NextResponse.json(response, { status: error.statusCode });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to update payment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
