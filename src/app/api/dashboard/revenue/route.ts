import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

// GET /api/dashboard/revenue - Retrieve revenue statistics
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';

    // Get user's products
    const products = await prisma.product.findMany({
      where: { user_id: decoded.userId },
      select: { id: true }
    });

    const productIds = products.map((p) => p.id);

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate: Date;
    let isAllTime = false;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        isAllTime = true;
        startDate = new Date(0); // Beginning of time for all records
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all completed payments for this user (don't filter by date initially)
    const allCompletedPayments = await prisma.payment.findMany({
      where: {
        rentalRequest: {
          product_id: { in: productIds }
        },
        payment_status: 'completed'
      },
      select: {
        amount: true,
        payment_date: true,
        payment_method: true
      }
    });

    // Filter payments based on time range
    const payments = isAllTime
      ? allCompletedPayments
      : allCompletedPayments.filter(payment => {
          if (!payment.payment_date) return false; // Skip payments without dates unless all time
          return payment.payment_date >= startDate && payment.payment_date <= now;
        });

    // Calculate revenue statistics
    const totalRevenue = payments.reduce((sum: number, payment) => sum + payment.amount, 0);

    console.log(`Time Range: ${timeRange}, Found payments: ${payments.length}, Total Revenue: $${totalRevenue}`);

    // Get pending invoices for outstanding amounts
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        rentalRequest: {
          product_id: { in: productIds }
        },
        invoice_status: { in: ['pending', 'overdue'] }
      },
      include: {
        rentalRequest: {
          include: {
            product: {
              select: { title: true }
            },
            customer: {
              select: { name: true }
            }
          }
        }
      }
    });

    const outstandingAmount = pendingInvoices.reduce((sum: number, invoice) => sum + invoice.amount, 0);
    const overdueInvoices = pendingInvoices.filter((invoice) => invoice.invoice_status === 'overdue').length;

    // Group payments by payment method
    const revenueByMethod: Record<string, number> = {};
    payments.forEach((payment) => {
      const method = payment.payment_method;
      revenueByMethod[method] = (revenueByMethod[method] || 0) + payment.amount;
    });

    // Group payments by date for chart data
    const revenueByDate: Record<string, number> = {};
    payments.forEach((payment) => {
      const date = payment.payment_date?.toISOString().split('T')[0];
      if (date) {
        revenueByDate[date] = (revenueByDate[date] || 0) + payment.amount;
      }
    });

    // Convert to chart format
    const chartData = Object.entries(revenueByDate).map(([date, amount]) => ({
      period: date,
      revenue: amount
    })).sort((a, b) => a.period.localeCompare(b.period));

    // Get revenue by product (don't filter by date for chart display if all time selected)
    const productRevenue = await prisma.product.findMany({
      where: { user_id: decoded.userId },
      select: {
        id: true,
        title: true,
        rentalRequests: {
          where: {
            payment: {
              payment_status: 'completed',
              ...(isAllTime ? {} : {
                payment_date: {
                  gte: startDate,
                  lte: now
                }
              })
            }
          },
          select: {
            payment: {
              select: { amount: true }
            }
          }
        }
      }
    });

    const revenueByProduct = productRevenue.map((product) => ({
      product_id: product.id,
      product_title: product.title,
      revenue: product.rentalRequests.reduce((sum: number, req) => sum + (req.payment?.amount || 0), 0),
      rental_count: product.rentalRequests.length
    })).filter((product) => product.revenue > 0);

    // Format upcoming payment details
    const upcomingPaymentDetails = pendingInvoices.map((invoice) => ({
      id: invoice.id,
      rental_request_id: invoice.rental_request_id,
      product_title: invoice.rentalRequest.product.title,
      customer_name: invoice.rentalRequest.customer.name,
      amount: invoice.amount,
      due_date: invoice.due_date,
      status: invoice.invoice_status === 'overdue' ? 'overdue' : 'pending'
    }));

    const revenueStats = {
      totalRevenue,
      monthlyRevenue: totalRevenue,
      pendingPayments: outstandingAmount,
      completedPayments: totalRevenue,
      upcomingPayments: outstandingAmount,
      totalInvoices: pendingInvoices.length + payments.length,
      paidInvoices: payments.length,
      pendingInvoices: pendingInvoices.filter((inv) => inv.invoice_status === 'pending').length,
      overdueInvoices,
      outstandingAmount,
      revenueByProduct,
      revenueOverTime: chartData,
      upcomingPaymentDetails
    };

    const response = NextResponse.json({
      success: true,
      message: 'Revenue statistics retrieved successfully',
      data: revenueStats
    } as ApiResponse, { status: 200 });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=180');

    return response;
  } catch (error: unknown) {
    console.error('Get revenue stats error:', error);

    const response = NextResponse.json({
      success: false,
      message: 'Failed to retrieve revenue statistics'
    } as ApiResponse, { status: 500 });

    return response;
  }
}
