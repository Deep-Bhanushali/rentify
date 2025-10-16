import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';
import { unstable_cache } from 'next/cache';

const prisma = new PrismaClient();

type ProductStats = {
  id: string;
  status: string;
};

type RentalRequestStats = {
  status: string;
  created_at: Date;
};

type PaymentStats = {
  amount: number;
};

// GET /api/dashboard/stats - Retrieve dashboard statistics
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

    // Cache dashboard statistics for 60 seconds
    const stats = await unstable_cache(
      async () => {
        // Get user's products
        const products: ProductStats[] = await prisma.product.findMany({
          where: { user_id: decoded.userId },
          select: { id: true, status: true }
        });

        const productIds = products.map((p: ProductStats) => p.id);

        // Get statistics
        const totalProducts = products.length;
        const availableProducts = products.filter((p: ProductStats) => p.status === 'available').length;
        const rentedProducts = products.filter((p: ProductStats) => p.status === 'rented').length;

        // Get rental requests for user's products
        const rentalRequests: RentalRequestStats[] = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: productIds }
          },
          select: { status: true, created_at: true }
        });

        const pendingRequests = rentalRequests.filter((r: RentalRequestStats) => r.status === 'pending').length;
        const activeRequests = rentalRequests.filter((r: RentalRequestStats) => r.status === 'active').length;
        const completedRequests = rentalRequests.filter((r: RentalRequestStats) => r.status === 'completed').length;

        // Get total revenue from completed payments (all time for dashboard overview)
        const payments: PaymentStats[] = await prisma.payment.findMany({
          where: {
            rentalRequest: {
              product_id: { in: productIds }
            },
            payment_status: 'completed'
          },
          select: { amount: true }
        });

        const totalRevenue = payments.reduce((sum: number, payment: PaymentStats) => sum + payment.amount, 0);

        // Get monthly revenue for comparison (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyPayments: PaymentStats[] = await prisma.payment.findMany({
          where: {
            rentalRequest: {
              product_id: { in: productIds }
            },
            payment_status: 'completed',
            payment_date: {
              gte: thirtyDaysAgo
            }
          },
          select: { amount: true }
        });

        const monthlyRevenue = monthlyPayments.reduce((sum: number, payment: PaymentStats) => sum + payment.amount, 0);

        return {
          totalProducts,
          availableProducts,
          rentedProducts,
          pendingRequests,
          activeRequests,
          completedRequests,
          totalRevenue, // Use monthly revenue for dashboard overview to match revenue page
          monthlyRevenue,
          totalRequests: rentalRequests.length
        };
      },
      [`dashboard-stats-${decoded.userId}`],
      {
        revalidate: 90,
        tags: ['dashboard'] 
      }
    )();

    const response: ApiResponse = {
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    };

    const nextResponse = NextResponse.json(response, { status: 200 });

    // Add caching headers
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return nextResponse;
  } catch (error: unknown) {
    console.error('Get dashboard stats error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve dashboard statistics'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
