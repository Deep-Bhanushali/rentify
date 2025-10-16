import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, RentalRequest, Payment, User, Product } from '@/types/models';
import { unstable_cache } from 'next/cache';

const prisma = new PrismaClient();

type ProductSummary = {
  id: string;
  title: string;
};

type RentalRequestWithDetails = Omit<RentalRequest, 'status' | 'product' | 'customer'> & {
  product: { title: string };
  customer: { name: string; email: string };
  status: string;
};

type PaymentWithDetails = Omit<Payment, 'rentalRequest' | 'payment_status'> & {
  rentalRequest: {
    product: { title: string };
    customer: { name: string };
  };
  payment_status: string;
};

// GET /api/dashboard/recent-activities - Retrieve recent activities
export async function GET(request: NextRequest) {
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

    // Cache recent activities for 60 seconds
    const activities = await unstable_cache(
      async () => {
        // Get user's products
        const products: ProductSummary[] = await prisma.product.findMany({
          where: { user_id: decoded.userId },
          select: { id: true, title: true }
        });

        const productIds = products.map((p: ProductSummary) => p.id);

        // Get recent rental requests for user's products
        const recentRequests: RentalRequestWithDetails[] = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: productIds }
          },
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true, email: true }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 10
        });

        // Get recent payments
        const recentPayments: PaymentWithDetails[] = await prisma.payment.findMany({
          where: {
            rentalRequest: {
              product_id: { in: productIds }
            }
          },
          include: {
            rentalRequest: {
              include: {
                product: {
                  select: { title: true }
                },
                customer: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 5
        });

        // Activity type
        type Activity = {
          id: string;
          type: 'rental_request' | 'payment';
          title: string;
          description: string;
          timestamp: Date;
          status: string;
        };

        // Format activities
        return [
          ...recentRequests.map((request: RentalRequestWithDetails) => ({
            id: request.id,
            type: 'rental_request' as const,
            title: `New rental request for ${request.product.title}`,
            description: `Requested by ${request.customer.name}`,
            timestamp: request.created_at,
            status: request.status
          })),
          ...recentPayments.map((payment: PaymentWithDetails) => ({
            id: payment.id,
            type: 'payment' as const,
            title: `Payment received for ${payment.rentalRequest.product.title}`,
            description: `Amount: $${payment.amount} via ${payment.payment_method}`,
            timestamp: payment.created_at,
            status: payment.payment_status
          }))
        ].sort((a: Activity, b: Activity) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
      },
      [`dashboard-activities-${decoded.userId}`],
      {
        revalidate: 60, // Revalidate every 60 seconds
        tags: ['dashboard'] // Tag for cache invalidation
      }
    )();

    const response: ApiResponse = {
      success: true,
      message: 'Recent activities retrieved successfully',
      data: activities
    };

    const nextResponse = NextResponse.json(response, { status: 200 });

    // Add caching headers
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return nextResponse;
  } catch (error: unknown) {
    console.error('Get recent activities error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve recent activities'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
