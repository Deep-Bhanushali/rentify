import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createDamageAssessmentSchema, createDamagePhotoSchema } from '@/lib/validations';
import { CreateDamageAssessmentRequest, CreateDamagePhotoRequest, ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
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
