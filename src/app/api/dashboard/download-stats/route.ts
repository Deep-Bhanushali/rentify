import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ApiResponse } from '@/types/models';
import { unstable_cache } from 'next/cache';

const prisma = new PrismaClient();

// GET /api/dashboard/download-stats - Retrieve download statistics
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

    // Cache download statistics for 60 seconds
    const downloadStats = await unstable_cache(
      async () => {
        // Get user's products
        const products: { id: string }[] = await prisma.product.findMany({
          where: { user_id: decoded.userId },
          select: { id: true }
        });

        const productIds = products.map((p: { id: string }) => p.id);

        // Get total invoices for user's products
        const totalInvoices = await prisma.invoice.count({
          where: {
            rentalRequest: {
              product_id: { in: productIds }
            }
          }
        });

        // For now, return basic stats without download tracking
        // (since we don't have an invoiceDownload model in the schema)
        return {
          totalInvoices,
          downloadedInvoices: 0,
          pdfDownloads: 0,
          excelDownloads: 0,
          csvDownloads: 0
        };
      },
      [`dashboard-download-stats-${decoded.userId}`],
      {
        revalidate: 90, // Revalidate every 60 seconds
        tags: ['dashboard'] // Tag for cache invalidation
      }
    )();

    const response: ApiResponse = {
      success: true,
      message: 'Download statistics retrieved successfully',
      data: downloadStats
    };

    const nextResponse = NextResponse.json(response, { status: 200 });

    // Add caching headers
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return nextResponse;
  } catch (error: unknown) {
    console.error('Get download stats error:', error);

    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve download statistics'
    };

    return NextResponse.json(response, { status: 500 });
  }
}
