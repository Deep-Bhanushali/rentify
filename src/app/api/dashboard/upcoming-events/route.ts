import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, RentalRequest, Product } from '@/types/models';
import { unstable_cache } from 'next/cache';

const prisma = new PrismaClient();

// GET /api/dashboard/upcoming-events - Retrieve upcoming events
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

    // Cache upcoming events for 60 seconds
    const events = await unstable_cache(
      async () => {
        // Get upcoming returns (next 7 days) - both as owner and as customer
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        // Returns where user is the owner (customers need to return to user)
        const products = await prisma.product.findMany({
          where: { user_id: decoded.userId },
          select: { id: true, title: true }
        });

        const ownedProductIds = products.map((p: { id: string }) => p.id);

        const ownerReturns = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: ownedProductIds },
            status: 'paid', // Only paid rentals need returns
            end_date: {
              lte: nextWeek,
              gte: new Date()
            }
          },
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true }
            }
          },
          orderBy: {
            end_date: 'asc'
          }
        });

        // Returns where user is the customer (user needs to return rented products)
        const customerReturns = await prisma.rentalRequest.findMany({
          where: {
            customer_id: decoded.userId,
            status: 'paid', // Only paid rentals have return dates
            end_date: {
              lte: nextWeek,
              gte: new Date()
            }
          },
          include: {
            product: {
              select: { title: true, user: { select: { name: true } } }
            }
          },
          orderBy: {
            end_date: 'asc'
          }
        });

        // Get pending approvals (older than 1 day)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const pendingApprovals = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: ownedProductIds },
            status: 'pending',
            created_at: {
              lte: yesterday
            }
          },
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        });

        // Format upcoming events
        return [
          // Returns where user is the owner (incoming returns)
          ...ownerReturns.map((request: {
            id: string;
            product: { title: string };
            customer: { name: string };
            end_date: Date;
          }) => ({
            id: request.id,
            title: `Return Due: ${request.product.title}`,
            description: `Return from ${request.customer.name}`,
            date: request.end_date,
            type: 'return',
            priority: 'high',
            role: 'owner',
            daysUntil: Math.ceil((request.end_date.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          })),
          // Returns where user is the customer (outgoing returns)
          ...customerReturns.map((request: {
            id: string;
            product: { title: string; user: { name: string } };
            end_date: Date;
          }) => ({
            id: request.id,
            title: `Return: ${request.product.title}`,
            description: `Return to ${request.product.user.name}`,
            date: request.end_date,
            type: 'return',
            priority: 'high',
            role: 'customer',
            daysUntil: Math.ceil((request.end_date.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          })),
          ...pendingApprovals.map((request: {
            id: string;
            product: { title: string };
            customer: { name: string };
            created_at: Date;
          }) => ({
            id: request.id,
            title: `Pending Approval: ${request.product.title}`,
            description: `Request from ${request.customer.name}`,
            date: request.created_at,
            type: 'approval',
            priority: 'medium',
            daysSince: Math.floor((new Date().getTime() - request.created_at.getTime()) / (1000 * 3600 * 24))
          }))
        ];
      },
      [`dashboard-upcoming-events-${decoded.userId}`],
      {
        revalidate: 90, // Revalidate every 60 seconds
        tags: ['dashboard'] // Tag for cache invalidation
      }
    )();

    const response: ApiResponse = {
      success: true,
      message: 'Upcoming events retrieved successfully',
      data: events
    };

    const nextResponse = NextResponse.json(response, { status: 200 });

    // Add caching headers
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return nextResponse;
  } catch (error: unknown) {
    console.error('Get upcoming events error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve upcoming events'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
