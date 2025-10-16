import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { recipientEmail } = await request.json();

    // Authenticate user
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

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: {
        rentalRequest: {
          include: {
            product: {
              include: {
                user: true
              }
            },
            customer: true
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

    // Check if user has permission to email this invoice
    const isOwner = invoice.rentalRequest.product.user_id === decoded.userId;
    const isCustomer = invoice.rentalRequest.customer_id === decoded.userId;

    if (!isOwner && !isCustomer) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to email this invoice'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Validate recipient email matches customer or owner
    const ownerEmail = invoice.rentalRequest.product.user.email;
    const customerEmail = invoice.rentalRequest.customer.email;

    if (recipientEmail !== ownerEmail && recipientEmail !== customerEmail) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid recipient email. Can only email invoice to product owner or customer.'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Send notification and email
    try {
      await NotificationService.notifyInvoiceEmailed(invoice, recipientEmail);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice emailed successfully'
      };

      return NextResponse.json(response, { status: 200 });
    } catch (notificationError) {
      console.error('Error sending invoice email/notification:', notificationError);

      const response: ApiResponse = {
        success: false,
        message: 'Failed to send invoice email'
      };

      return NextResponse.json(response, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Email invoice error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to email invoice'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
