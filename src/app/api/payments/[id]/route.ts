import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';
import { InvoiceService } from '@/lib/invoiceService';
import { z } from 'zod';
import { Payment, ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for updating payment status
const updatePaymentSchema = z.object({
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  payment_date: z.date().optional(),
});

// Schema for offline payment verification
const verifyOfflinePaymentSchema = z.object({
  payment_status: z.enum(['completed']),
  payment_method: z.string().min(1, 'Payment method is required'),
  notes: z.string().optional(),
  payment_date: z.date().optional(),
});

// GET /api/payments/[id] - Get payment status
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
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

    if (!payment) {
      const response: ApiResponse = {
        success: false,
        message: 'Payment not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to view this payment
    if (payment.rentalRequest.customer_id !== decoded.userId &&
        payment.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to view this payment'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const response: ApiResponse<Payment> = {
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get payment error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve payment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update payment status
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Authentication required'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const body = await request.json();
    
    // Check if this is an offline payment verification
    if (body.payment_method && body.payment_status === 'completed') {
      const validatedData = verifyOfflinePaymentSchema.parse(body);
      
      // Check if payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: {
          rentalRequest: true
        }
      });

      if (!payment) {
        const response: ApiResponse = {
          success: false,
          message: 'Payment not found'
        };
        return NextResponse.json(response, { status: 404 });
      }

      // Fetch the product information to check ownership
      const product = await prisma.product.findUnique({
        where: { id: payment.rentalRequest.product_id },
        select: { user_id: true }
      });

      if (!product || product.user_id !== decoded.userId) {
        const response: ApiResponse = {
          success: false,
          message: 'Only the product owner can verify offline payments'
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Check if payment is already completed
      if (payment.payment_status === 'completed') {
        const response: ApiResponse = {
          success: false,
          message: 'Payment is already completed'
        };
        return NextResponse.json(response, { status: 400 });
      }

      // Update payment with verification details
      const updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: {
          payment_status: validatedData.payment_status,
          payment_method: validatedData.payment_method,
          transaction_id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          payment_date: validatedData.payment_date || new Date(),
          notes: validatedData.notes,
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

      // Update rental request status to paid
      await prisma.rentalRequest.update({
        where: { id: payment.rental_request_id },
        data: { status: 'paid' }
      });

      // Update product status to rented
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

      // Send payment confirmation notification to customer
      try {
        await NotificationService.notifyCustomerPaymentConfirmed(updatedPayment);
        console.log(`Payment confirmation sent to customer: ${updatedPayment.rentalRequest.customer.email}`);
      } catch (notificationError) {
        console.error('Failed to send payment confirmation to customer:', notificationError);
        // Don't throw here as the payment verification is already done
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
            'Offline payment verified successfully'
          );

          // Mark invoice as paid
          await InvoiceService.markAsPaid(invoice.id);
          console.log(`New invoice ${invoice.invoice_number} created and marked as paid`);
        }
      } catch (invoiceError) {
        console.error('Error handling invoice:', invoiceError);
        // Don't throw here as the payment is already processed
      }

      const response: ApiResponse<Payment> = {
        success: true,
        message: 'Offline payment verified successfully',
        data: updatedPayment
      };

      return NextResponse.json(response, { status: 200 });
    } else {
      // Regular payment status update
      const validatedData = updatePaymentSchema.parse(body);

      // Check if payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: {
          rentalRequest: true
        }
      });

      if (!payment) {
        const response: ApiResponse = {
          success: false,
          message: 'Payment not found'
        };
        return NextResponse.json(response, { status: 404 });
      }

      // Check if user is authorized to update this payment
      const product = await prisma.product.findUnique({
        where: { id: payment.rentalRequest.product_id },
        select: { user_id: true }
      });

      if (payment.rentalRequest.customer_id !== decoded.userId &&
          (!product || product.user_id !== decoded.userId)) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized to update this payment'
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Update payment
      const updatedPayment = await prisma.payment.update({
        where: { id: params.id },
        data: {
          payment_status: validatedData.payment_status,
          transaction_id: validatedData.transaction_id || payment.transaction_id,
          payment_method: validatedData.payment_method || payment.payment_method,
          payment_date: validatedData.payment_status === 'completed' && !payment.payment_date ?
            (validatedData.payment_date || new Date()) : payment.payment_date,
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

      // If payment is completed, update rental request status
      if (validatedData.payment_status === 'completed') {
        await prisma.rentalRequest.update({
          where: { id: payment.rental_request_id },
          data: { status: 'paid' }
        });
      }

      const response: ApiResponse<Payment> = {
        success: true,
        message: 'Payment updated successfully',
        data: updatedPayment
      };

      return NextResponse.json(response, { status: 200 });
    }
  } catch (error: any) {
    console.error('Update payment error:', error);
    
    if (error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: error.errors
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to update payment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
