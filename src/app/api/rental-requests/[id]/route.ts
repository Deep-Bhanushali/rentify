import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { updateRentalRequestSchema } from '@/lib/validations';
import { NotificationService } from '@/lib/notifications';
import { RentalRequest, UpdateRentalRequestRequest, ApiResponse } from '@/types/models';
import { revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/rental-requests/[id] - Get a specific rental request
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

    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: params.id },
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
        invoice: true,
        productReturn: {
          include: {
            damageAssessment: {
              include: {
                damagePhotos: true
              }
            }
          }
        }
      }
    });

    if (!rentalRequest) {
      const response: ApiResponse = {
        success: false,
        message: 'Rental request not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to view this rental request
    if (rentalRequest.customer_id !== decoded.userId && rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to view this rental request'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const response: ApiResponse<RentalRequest> = {
      success: true,
      message: 'Rental request retrieved successfully',
      data: rentalRequest
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Get rental request error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve rental request'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/rental-requests/[id] - Update rental request status (accept/reject)
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

    // Check if rental request exists
    const existingRentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: params.id },
      include: {
        product: true
      }
    });

    if (!existingRentalRequest) {
      const response: ApiResponse = {
        success: false,
        message: 'Rental request not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to update this rental request
    // Product owner can update status for approval/rejection
    // Customer can update status for completion (when returning product)
    const isOwner = existingRentalRequest.product.user_id === decoded.userId;
    const isCustomer = existingRentalRequest.customer_id === decoded.userId;

    if (!isOwner && !isCustomer) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to update this rental request'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateRentalRequestSchema.parse(body) as UpdateRentalRequestRequest;

    // Update rental request
    const updatedRentalRequest = await prisma.rentalRequest.update({
      where: { id: params.id },
      data: { status: validatedData.status },
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
        invoice: true,
        productReturn: {
          include: {
            damageAssessment: {
              include: {
                damagePhotos: true
              }
            }
          }
        }
      }
    });



    // If rental request is rejected or cancelled, update product status back to available
    if (validatedData.status === 'rejected' || validatedData.status === 'cancelled') {
      await prisma.product.update({
        where: { id: existingRentalRequest.product_id },
        data: { status: 'available' }
      });
    }

    // If rental request is returned or completed, update product status back to available
    if (validatedData.status === 'returned' || validatedData.status === 'completed') {
      await prisma.product.update({
        where: { id: existingRentalRequest.product_id },
        data: { status: 'available' }
      });
    }

    // Send notifications based on status change
    try {
      if (validatedData.status === 'accepted') {
        await NotificationService.notifyRequestApproved(updatedRentalRequest);
      } else if (validatedData.status === 'rejected') {
        await NotificationService.notifyRequestRejected(updatedRentalRequest);
      }
    } catch (notificationError) {
      console.error('Failed to create notification for status change:', notificationError);
      // Don't fail the rental request update if notification fails
    }

    // Revalidate caches when rental request status is updated
    revalidateTag('rental-requests');
    revalidateTag('notifications');

    const response: ApiResponse<RentalRequest> = {
      success: true,
      message: 'Rental request updated successfully',
      data: updatedRentalRequest
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Update rental request error:', error);

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
      message: 'Failed to update rental request'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
