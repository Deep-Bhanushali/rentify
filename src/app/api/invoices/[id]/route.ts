import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { updateInvoiceSchema } from '@/lib/validations';
import { trackDownloadSchema } from '@/lib/validations/download';
import { Invoice, ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id] - Retrieve an invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        rentalRequest: {
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
            payment: true
          }
        },
        invoiceItems: true
      }
    });

    if (!invoice) {
      const response: ApiResponse = {
        success: false,
        message: 'Invoice not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Invoice> = {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice as unknown as Invoice
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Get invoice error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve invoice'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update an invoice
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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
    const validatedData = updateInvoiceSchema.parse(body);

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        rentalRequest: {
          include: {
            product: true
          }
        }
      }
    });

    if (!existingInvoice) {
      const response: ApiResponse = {
        success: false,
        message: 'Invoice not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to update this invoice
    if (existingInvoice.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to update this invoice'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validatedData };
    
    // If status is being updated to 'paid', set paid_date
    if (validatedData.invoice_status === 'paid' && existingInvoice.invoice_status !== 'paid') {
      updateData.paid_date = new Date();
    }

    // Recalculate total if fees are updated
    const newSubtotal = existingInvoice.subtotal;
    const newTaxAmount = existingInvoice.tax_amount;
    let newTotalAmount = existingInvoice.amount;

    if (validatedData.late_fee !== undefined ||
        validatedData.damage_fee !== undefined ||
        validatedData.additional_charges !== undefined) {
      
      const lateFee = validatedData.late_fee ?? existingInvoice.late_fee;
      const damageFee = validatedData.damage_fee ?? existingInvoice.damage_fee;
      const additionalCharges = validatedData.additional_charges ?? existingInvoice.additional_charges;
      
      newTotalAmount = newSubtotal + newTaxAmount + lateFee + damageFee + additionalCharges;
      updateData.amount = newTotalAmount;
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        rentalRequest: {
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
        },
        invoiceItems: true
      }
    });

    // If late fee or damage fee was added, create corresponding invoice items
    if (validatedData.late_fee !== undefined && validatedData.late_fee > 0) {
      const existingItem = await prisma.invoiceItem.findFirst({
        where: {
          invoice_id: id,
          item_type: 'late_fee'
        }
      });

      if (existingItem) {
        await prisma.invoiceItem.update({
          where: { id: existingItem.id },
          data: {
            unit_price: validatedData.late_fee,
            total_price: validatedData.late_fee
          }
        });
      } else {
        await prisma.invoiceItem.create({
          data: {
            invoice_id: id,
            description: 'Late fee',
            quantity: 1,
            unit_price: validatedData.late_fee,
            total_price: validatedData.late_fee,
            item_type: 'late_fee'
          }
        });
      }
    }

    if (validatedData.damage_fee !== undefined && validatedData.damage_fee > 0) {
      const existingItem = await prisma.invoiceItem.findFirst({
        where: {
          invoice_id: id,
          item_type: 'damage_fee'
        }
      });

      if (existingItem) {
        await prisma.invoiceItem.update({
          where: { id: existingItem.id },
          data: {
            unit_price: validatedData.damage_fee,
            total_price: validatedData.damage_fee
          }
        });
      } else {
        await prisma.invoiceItem.create({
          data: {
            invoice_id: id,
            description: 'Damage fee',
            quantity: 1,
            unit_price: validatedData.damage_fee,
            total_price: validatedData.damage_fee,
            item_type: 'damage_fee'
          }
        });
      }
    }

    if (validatedData.additional_charges !== undefined && validatedData.additional_charges > 0) {
      const existingItem = await prisma.invoiceItem.findFirst({
        where: {
          invoice_id: id,
          item_type: 'additional_charge'
        }
      });

      if (existingItem) {
        await prisma.invoiceItem.update({
          where: { id: existingItem.id },
          data: {
            unit_price: validatedData.additional_charges,
            total_price: validatedData.additional_charges
          }
        });
      } else {
        await prisma.invoiceItem.create({
          data: {
            invoice_id: id,
            description: 'Additional charges',
            quantity: 1,
            unit_price: validatedData.additional_charges,
            total_price: validatedData.additional_charges,
            item_type: 'additional_charge'
          }
        });
      }
    }

    const response: ApiResponse<Invoice> = {
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice as Invoice
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Update invoice error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to update invoice'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/invoices/[id]/download - Track invoice download
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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
    const validatedData = trackDownloadSchema.parse(body);
    const { format, fileSize } = validatedData;

    // Check if invoice exists and user is authorized
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        rentalRequest: {
          include: {
            product: true
          }
        }
      }
    });

    if (!invoice) {
      const response: ApiResponse = {
        success: false,
        message: 'Invoice not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to download this invoice
    if (invoice.rentalRequest.customer_id !== decoded.userId &&
        invoice.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to download this invoice'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Record download history
    const downloadRecord = await prisma.invoiceDownload.create({
      data: {
        invoice_id: id,
        user_id: decoded.userId,
        format,
        file_size: fileSize || null,
        success: true
      }
    }) ?? null;

    const response: ApiResponse = {
      success: true,
      message: 'Download recorded successfully',
      data: downloadRecord
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Record download error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: (error as any).errors
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to record download'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
