import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { ExcelExport } from '@/lib/excelExport';
import { CSVExport } from '@/lib/csvExport';
import { ApiResponse } from '@/types/models';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    let token = request.cookies.get('token')?.value;
    if (!token) {
      // Try Authorization header (for client-side requests)
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

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

    const { invoiceIds, format }: { invoiceIds: string[], format: 'excel' | 'csv' } = await request.json();

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Invoice IDs are required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!['excel', 'csv'].includes(format)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid format. Only excel and csv are supported'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Fetch the invoices with authorization check
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        OR: [
          {
            rentalRequest: {
              customer_id: decoded.userId
            }
          },
          {
            rentalRequest: {
              product: {
                user_id: decoded.userId
              }
            }
          }
        ]
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
        },
        invoiceItems: true
      }
    });

    if (invoices.length === 0) {
      const response: ApiResponse = {
        success: false,
        message: 'No invoices found or unauthorized to access'
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if all requested invoices were found
    const foundIds = invoices.map(inv => inv.id);
    const missingIds = invoiceIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      console.warn(`User ${decoded.userId} tried to download unauthorized invoices: ${missingIds.join(', ')}`);
    }

    // Generate the bulk export
    let fileName = `invoices_${format}_${new Date().toISOString().split('T')[0]}`;
    let fileContent: Buffer;

    try {
      if (format === 'excel') {
        // For Excel, we need to create a ZIP file with individual Excel files
        // or create a combined workbook with multiple sheets
        const { createWriteStream } = await import('fs');
        const archiver = (await import('archiver')).default;
        const { tmpdir } = await import('os');
        const { join } = await import('path');

        const archive = archiver('zip');
        const zipPath = join(tmpdir(), `${fileName}.zip`);
        const output = createWriteStream(zipPath);

        archive.pipe(output);

        // Add each invoice as a separate Excel file in the ZIP
        for (const invoice of invoices) {
          const singleExcelBuffer = await ExcelExport.exportInvoiceToExcelBuffer(invoice, {
            includeCharts: true,
            companyName: 'Rentify',
            includeMultipleWorksheets: true
          });

          archive.append(singleExcelBuffer, { name: `invoice_${invoice.invoice_number}.xlsx` });

          // Record download for each invoice
          await prisma.invoiceDownload.create({
            data: {
              invoice_id: invoice.id,
              user_id: decoded.userId,
              format: 'excel',
              success: true
            }
          });
        }

        await new Promise<void>((resolve, reject) => {
          archive.finalize();
          output.on('close', () => resolve());
          output.on('error', reject);
        });

        // Return ZIP data
        const fs = await import('fs');
        fileContent = fs.readFileSync(zipPath);
        fileName += '.zip';

        // Clean up temp file
        fs.unlinkSync(zipPath);
      } else {
        // For CSV, create a combined CSV with multiple invoices
        const csvContent = invoices.map(invoice => {
          const csvData = CSVExport.exportInvoiceToCSV(invoice);
          return csvData;
        }).join('\n\n');

        fileContent = Buffer.from(csvContent, 'utf-8');
        fileName += '.csv';

        // Record downloads for all invoices
        for (const invoice of invoices) {
          await prisma.invoiceDownload.create({
            data: {
              invoice_id: invoice.id,
              user_id: decoded.userId,
              format: 'csv',
              success: true
            }
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        message: `Successfully exported ${invoices.length} invoices to ${format.toUpperCase()}`,
        data: {
          fileName,
          fileContent: fileContent.toString('base64') // Send as base64 for frontend download
        }
      };

      return NextResponse.json(response);
    } catch (exportError) {
      console.error('Export generation error:', exportError);

      // Record failed downloads
      for (const invoice of invoices) {
        try {
          await prisma.invoiceDownload.create({
            data: {
              invoice_id: invoice.id,
              user_id: decoded.userId,
              format,
              success: false
            }
          });
        } catch (recordError) {
          console.error('Failed to record download failure:', recordError);
        }
      }

      throw exportError;
    }
  } catch (error) {
    console.error('Bulk download error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to process bulk download'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
