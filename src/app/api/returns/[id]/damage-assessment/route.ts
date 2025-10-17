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

    // Set default values for missing fields
    validatedData.product_return_id = params.id;
    validatedData.assessed_by = decoded.userId;

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

    // If damage assessment has estimated cost, create invoice
    if (damageAssessment.estimated_cost > 0) {
      // Check if invoice exists for this rental
      const existingInvoice = await prisma.invoice.findUnique({
        where: { rental_request_id: existingReturn.rental_request_id }
      });

      if (existingInvoice) {
        // Update existing invoice with damage fee
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            damage_fee: damageAssessment.estimated_cost,
            additional_charges: (existingInvoice.additional_charges || 0) + damageAssessment.estimated_cost,
            updated_at: new Date()
          }
        });

        // Check if damage fee item exists
        const existingDamageItem = await prisma.invoiceItem.findUnique({
          where: {
            invoice_id_item_type: {
              invoice_id: existingInvoice.id,
              item_type: 'damage_fee'
            }
          }
        });

        if (existingDamageItem) {
          // Update existing damage fee item
          await prisma.invoiceItem.update({
            where: { id: existingDamageItem.id },
            data: {
              description: damageAssessment.description || 'Damage assessment fee',
              unit_price: damageAssessment.estimated_cost,
              total_price: damageAssessment.estimated_cost
            }
          });
        } else {
          // Create damage fee item
          await prisma.invoiceItem.create({
            data: {
              invoice_id: existingInvoice.id,
              description: damageAssessment.description || 'Damage assessment fee',
              quantity: 1,
              unit_price: damageAssessment.estimated_cost,
              total_price: damageAssessment.estimated_cost,
              item_type: 'damage_fee'
            }
          });
        }
      } else {
        // Create new invoice for damage fee
        const newInvoice = await prisma.invoice.create({
          data: {
            rental_request_id: existingReturn.rental_request_id,
            invoice_number: `INV-${Date.now()}`,
            amount: damageAssessment.estimated_cost,
            tax_rate: 0.1,
            tax_amount: damageAssessment.estimated_cost * 0.1,
            subtotal: damageAssessment.estimated_cost,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            notes: `Damage assessment: ${damageAssessment.description}`,
            invoice_status: 'pending'
          }
        });

        // Create damage fee item
        await prisma.invoiceItem.create({
          data: {
            invoice_id: newInvoice.id,
            description: damageAssessment.description || 'Damage assessment fee',
            quantity: 1,
            unit_price: damageAssessment.estimated_cost,
            total_price: damageAssessment.estimated_cost,
            item_type: 'damage_fee'
          }
        });
      }
    }

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
