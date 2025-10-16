// Script to add missing invoice items to existing invoices
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingInvoiceItems() {
  try {
    console.log('🔍 Finding invoices without items...');

    // Find all invoices
    const invoices = await prisma.invoice.findMany({
      include: {
        rentalRequest: {
          include: {
            product: true
          }
        },
        invoiceItems: true
      }
    });

    console.log(`📊 Found ${invoices.length} total invoices`);

    let fixedCount = 0;

    for (const invoice of invoices) {
      // Check if invoice has items
      if (!invoice.invoiceItems || invoice.invoiceItems.length === 0) {
        console.log(`📝 Invoice ${invoice.invoice_number} is missing items, creating them...`);

        try {
          // Calculate rental fee
          const rentalFee = invoice.subtotal;

          // Calculate tax
          const taxAmount = invoice.tax_amount;

          // Create rental fee item
          await prisma.invoiceItem.create({
            data: {
              invoice_id: invoice.id,
              description: `Rental fee for ${invoice.rentalRequest.product.title}`,
              quantity: 1,
              unit_price: rentalFee,
              total_price: rentalFee,
              item_type: 'rental_fee'
            }
          });

          // Create tax item
          await prisma.invoiceItem.create({
            data: {
              invoice_id: invoice.id,
              description: `Tax (${(invoice.tax_rate * 100).toFixed(0)}%)`,
              quantity: 1,
              unit_price: taxAmount,
              total_price: taxAmount,
              item_type: 'tax'
            }
          });

          console.log(`✅ Added items to invoice ${invoice.invoice_number}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Failed to add items to invoice ${invoice.invoice_number}:`, error);
        }
      }
    }

    console.log(`🎉 Fixed ${fixedCount} invoices with missing items`);
    console.log('✅ Invoice items population complete!');

  } catch (error) {
    console.error('❌ Error in script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingInvoiceItems();
