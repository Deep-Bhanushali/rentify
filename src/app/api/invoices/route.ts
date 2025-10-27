import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { createInvoiceSchema } from '@/lib/validations';
import { Invoice, CreateInvoiceRequest, ApiResponse } from '@/types/models';
import { unstable_cache, revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

// Helper function to generate unique invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

// POST /api/invoices - Generate and send an invoice
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
    const validatedData = createInvoiceSchema.parse(body) as CreateInvoiceRequest;

    // Check if rental request exists
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: validatedData.rental_request_id },
      include: {
        customer: true,
        product: {
          include: {
            user: true
          }
        },
        payment: true
      }
    });

    if (!rentalRequest) {
      const response: ApiResponse = {
        success: false,
        message: 'Rental request not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is authorized to create invoice for this rental request
    // Customers can now create invoices directly for their rental requests
    if (rentalRequest.customer_id !== decoded.userId && rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to create invoice for this rental request'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if invoice already exists for this rental request
    const existingInvoice = await prisma.invoice.findUnique({
      where: { rental_request_id: validatedData.rental_request_id }
    });

    if (existingInvoice) {
      const response: ApiResponse = {
        success: false,
        message: 'Invoice already exists for this rental request'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Calculate tax and totals
    const taxRate = 0.1; // 10% tax rate
    const subtotal = rentalRequest.price;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Create invoice record
    const newInvoice = await prisma.invoice.create({
      data: {
        rental_request_id: validatedData.rental_request_id,
        invoice_number: generateInvoiceNumber(),
        amount: totalAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        subtotal: subtotal,
        invoice_status: 'pending',
        due_date: validatedData.due_date,
        notes: validatedData.notes || null
      },
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
        }
      }
    });

    // Create invoice items
    await prisma.invoiceItem.create({
      data: {
        invoice_id: newInvoice.id,
        description: `Rental fee for ${rentalRequest.product.title}`,
        quantity: 1,
        unit_price: subtotal,
        total_price: subtotal,
        item_type: 'rental_fee'
      }
    });

    await prisma.invoiceItem.create({
      data: {
        invoice_id: newInvoice.id,
        description: 'Tax (10%)',
        quantity: 1,
        unit_price: taxAmount,
        total_price: taxAmount,
        item_type: 'tax'
      }
    });

    // In a real implementation, this is where you would send the invoice via email
    // For now, we'll just update the status to 'sent'
    const updatedInvoice = await prisma.invoice.update({
      where: { id: newInvoice.id },
      data: { invoice_status: 'sent' },
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

    // Revalidate caches when new invoice is created
    revalidateTag('invoices');
    revalidateTag(`user-${decoded.userId}`);

    const response: ApiResponse<Invoice> = {
      success: true,
      message: 'Invoice generated and sent successfully',
      data: updatedInvoice as unknown as Invoice
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('Create invoice error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      const response: ApiResponse = {
        success: false,
        message: 'Validation error',
        data: (error as unknown as { errors: unknown[] }).errors
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse = {
      success: false,
      message: 'Failed to create invoice'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/invoices - Get all invoices for the authenticated user
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as string | null;
    const startDate = searchParams.get('startDate') as string | null;
    const endDate = searchParams.get('endDate') as string | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build cache key components
    const cacheKey = `invoices-${decoded.userId}-${status || 'all'}-${startDate || 'none'}-${endDate || 'none'}-${page}-${limit}`;

    // Cache invoices query with intelligent cache key
    const cacheResponse = await unstable_cache(
      async () => {
        const offset = (page - 1) * limit;

        // Build where clause based on filters - show invoices where current user is either customer or product owner
        const whereClause: Record<string, unknown> = {
          rentalRequest: {
            OR: [
              { customer_id: decoded.userId },
              { product: { user_id: decoded.userId } } 
            ]
          }
        };

        if (status) {
          whereClause.invoice_status = status;
        }

        if (startDate && endDate) {
          whereClause.created_at = {
            gte: new Date(startDate),
            lte: new Date(endDate)
          };
        }

        // Get invoices with pagination
        const invoices = await prisma.invoice.findMany({
          where: whereClause,
          include: {
            rentalRequest: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    category: true
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
          },
          orderBy: {
            created_at: 'desc'
          },
          skip: offset,
          take: limit
        });

        // Get total count for pagination
        const totalCount = await prisma.invoice.count({
          where: whereClause
        });

        return {
          invoices: invoices as unknown as Invoice[],
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        };
      },
      [cacheKey],
      {
        revalidate: 300, // Cache for 5 minutes
        tags: ['invoices', `user-${decoded.userId}`] // Tag for cache invalidation
      }
    )();

    const response: ApiResponse<{
      invoices: Invoice[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      }
    }> = {
      success: true,
      message: 'Invoices retrieved successfully',
      data: cacheResponse
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error: unknown) {
    console.error('Get invoices error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve invoices'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
