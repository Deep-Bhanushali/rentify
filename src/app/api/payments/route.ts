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

    // Step 1: Check if product is available for the requested dates
    // Check product status and existing paid rentals
    const productCheck = await prisma.product.findUnique({
      where: { id: rentalRequest.product_id }
    });

    if (!productCheck) {
      throw new AppError('Product not found', 404);
    }

    // If product is rented, check for conflicts and buffer
    if (productCheck.status === 'rented') {
      const overlappingPaidRentals = await prisma.rentalRequest.findMany({
        where: {
          product_id: rentalRequest.product_id,
          status: 'paid',
          OR: [
            // Direct overlap
            {
              AND: [
                { start_date: { lte: rentalRequest.start_date } },
                { end_date: { gt: rentalRequest.start_date } }
              ]
            },
            // New rental ends after paid rental starts
            {
              AND: [
                { start_date: { lt: rentalRequest.end_date } },
                { end_date: { gte: rentalRequest.end_date } }
              ]
            },
            // Complete overlap
            {
              AND: [
                { start_date: { gte: rentalRequest.start_date } },
                { end_date: { lte: rentalRequest.end_date } }
              ]
            }
          ]
        }
      });

      if (overlappingPaidRentals.length > 0) {
        throw new AppError('This product is not available for the selected dates. It has already been rented by another customer.', 409);
      }

      // Check buffer period for existing paid rentals
      const bufferConflicts = await prisma.rentalRequest.findMany({
        where: {
          product_id: rentalRequest.product_id,
          status: 'paid',
          end_date: {
            gte: rentalRequest.start_date,
            lt: new Date(rentalRequest.start_date.getTime() + 2 * 24 * 60 * 60 * 1000)
          }
        }
      });

      if (bufferConflicts.length > 0) {
        throw new AppError('This product requires a 2-day buffer period after existing rentals. The selected dates conflict with the required buffer period.', 409);
      }
    }

    const existingOwnAttempts = await prisma.paymentAttempt.findMany({
      where: {
        rental_request_id: rental_request_id, // Same rental request
        is_active: true
      }
    });

    const conflictingAttempts = await prisma.paymentAttempt.findMany({
      where: {
        product_id: rentalRequest.product_id,
        is_active: true, // Only consider active payment attempts
        rental_request_id: { not: rental_request_id }, // Exclude current user's attempts
        OR: [
          // Direct overlap with existing attempts
          {
            AND: [
              { start_date: { lte: rentalRequest.start_date } },
              { end_date: { gt: rentalRequest.start_date } }
            ]
          },
          // New attempt ends after existing attempt starts
          {
            AND: [
              { start_date: { lt: rentalRequest.end_date } },
              { end_date: { gte: rentalRequest.end_date } }
            ]
          },
          // Complete overlap with existing attempts
          {
            AND: [
              { start_date: { gte: rentalRequest.start_date } },
              { end_date: { lte: rentalRequest.end_date } }
            ]
          }
        ]
      }
    });

    if (conflictingAttempts.length > 0) {
      throw new AppError('This product is currently being booked by another customer. Please try different dates or check back in a few minutes.', 409);
    }

    // Handle existing PaymentAttempt for this rental request
    let paymentAttempt;
    if (existingOwnAttempts.length > 0) {
      // Update existing attempt - extend expiry and reactivate
      paymentAttempt = await prisma.paymentAttempt.update({
        where: { rental_request_id: rental_request_id },
        data: {
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          is_active: true
        }
      });
    } else {
      // Create new payment attempt entry - now it's guaranteed no conflicts
      paymentAttempt = await prisma.paymentAttempt.create({
        data: {
          user_id: decoded.userId,
          product_id: rentalRequest.product_id,
          rental_request_id: rental_request_id,
          start_date: rentalRequest.start_date,
          end_date: rentalRequest.end_date,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          is_active: true
        }
      });
    }

    // Schedule cleanup of expired PaymentAttempts in background
    setTimeout(async () => {
      try {
        const now = new Date();

        // Find expired active PaymentAttempts
        const expiredAttempts = await prisma.paymentAttempt.findMany({
          where: {
            is_active: true,
            expires_at: { lt: now }
          },
          include: {
            rentalRequest: true
          }
        });

        for (const attempt of expiredAttempts) {
          // Mark attempt as inactive
          await prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: { is_active: false }
          });

          // Check if there's an associated pending payment that should be failed
          const pendingPayment = await prisma.payment.findFirst({
            where: {
              rental_request_id: attempt.rental_request_id,
              payment_status: 'pending'
            }
          });

          if (pendingPayment) {
            await prisma.payment.update({
              where: { id: pendingPayment.id },
              data: {
                payment_status: 'failed',
                notes: `Payment expired after 5 minutes. Expires at: ${attempt.expires_at.toISOString()}`
              }
            });

            // Update rental request status back to accepted if it was still pending
            const rentalRequest = attempt.rentalRequest;
            if (rentalRequest.status === 'pending') {
              await prisma.rentalRequest.update({
                where: { id: attempt.rental_request_id },
                data: { status: 'accepted' } // Reset to accepted to allow another payment attempt
              });
            }

            // Send notification to customer about payment expiry
            try {
              await NotificationService.notifyRentalRequestStatusUpdate(
                { ...rentalRequest, customer: { id: attempt.user_id, name: 'Customer', email: '' } },
                'pending',
                'accepted' // Will trigger appropriate expiry notification
              );
            } catch (notificationError) {
              console.error('Failed to send expiry notification:', notificationError);
            }
          }
        }

        console.log(`Cleaned up ${expiredAttempts.length} expired payment attempts`);
      } catch (cleanupError) {
        console.error('Error cleaning up expired payment attempts:', cleanupError);
      }
    }, 1000); // Small delay to ensure current request completes first

    // Check if payment already exists for this rental request - atomically handle race condition
    const result = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { rental_request_id: rental_request_id }
      });

      if (existingPayment && existingPayment.payment_status === 'completed') {
        throw new AppError('Payment already exists for this rental request', 400);
      }

      // If payment exists but failed, delete it and allow retry
      if (existingPayment && existingPayment.payment_status === 'failed') {
        await tx.payment.delete({
          where: { rental_request_id: rental_request_id }
        });
      }

      // If payment exists and is pending, update it with new Stripe intent
      if (existingPayment && existingPayment.payment_status === 'pending') {
        // Return existing pending payment details without creating a new one
        const existingPaymentWithDetails = await tx.payment.findUnique({
          where: { rental_request_id: rental_request_id },
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

        if (!existingPaymentWithDetails) {
          throw new AppError('Failed to retrieve existing payment details', 500);
        }

        if (payment_method === 'offline') {
          // For offline payments, update transaction details if needed
          return { type: 'offline', payment: existingPaymentWithDetails };
        } else if (existingPaymentWithDetails.transaction_id) {
          // For online payments with existing transaction, retrieve the client_secret from Stripe
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(existingPaymentWithDetails.transaction_id);
            return { type: 'online', payment: existingPaymentWithDetails, client_secret: paymentIntent.client_secret };
          } catch (stripeError) {
            console.error('Failed to retrieve payment intent from Stripe:', stripeError);
            throw new AppError('Failed to retrieve payment details. Please try again.', 500);
          }
        } else {
          // For online payments without transaction, create new Stripe intent and update
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(existingPayment.amount * 100), // Use existing amount
            currency: 'usd',
            metadata: {
              rental_request_id: rental_request_id,
              customer_id: decoded.userId,
              product_id: rentalRequest.product_id,
            },
          });

          // Update payment with new transaction ID
          await tx.payment.update({
            where: { rental_request_id: rental_request_id },
            data: {
              transaction_id: paymentIntent.id
            }
          });

          return {
            type: 'online',
            payment: { ...existingPaymentWithDetails, transaction_id: paymentIntent.id },
            client_secret: paymentIntent.client_secret
          };
        }
      }

      // Double-check: No completed payment should reach this point after all previous checks
      if (existingPayment && existingPayment.payment_status === 'completed') {
        throw new AppError('Payment has already been completed for this rental request', 400);
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
          is_offline: true,
          expires_at: paymentAttempt.expires_at
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
          is_offline: false,
          expires_at: paymentAttempt.expires_at
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

    // Handle payment completion and cleanup
    if (payment_status === 'completed') {
      await prisma.$transaction(async (tx) => {
        // Update rental request status
        await tx.rentalRequest.update({
          where: { id: payment.rental_request_id },
          data: { status: 'paid' }
        });

        // Update product status to rented
        await tx.product.update({
          where: { id: payment.rentalRequest.product_id },
          data: { status: 'rented' }
        });

        // Mark invoice as paid if it exists
        const invoice = await tx.invoice.findFirst({
          where: { rental_request_id: payment.rental_request_id }
        });

        if (invoice) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              invoice_status: 'paid',
              paid_date: new Date()
            }
          });
        }

        // Mark payment attempt as inactive
        await tx.paymentAttempt.updateMany({
          where: { rental_request_id: payment.rental_request_id },
          data: { is_active: false }
        });

        // Send payment completion notifications
        try {
          await NotificationService.notifyPaymentCompleted(updatedPayment);
          console.log(`Payment completion notification sent to owner: ${payment.rentalRequest.product.user_id}`);
        } catch (notificationError) {
          console.error('Failed to send payment completion notification to owner:', notificationError);
        }

        // Send confirmation notification to customer
        try {
          await NotificationService.notifyCustomerPaymentConfirmed(updatedPayment);
          console.log(`Payment confirmation sent to customer: ${payment.rentalRequest.customer.email}`);
        } catch (notificationError) {
          console.error('Failed to send payment confirmation to customer:', notificationError);
        }
      });
    } else if (payment_status === 'failed') {
      // Mark payment attempt as inactive on failure
      await prisma.paymentAttempt.updateMany({
        where: { rental_request_id: payment.rental_request_id },
        data: { is_active: false }
      });
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
