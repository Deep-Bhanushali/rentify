import { PrismaClient } from '@prisma/client';
import { Invoice, CreateInvoiceRequest, InvoiceItem } from '@/types/models';

const prisma = new PrismaClient();

export class InvoiceService {
  /**
   * Generate a unique invoice number
   */
  static generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  /**
   * Calculate rental fees based on rental period and price
   */
  static calculateRentalFee(
    basePrice: number,
    startDate: Date,
    endDate: Date,
    rentalPeriod: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    
    switch (rentalPeriod) {
      case 'hourly':
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        return basePrice * diffHours;
      case 'weekly':
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.ceil(diffDays / 7);
        return basePrice * diffWeeks;
      case 'daily':
      default:
        const diffDaysDefault = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return basePrice * diffDaysDefault;
    }
  }

  /**
   * Calculate tax amount based on subtotal and tax rate
   */
  static calculateTax(subtotal: number, taxRate: number = 0.1): number {
    return subtotal * taxRate;
  }

  /**
   * Calculate total amount including all fees and taxes
   */
  static calculateTotal(
    subtotal: number,
    taxAmount: number,
    lateFee: number = 0,
    damageFee: number = 0,
    additionalCharges: number = 0
  ): number {
    return subtotal + taxAmount + lateFee + damageFee + additionalCharges;
  }

  /**
   * Create an invoice for a rental request
   */
  static async createInvoice(
    rentalRequestId: string,
    dueDate: Date,
    notes?: string,
    taxRate: number = 0.1
  ): Promise<Invoice> {
    // Get rental request details
    const rentalRequest = await prisma.rentalRequest.findUnique({
      where: { id: rentalRequestId },
      include: {
        product: true,
        customer: true
      }
    });

    if (!rentalRequest) {
      throw new Error('Rental request not found');
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { rental_request_id: rentalRequestId }
    });

    if (existingInvoice) {
      throw new Error('Invoice already exists for this rental request');
    }

    // Calculate fees
    const subtotal = this.calculateRentalFee(
      rentalRequest.price,
      rentalRequest.start_date,
      rentalRequest.end_date
    );
    const taxAmount = this.calculateTax(subtotal, taxRate);
    const totalAmount = this.calculateTotal(subtotal, taxAmount);

    // Create invoice
    const newInvoice = await prisma.invoice.create({
      data: {
        rental_request_id: rentalRequestId,
        invoice_number: this.generateInvoiceNumber(),
        amount: totalAmount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        subtotal: subtotal,
        invoice_status: 'pending',
        due_date: dueDate,
        notes: notes || null
      },
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
        },
        invoiceItems: true
      }
    });

    try {
      // Create invoice items within a transaction to ensure consistency
      await prisma.$transaction(async (tx) => {
        // Create rental fee item
        await tx.invoiceItem.create({
          data: {
            invoice_id: newInvoice.id,
            description: `Rental fee for ${rentalRequest.product.title}`,
            quantity: 1,
            unit_price: subtotal,
            total_price: subtotal,
            item_type: 'rental_fee'
          }
        });
      });

      // Fetch the invoice with items after transaction
      const finalInvoice = await prisma.invoice.findUnique({
        where: { id: newInvoice.id },
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
          },
        invoiceItems: true
        }
      });

      return finalInvoice || newInvoice;
    } catch (error) {
      console.error('Failed to create invoice items, cleaning up invoice:', error);
      // If items creation fails, delete the invoice to maintain data integrity
      await prisma.invoice.delete({
        where: { id: newInvoice.id }
      }).catch(cleanupError => {
        console.error('Failed to cleanup invoice after item creation failure:', cleanupError);
      });
      throw error;
    }
  }

  /**
   * Add late fee to an invoice
   */
  static async addLateFee(invoiceId: string, lateFee: number): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { invoiceItems: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Update invoice amount
    const newAmount = this.calculateTotal(
      invoice.subtotal,
      invoice.tax_amount,
      lateFee,
      invoice.damage_fee,
      invoice.additional_charges
    );

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount,
        late_fee: lateFee
      },
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
        },
        invoiceItems: true
      }
    });

    // Update or create late fee invoice item
    await prisma.invoiceItem.upsert({
      where: {
        invoice_id_item_type: {
          invoice_id: invoiceId,
          item_type: 'late_fee'
        }
      },
      update: {
        unit_price: lateFee,
        total_price: lateFee
      },
      create: {
        invoice_id: invoiceId,
        description: 'Late fee',
        quantity: 1,
        unit_price: lateFee,
        total_price: lateFee,
        item_type: 'late_fee'
      }
    });

    return updatedInvoice;
  }

  /**
   * Add damage fee to an invoice
   */
  static async addDamageFee(invoiceId: string, damageFee: number): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { invoiceItems: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Update invoice amount
    const newAmount = this.calculateTotal(
      invoice.subtotal,
      invoice.tax_amount,
      invoice.late_fee,
      damageFee,
      invoice.additional_charges
    );

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount,
        damage_fee: damageFee
      },
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
        },
        invoiceItems: true
      }
    });

    // Update or create damage fee invoice item
    await prisma.invoiceItem.upsert({
      where: {
        invoice_id_item_type: {
          invoice_id: invoiceId,
          item_type: 'damage_fee'
        }
      },
      update: {
        unit_price: damageFee,
        total_price: damageFee
      },
      create: {
        invoice_id: invoiceId,
        description: 'Damage fee',
        quantity: 1,
        unit_price: damageFee,
        total_price: damageFee,
        item_type: 'damage_fee'
      }
    });

    return updatedInvoice;
  }

  /**
   * Add additional charges to an invoice
   */
  static async addAdditionalCharges(invoiceId: string, additionalCharges: number): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { invoiceItems: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Update invoice amount
    const newAmount = this.calculateTotal(
      invoice.subtotal,
      invoice.tax_amount,
      invoice.late_fee,
      invoice.damage_fee,
      additionalCharges
    );

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: newAmount,
        additional_charges: additionalCharges
      },
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
        },
        invoiceItems: true
      }
    });

    // Update or create additional charges invoice item
    await prisma.invoiceItem.upsert({
      where: {
        invoice_id_item_type: {
          invoice_id: invoiceId,
          item_type: 'additional_charge'
        }
      },
      update: {
        unit_price: additionalCharges,
        total_price: additionalCharges
      },
      create: {
        invoice_id: invoiceId,
        description: 'Additional charges',
        quantity: 1,
        unit_price: additionalCharges,
        total_price: additionalCharges,
        item_type: 'additional_charge'
      }
    });

    return updatedInvoice;
  }

  /**
   * Mark an invoice as paid
   */
  static async markAsPaid(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        invoice_status: 'paid',
        paid_date: new Date()
      },
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
        },
        invoiceItems: true
      }
    });

    return invoice;
  }

  /**
   * Check for overdue invoices and update their status
   */
  static async checkOverdueInvoices(): Promise<void> {
    const now = new Date();
    
    // Find all pending invoices that are past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        invoice_status: 'sent',
        due_date: {
          lt: now
        }
      }
    });

    // Update status to overdue
    for (const invoice of overdueInvoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { invoice_status: 'overdue' }
      });
    }
  }

  /**
   * Get invoice statistics for a user
   */
  static async getInvoiceStatistics(userId: string) {
    // Get all invoices related to the user (as customer or owner)
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          {
            rentalRequest: {
              customer_id: userId
            }
          },
          {
            rentalRequest: {
              product: {
                user_id: userId
              }
            }
          }
        ]
      }
    });

    // Calculate statistics
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv: any) => inv.invoice_status === 'paid').length;
    const pendingInvoices = invoices.filter((inv: any) => inv.invoice_status === 'pending' || inv.invoice_status === 'sent').length;
    const overdueInvoices = invoices.filter((inv: any) => inv.invoice_status === 'overdue').length;
    
    const totalRevenue = invoices
      .filter((inv: any) => inv.invoice_status === 'paid')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);
    
    const outstandingAmount = invoices
      .filter((inv: any) => inv.invoice_status !== 'paid' && inv.invoice_status !== 'cancelled')
      .reduce((sum: number, inv: any) => sum + inv.amount, 0);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalRevenue,
      outstandingAmount
    };
  }
}
