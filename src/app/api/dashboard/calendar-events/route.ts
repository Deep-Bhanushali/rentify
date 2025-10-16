import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse, RentalRequest, Product, User } from '@/types/models';
import { unstable_cache } from 'next/cache';

const prisma = new PrismaClient();

type ProductSummary = {
  id: string;
  title: string;
};

type RentalRequestWithDetails = Omit<RentalRequest, 'status' | 'product' | 'customer'> & {
  product: { title: string };
  customer: { name: string };
  status: string;
};

// Special type for customer returns where user is renting
type CustomerRentalRequest = Omit<RentalRequest, 'status' | 'product' | 'customer'> & {
  product: { title: string; user: { name: string } };
  status: string;
};

// GET /api/dashboard/calendar-events - Retrieve calendar events
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

    // Get query parameters for month filtering
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());

    // Calculate start and end dates for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Cache calendar events for 60 seconds
    const events = await unstable_cache(
      async () => {
        // Get user's products for owner events
        const products: ProductSummary[] = await prisma.product.findMany({
          where: { user_id: decoded.userId },
          select: { id: true, title: true }
        });

        const productIds = products.map((p: ProductSummary) => p.id);

        // Get paid rental requests where user is the owner (upcoming returns to them)
        const ownerActiveRequests: RentalRequestWithDetails[] = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: productIds },
            status: 'paid' // Rentals that have been paid for (active)
          },
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true }
            }
          }
        });

        // Get paid rental requests where user is the customer (they need to return products)
        const customerActiveRequests: CustomerRentalRequest[] = await prisma.rentalRequest.findMany({
          where: {
            customer_id: decoded.userId,
            status: 'paid' // Only paid rentals need returns
          },
          include: {
            product: {
              select: { title: true, user: { select: { name: true } } }
            }
          }
        });

        // Get pending requests where user is the owner (need approval)
        const pendingRequests: RentalRequestWithDetails[] = await prisma.rentalRequest.findMany({
          where: {
            product_id: { in: productIds },
            status: 'pending'
          },
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true }
            }
          }
        });

        // Format calendar events and filter by month
        const allEvents = [
          // Returns where user is the owner (customers returning products to them)
          ...ownerActiveRequests.map((request: RentalRequestWithDetails) => ({
            id: request.id,
            title: `Return Due: ${request.product.title}`,
            description: `Return from ${request.customer.name}`,
            date: request.end_date,
            type: 'return',
            status: 'upcoming',
            role: 'owner' // Add role to distinguish
          })),
          // Returns where user is the customer (they need to return rented products)
          ...customerActiveRequests.map((request: CustomerRentalRequest) => ({
            id: request.id,
            title: `Return Product: ${request.product.title}`,
            description: `Return to ${request.product.user.name}`,
            date: request.end_date,
            type: 'return',
            status: 'upcoming',
            role: 'customer' // Add role to distinguish
          })),
          ...pendingRequests.map((request: RentalRequestWithDetails) => ({
            id: request.id,
            title: `Approval Needed: ${request.product.title}`,
            description: `Request from ${request.customer.name}`,
            date: request.created_at,
            type: 'approval',
            status: 'pending'
          }))
        ].filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= startDate && eventDate <= endDate;
        }) as any[];

        return allEvents;
      },
      [`dashboard-calendar-events-${decoded.userId}`],
      {
        revalidate: 90, // Revalidate every 60 seconds
        tags: ['dashboard'] // Tag for cache invalidation
      }
    )();

    const response: ApiResponse = {
      success: true,
      message: 'Calendar events retrieved successfully',
      data: events
    };

    const nextResponse = NextResponse.json(response, { status: 200 });

    // Add caching headers
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return nextResponse;
  } catch (error: unknown) {
    console.error('Get calendar events error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve calendar events'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
