import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id]/downloads - Retrieve download history for an invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
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

    // Check if invoice exists and user is authorized
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
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

    // Check if user is authorized to view this invoice's download history
    if (invoice.rentalRequest.customer_id !== decoded.userId &&
        invoice.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to view this invoice\'s download history'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Get download history
    const downloads = await prisma.invoiceDownload.findMany({
      where: { invoice_id: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Download history retrieved successfully',
      data: downloads
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Get download history error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve download history'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
