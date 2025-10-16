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

    // Get active rentals for the user that can be returned
    const activeRentals = await prisma.rentalRequest.findMany({
      where: {
        customer_id: decoded.userId,
        status: {
          in: ['accepted', 'paid'] // In the new flow, accepted rentals can be returned
        },
        // Only include rentals that have started or are about to start
        // start_date: {
        //   lte: currentDate
        // },
        // Only include rentals that haven't been returned yet
        productReturn: null
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
        }
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
