import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { updateDamageAssessmentSchema } from '@/lib/validations';
import { UpdateDamageAssessmentRequest, ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/damage-assessments/[id] - Update damage assessment
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

    // Check if damage assessment exists
    const existingAssessment = await prisma.damageAssessment.findUnique({
      where: { id: params.id },
      include: {
        productReturn: {
          include: {
            rentalRequest: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!existingAssessment) {
      const response: ApiResponse = {
        success: false,
        message: 'Damage assessment not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to update this assessment (must be the product owner)
    if (existingAssessment.productReturn.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to update this damage assessment'
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateDamageAssessmentSchema.parse(body) as UpdateDamageAssessmentRequest;

    // Update damage assessment
    const updatedAssessment = await prisma.damageAssessment.update({
      where: { id: params.id },
      data: validatedData,
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

    // If damage assessment has estimated cost and is approved, check for invoice
    if (updatedAssessment.estimated_cost > 0 && updatedAssessment.approved) {
      // Check if invoice exists for this rental
      const existingInvoice = await prisma.invoice.findUnique({
        where: { rental_request_id: existingAssessment.productReturn.rental_request_id }
      });

      if (existingInvoice) {
        // Update existing invoice with damage fee
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            damage_fee: updatedAssessment.estimated_cost,
            additional_charges: (existingInvoice.additional_charges || 0) + updatedAssessment.estimated_cost,
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
              description: updatedAssessment.description || 'Damage assessment fee',
              unit_price: updatedAssessment.estimated_cost,
              total_price: updatedAssessment.estimated_cost
            }
          });
        } else {
          // Create damage fee item
          await prisma.invoiceItem.create({
            data: {
              invoice_id: existingInvoice.id,
              description: updatedAssessment.description || 'Damage assessment fee',
              quantity: 1,
              unit_price: updatedAssessment.estimated_cost,
              total_price: updatedAssessment.estimated_cost,
              item_type: 'damage_fee'
            }
          });
        }
      } else {
        // Create new invoice for damage fee
        const newInvoice = await prisma.invoice.create({
          data: {
            rental_request_id: existingAssessment.productReturn.rental_request_id,
            invoice_number: `INV-${Date.now()}`,
            amount: updatedAssessment.estimated_cost,
            tax_rate: 0.1,
            tax_amount: updatedAssessment.estimated_cost * 0.1,
            subtotal: updatedAssessment.estimated_cost,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            notes: `Damage assessment: ${updatedAssessment.description}`,
            invoice_status: 'pending'
          }
        });

        // Create damage fee item
        await prisma.invoiceItem.create({
          data: {
            invoice_id: newInvoice.id,
            description: updatedAssessment.description || 'Damage assessment fee',
            quantity: 1,
            unit_price: updatedAssessment.estimated_cost,
            total_price: updatedAssessment.estimated_cost,
            item_type: 'damage_fee'
          }
        });
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Damage assessment updated successfully',
      data: updatedAssessment
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Update damage assessment error:', error);

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
      message: 'Failed to update damage assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/damage-assessments/[id] - Delete damage assessment (optional)
export async function DELETE(request: NextRequest, props: RouteParams) {
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

    // Check if damage assessment exists
    const existingAssessment = await prisma.damageAssessment.findUnique({
      where: { id: params.id },
      include: {
        productReturn: {
          include: {
            rentalRequest: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!existingAssessment) {
      const response: ApiResponse = {
        success: false,
        message: 'Damage assessment not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to delete this assessment (must be the product owner)
    if (existingAssessment.productReturn.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to delete this damage assessment'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Delete damage assessment (cascade will delete photos)
    await prisma.damageAssessment.delete({
      where: { id: params.id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Damage assessment deleted successfully'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Delete damage assessment error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to delete damage assessment'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
