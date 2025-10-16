import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createRentalRequestSchema } from '@/lib/validations';
import { RentalRequest, CreateRentalRequestRequest, ApiResponse } from '@/types/models';
import { NotificationService } from '@/lib/notifications';
import { unstable_cache, revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

// GET /api/rental-requests - List rental requests for the logged-in user
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const asOwner = searchParams.get('asOwner') === 'true';

    // Cache the database query with user-specific cache key
    const rentalRequests = await unstable_cache(
      async () => {
        const whereClause: Record<string, unknown> = {};

        if (asOwner) {
          // Get rental requests for products owned by the user
          const userProducts = await prisma.product.findMany({
            where: { user_id: decoded.userId },
            select: { id: true }
          });

          const productIds = userProducts.map((p: { id: string }) => p.id);
          whereClause.product_id = { in: productIds };
        } else {
          // Get rental requests made by the user
          whereClause.customer_id = decoded.userId;
        }

        if (status) {
          whereClause.status = status;
        }

        const rentalRequests = await prisma.rentalRequest.findMany({
          where: whereClause,
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
            },
            payment: true,
            invoice: true
          },
          orderBy: {
            created_at: 'desc'
          }
        });

        return rentalRequests;
      },
      [`rental-requests-${decoded.userId}-${asOwner}-${status || 'all'}`],
      {
        revalidate: 60,
        tags: ['rental-requests']
      }
    )();

    const response: ApiResponse<RentalRequest[]> = {
      success: true,
      message: 'Rental requests retrieved successfully',
      data: rentalRequests
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=86400'
      }
    });
  } catch (error: unknown) {
    console.error('Get rental requests error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve rental requests'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/rental-requests - Create a new rental request
export async function POST(request: NextRequest) {
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

    // Verify that the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    console.log(user);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        message: 'User not found'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRentalRequestSchema.parse(body) as CreateRentalRequestRequest;

    // Calculate rental period first to use in availability check
    const requestStartDate = new Date(validatedData.start_date);
    const requestEndDate = new Date(validatedData.end_date);

    // Validate dates are logical
    if (requestStartDate >= requestEndDate) {
      const response: ApiResponse = {
        success: false,
        message: 'End date must be after start date'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if product exists and is available + no overlapping bookings
    const product = await prisma.product.findUnique({
      where: { id: validatedData.product_id }
    });

    if (!product) {
      const response: ApiResponse = {
        success: false,
        message: 'Product not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check for overlapping active/accepted rental requests
    const overlappingRequests = await prisma.rentalRequest.findMany({
      where: {
        product_id: validatedData.product_id,
        status: { in: ['accepted', 'active', 'paid'] },
        OR: [
          {
            AND: [
              { start_date: { lte: requestStartDate } },
              { end_date: { gt: requestStartDate } }
            ]
          },
          {
            AND: [
              { start_date: { lt: requestEndDate } },
              { end_date: { gte: requestEndDate } }
            ]
          },
          {
            AND: [
              { start_date: { gte: requestStartDate } },
              { end_date: { lte: requestEndDate } }
            ]
          }
        ]
      }
    });

    if (overlappingRequests.length > 0) {
      const response: ApiResponse = {
        success: false,
        message: 'This product is not available for the selected dates. Please choose different dates.'
      };
      return NextResponse.json(response, { status: 409 });
    }

    if (product.status !== 'available') {
      const response: ApiResponse = {
        success: false,
        message: 'Product is not available for rent'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if user is trying to rent their own product
    if (product.user_id === decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'You cannot rent your own product'
      };
      return NextResponse.json(response, { status: 400 });
    }

    
    // Calculate rental period and price SERVER-SIDE ONLY (no client calculation)
    const startDate = new Date(validatedData.start_date);
    const endDate = new Date(validatedData.end_date);

    // Validate dates are logical
    if (startDate >= endDate) {
      const response: ApiResponse = {
        success: false,
        message: 'End date must be after start date'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    let rentalPeriod: number;
    let price: number;

    // Calculate based on selected rental period type
    switch (validatedData.rental_period) {
      case 'hourly':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600)); // hours
        price = rentalPeriod * product.rental_price;
        break;
      case 'daily':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)); // days
        price = rentalPeriod * product.rental_price;
        break;
      case 'weekly':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7)); // weeks
        price = rentalPeriod * (product.rental_price * 7); // Weekly rate
        break;
      case 'monthly':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24 * 30)); // months
        price = rentalPeriod * (product.rental_price * 30); // Monthly rate
        break;
      case 'quarterly':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24 * 90)); // quarters
        price = rentalPeriod * (product.rental_price * 90); // Quarterly rate
        break;
      case 'yearly':
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24 * 365)); // years
        price = rentalPeriod * (product.rental_price * 365); // Yearly rate
        break;
      default:
        rentalPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)); // default to days
        price = rentalPeriod * product.rental_price;
    }

    // Validate calculated values are positive
    if (rentalPeriod <= 0 || price <= 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid rental period or calculated price'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create rental request - set status to accepted immediately in new instant rental flow
    const statusToUse = 'accepted';

    const newRentalRequest = await prisma.rentalRequest.create({
      data: {
        product_id: validatedData.product_id,
        customer_id: decoded.userId,
        start_date: startDate,
        end_date: endDate,
        status: statusToUse,
        price: price,
        rental_period: rentalPeriod,
        pickup_location: validatedData.pickup_location,
        return_location: validatedData.return_location
      },
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
    });

    // Send notification to product owner about new rental request
    try {
      await NotificationService.notifyNewRentalRequest(newRentalRequest);
    } catch (notificationError) {
      console.error('Failed to create notification for new rental request:', notificationError);
      // Don't fail the rental request creation if notification fails
    }

    // Revalidate caches when new rental request is created
    revalidateTag('rental-requests');
    revalidateTag('notifications');

    const response: ApiResponse<RentalRequest> = {
      success: true,
      message: 'Rental request created successfully',
      data: newRentalRequest
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('Create rental request error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: (error as unknown as { errors: unknown }).errors
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to create rental request'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
