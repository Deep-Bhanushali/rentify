import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/invoices/[id]/email - Send invoice via email
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

    const { recipientEmail, subject, message } = await request.json();

    if (!recipientEmail) {
      const response: ApiResponse = {
        success: false,
        message: 'Recipient email is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if invoice exists and user is authorized
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        rentalRequest: {
          include: {
            customer: true,
            product: true
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

    // Check if user is authorized to email this invoice
    if (invoice.rentalRequest.customer_id !== decoded.userId &&
        invoice.rentalRequest.product.user_id !== decoded.userId) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized to email this invoice'
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Send the invoice email and create notification
    try {
      await NotificationService.notifyInvoiceEmailed(invoice, recipientEmail);
      console.log(`✅ Invoice ${invoice.invoice_number} emailed to: ${recipientEmail}`);
    } catch (emailError: any) {
      console.error(`❌ Failed to email invoice ${invoice.invoice_number} to ${recipientEmail}:`, emailError.message);
      throw new Error(`Failed to send invoice email: ${emailError.message}`);
    }

    // Record the download/email action
    try {
      await prisma.invoiceDownload.create({
        data: {
          invoice_id: invoice.id,
          user_id: decoded.userId,
          format: 'email',
          success: true
        }
      });
    } catch (recordError) {
      console.error('Failed to record email action:', recordError);
      // Don't throw here as the email was successfully sent
    }

    const response: ApiResponse = {
      success: true,
      message: 'Invoice sent successfully via email'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Send invoice email error:', error);

    const response: ApiResponse = {
      success: false,
      message: error.message || 'Failed to send invoice email'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
