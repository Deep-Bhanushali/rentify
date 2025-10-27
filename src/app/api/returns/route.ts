import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createProductReturnSchema } from '@/lib/validations';
import { CreateProductReturnRequest, ApiResponse } from '@/types/models';

const prisma = new PrismaClient();
import { NotificationService } from '@/lib/notifications';

// POST /api/returns - Create a new product return
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

    const body = await request.json();
    const validatedData = createProductReturnSchema.parse(body) as CreateProductReturnRequest;

    // Check if rental request exists and belongs to the user
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: validatedData.rental_request_id },
      include: {
        product: {
          include: {
            user: true
          }
        },
        customer: true
      }
    });

    if (!rentalRequest) {
      const response: ApiResponse = {
        success: false,
        message: 'Rental request not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized (either customer or owner)
    const isCustomer = rentalRequest.customer_id === decoded.userId;
    const isOwner = rentalRequest.product.user_id === decoded.userId;

    if (!isCustomer && !isOwner) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to create return for this rental'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if a return already exists for this rental
    const existingReturn = await prisma.productReturn.findUnique({
      where: { rental_request_id: validatedData.rental_request_id }
    });

    if (existingReturn) {
      const response: ApiResponse = {
        success: false,
        message: 'Return already exists for this rental'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create product return
    const productReturn = await prisma.productReturn.create({
      data: {
        rental_request_id: validatedData.rental_request_id,
        return_date: new Date(validatedData.return_date),
        return_location: validatedData.return_location,
        return_status: 'initiated',
        condition_notes: validatedData.condition_notes,
        customer_signature: validatedData.customer_signature,
      },
      include: {
        rentalRequest: {
          include: {
            product: true,
            customer: true
          }
        },
        damageAssessment: {
          include: {
            damagePhotos: true
          }
        }
      }
    });

    // Send notification to product owner that return has been initiated
    try {
      await NotificationService.notifyReturnInitiated(rentalRequest);
      console.log(`Return initiated notification sent to owner: ${rentalRequest.product.user.email}`);
    } catch (notificationError) {
      console.error('Failed to send return initiated notification:', notificationError);
      // Don't throw here as the return creation has already succeeded
    }

    const response: ApiResponse = {
      success: true,
      message: 'Product return created successfully',
      data: productReturn
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Create product return error:', error);
    
    if (error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: error.errors
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to create product return'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/returns - Get returns for the current user
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
    const asOwner = searchParams.get('asOwner') === 'true';
    const rentalRequestId = searchParams.get('rental_request_id');

    let returns;

    if (rentalRequestId) {
      // Filter returns by rental request ID
      returns = await prisma.productReturn.findMany({
        where: {
          rental_request_id: rentalRequestId,
          // Add authorization check
          rentalRequest: {
            OR: [
              { customer_id: decoded.userId }, // Customer can see their returns
              { product: { user_id: decoded.userId } } // Product owner can see returns for their products
            ]
          }
        },
        include: {
          rentalRequest: {
            include: {
              product: true,
              customer: true
            }
          },
          damageAssessment: {
            include: {
              damagePhotos: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    } else if (asOwner) {
      // Get returns for products owned by the user
      returns = await prisma.productReturn.findMany({
        where: {
          rentalRequest: {
            product: {
              user_id: decoded.userId
            }
          }
        },
        include: {
          rentalRequest: {
            include: {
              product: true,
              customer: {
                select: {
                  id: true,
                  name: true, // Include customer name instead of just ID
                  email: true
                }
              }
            }
          },
          damageAssessment: {
            include: {
              damagePhotos: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    } else {
      // Get returns for rentals made by the user
      returns = await prisma.productReturn.findMany({
        where: {
          rentalRequest: {
            customer_id: decoded.userId
          }
        },
        include: {
          rentalRequest: {
            include: {
              product: true,
              customer: true
            }
          },
          damageAssessment: {
            include: {
              damagePhotos: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Returns retrieved successfully',
      data: returns
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get returns error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve returns'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
