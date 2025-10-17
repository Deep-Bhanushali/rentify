import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

// POST /api/rental-requests/availability - Check availability for specific dates and product
export async function POST(request: NextRequest) {
  try {
    const { product_id, start_date, end_date } = await request.json();

    if (!product_id || !start_date || !end_date) {
      const response: ApiResponse = {
        success: false,
        message: 'Product ID, start date, and end date are required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      const response: ApiResponse = {
        success: false,
        message: 'End date must be after start date'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if product is rented
    const product = await prisma.product.findUnique({
      where: { id: product_id }
    });

    if (!product) {
      const response: ApiResponse = {
        success: false,
        message: 'Product not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // If product is available, always return available
    if (product.status === 'available') {
      const response: ApiResponse = {
        success: true,
        message: 'Product is available for the selected dates',
        data: { available: true }
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Check for overlapping paid rentals if product is rented
    const overlappingPaidRentals = await prisma.rentalRequest.findMany({
      where: {
        product_id: product_id,
        status: 'paid',
        OR: [
          // Direct overlap
          {
            AND: [
              { start_date: { lte: startDate } },
              { end_date: { gt: startDate } }
            ]
          },
          // New rental ends after paid rental starts
          {
            AND: [
              { start_date: { lt: endDate } },
              { end_date: { gte: endDate } }
            ]
          },
          // Complete overlap
          {
            AND: [
              { start_date: { gte: startDate } },
              { end_date: { lte: endDate } }
            ]
          }
        ]
      }
    });

    // Check buffer period for existing paid rentals
    const bufferConflicts = await prisma.rentalRequest.findMany({
      where: {
        product_id: product_id,
        status: 'paid',
        end_date: {
          gte: startDate,
          lt: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (overlappingPaidRentals.length > 0 || bufferConflicts.length > 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Product is not available for the selected dates. It has already been rented by another customer.'
      };
      return NextResponse.json(response, { status: 409 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Product is available for the selected dates',
      data: { available: true }
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Post availability check error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to check availability'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

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
    // Include only fully confirmed paid rentals
    const unavailableRequests = await prisma.rentalRequest.findMany({
      where: {
        product_id: productId,
        status: 'paid' // Only confirmed paid rentals block availability
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
