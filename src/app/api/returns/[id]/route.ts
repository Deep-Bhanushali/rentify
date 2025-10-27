import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { updateProductReturnSchema, createDamageAssessmentSchema, createDamagePhotoSchema } from '@/lib/validations';
import { UpdateProductReturnRequest, CreateDamageAssessmentRequest, CreateDamagePhotoRequest, ApiResponse } from '@/types/models';
import { NotificationService } from '@/lib/notifications';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/returns/[id] - Get a specific return
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

    const productReturn = await prisma.productReturn.findUnique({
      where: { id: params.id },
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

    if (!productReturn) {
      const response: ApiResponse = {
        success: false,
        message: 'Return not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to view this return
    if (productReturn.rentalRequest.customer_id !== decoded.userId && 
        productReturn.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to view this return'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Return retrieved successfully',
      data: productReturn
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Get return error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve return'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/returns/[id] - Update a return
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

    // Check if return exists
    const existingReturn = await prisma.productReturn.findUnique({
      where: { id: params.id },
      include: {
        rentalRequest: {
          include: {
            product: true
          }
        }
      }
    });

    if (!existingReturn) {
      const response: ApiResponse = {
        success: false,
        message: 'Return not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to update this return
    const isCustomer = existingReturn.rentalRequest.customer_id === decoded.userId;
    const isOwner = existingReturn.rentalRequest.product.user_id === decoded.userId;
    
    if (!isCustomer && !isOwner) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to update this return'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    
    // If updating return status, only owners can confirm returns
    if (body.return_status && body.return_status === 'completed' && !isOwner) {
      const response: ApiResponse = {
        success: false,
        message: 'Only product owners can confirm returns'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // If updating owner confirmation, only owners can do this
    if (body.owner_confirmation !== undefined && !isOwner) {
      const response: ApiResponse = {
        success: false,
        message: 'Only product owners can confirm return status'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const validatedData = updateProductReturnSchema.parse(body) as UpdateProductReturnRequest;

    // Update return
    const updatedReturn = await prisma.productReturn.update({
      where: { id: params.id },
      data: validatedData,
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

    // If return is completed and there's damage assessment, update invoice
    if (validatedData.return_status === 'completed' && updatedReturn.damageAssessment) {
      const damageAssessment = updatedReturn.damageAssessment;
      
      // Check if invoice exists
      const existingInvoice = await prisma.invoice.findUnique({
        where: { rental_request_id: updatedReturn.rental_request_id }
      });

      if (existingInvoice && damageAssessment.approved) {
        // Update invoice with damage fee
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            damage_fee: damageAssessment.estimated_cost,
            additional_charges: existingInvoice.additional_charges + damageAssessment.estimated_cost,
            updated_at: new Date()
          }
        });

        // Add damage fee as invoice item
        await prisma.invoiceItem.create({
          data: {
            invoice_id: existingInvoice.id,
            description: `Damage fee: ${damageAssessment.damage_type} (${damageAssessment.severity})`,
            quantity: 1,
            unit_price: damageAssessment.estimated_cost,
            total_price: damageAssessment.estimated_cost,
            item_type: 'damage_fee'
          }
        });
      }
    }

    // Send notification for return confirmation if return status is completed
    if (validatedData.return_status === 'completed') {
      try {
        await NotificationService.notifyReturnConfirmed(updatedReturn.rentalRequest);
        console.log(`Return confirmation notification sent to customer: ${updatedReturn.rentalRequest.customer.email}`);
      } catch (notificationError) {
        console.error('Failed to send return confirmation notification:', notificationError);
        // Don't throw here as the return update has already succeeded
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Return updated successfully',
      data: updatedReturn
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Update return error:', error);
    
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
      message: 'Failed to update return'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/returns/[id]/damage-assessment - Create damage assessment for a return
export async function POST(request: NextRequest, props: RouteParams) {
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

    // Check if return exists
    const existingReturn = await prisma.productReturn.findUnique({
      where: { id: params.id },
      include: {
        rentalRequest: {
          include: {
            product: true
          }
        }
      }
    });

    if (!existingReturn) {
      const response: ApiResponse = {
        success: false,
        message: 'Return not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to create damage assessment (must be the product owner)
    if (existingReturn.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to create damage assessment for this return'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createDamageAssessmentSchema.parse(body) as CreateDamageAssessmentRequest;

    // Check if damage assessment already exists
    const existingAssessment = await prisma.damageAssessment.findUnique({
      where: { product_return_id: params.id }
    });

    if (existingAssessment) {
      const response: ApiResponse = {
        success: false,
        message: 'Damage assessment already exists for this return'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create damage assessment
    const damageAssessment = await prisma.damageAssessment.create({
      data: {
        ...validatedData,
        product_return_id: params.id
      },
      include: {
        productReturn: {
          include: {
            rentalRequest: {
              include: {
                product: true,
                customer: true
              }
            }
          }
        },
        damagePhotos: true
      }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Damage assessment created successfully',
      data: damageAssessment
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Create damage assessment error:', error);
    
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
      message: 'Failed to create damage assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
