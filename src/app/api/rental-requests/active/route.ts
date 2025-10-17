import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

// GET /api/rental-requests/active - Get active rentals for the current user that can be returned
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

    // Get current date
  const currentDate = new Date();

  // Get all rentals for the user that can be viewed or returned
  const activeRentals = await prisma.rentalRequest.findMany({
    where: {
      customer_id: decoded.userId,
      OR: [
        // Rentals that have ended and been paid
        {
          status: 'paid',
          end_date: {
            lt: currentDate // Rental has ended
          },
          productReturn: null // No return initiated yet
        },
        // Rentals that are active (paid and within rental period)
        {
          status: 'paid',
          end_date: {
            gte: currentDate // Still within rental period
          }
        },
        // Rentals with return records (for viewing status)
        {
          productReturn: {
            isNot: null // Has return record
          }
        }
      ]
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          rental_price: true,
          location: true,
          status: true,
          image_url: true
        }
      },
      productReturn: true // Include return status
    },
    orderBy: {
      end_date: 'asc'
    }
  });

    const response: ApiResponse = {
      success: true,
      message: 'Active rentals retrieved successfully',
      data: activeRentals
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get active rentals error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve active rentals'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
