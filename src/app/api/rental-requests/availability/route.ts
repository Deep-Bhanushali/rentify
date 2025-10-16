import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

// GET /api/rental-requests/availability?productId=xxx - Get unavailable dates for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      const response: ApiResponse = {
        success: false,
        message: 'Product ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get all rental requests for this product that would block availability
    // In the new instant rental flow, check for accepted rentals that are active
    const unavailableRequests = await prisma.rentalRequest.findMany({
      where: {
        product_id: productId,
        status: {
          in: ['accepted', 'paid'] // Rentals that are currently active
        }
      },
      select: {
        start_date: true,
        end_date: true,
        status: true
      },
      orderBy: {
        start_date: 'asc'
      }
    });

    // Get pending requests count for this product
    const pendingRequestsCount = await prisma.rentalRequest.count({
      where: {
        product_id: productId,
        status: 'pending'
      }
    });

    // Check if owner has accepted any requests in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAcceptedRequests = await prisma.rentalRequest.count({
      where: {
        product_id: productId,
        status: 'accepted',
        created_at: {
          gte: twentyFourHoursAgo
        }
      }
    });

    // Convert to date ranges that should be disabled
    const unavailableRanges = unavailableRequests.map(req => ({
      startDate: req.start_date.toISOString().split('T')[0],
      endDate: req.end_date.toISOString().split('T')[0],
      status: req.status
    }));

    // Add request limit information
    const requestLimitInfo = {
      pendingRequestsCount,
      recentAcceptedRequests,
      isAtLimit: pendingRequestsCount >= 2 && recentAcceptedRequests === 0,
      maxRequests: 2
    };

    const response: ApiResponse = {
      success: true,
      message: 'Unavailable dates retrieved successfully',
      data: {
        unavailableRanges,
        requestLimitInfo
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Get availability error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve availability information'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
