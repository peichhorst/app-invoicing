import { Prisma, Invoice, InvoiceItem, InvoiceStatus, User, Client, Prisma as PrismaTypes } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { sendInvoiceEmail } from '@/lib/email';
import { InvoicePDF } from '@/components/InvoicePDF';
import { renderToBuffer } from '@react-pdf/renderer';
import { DocumentPreview } from '@/components/invoicing/DocumentPreview';
import React, { ReactElement } from 'react';
import { uploadToCloudinary, generatePublicId } from '@/lib/cloudinary';

// Define types for input parameters
interface CreateInvoiceInput {
  userId: string;
  clientId: string;
  title?: string;
  issueDate: Date;
  dueDate?: Date | null;
  notes?: string;
  status?: InvoiceStatus;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: PrismaTypes.Decimal;
    taxRate?: PrismaTypes.Decimal | null;
  }>;
  recurring?: boolean;
  recurringInterval?: string | null;
  recurringDayOfMonth?: number | null;
  recurringDayOfWeek?: number | null;
  nextOccurrence?: Date | null;
  invoiceNumber: string;
  sendEmail?: boolean;
}

interface UpdateInvoiceInput {
  id: string;
  title?: string;
  issueDate?: Date;
  dueDate?: Date | null;
  notes?: string;
  status?: InvoiceStatus;
  items?: Array<{
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: PrismaTypes.Decimal;
    taxRate?: PrismaTypes.Decimal | null;
  }>;
}

/**
 * Centralized tax calculation function
 */
function calculateTaxAmount(amount: PrismaTypes.Decimal, taxRate: PrismaTypes.Decimal | null | undefined): PrismaTypes.Decimal {
  if (!taxRate || taxRate.isZero()) {
    return new PrismaTypes.Decimal(0);
  }
  
  // Calculate tax: amount * (taxRate / 100)
  const taxMultiplier = taxRate.dividedBy(100);
  return amount.times(taxMultiplier).toDecimalPlaces(2);
}

/**
 * Calculate item total with tax
 */
function calculateItemTotal(
  quantity: number, 
  unitPrice: PrismaTypes.Decimal, 
  taxRate: PrismaTypes.Decimal | null | undefined
): { subtotal: PrismaTypes.Decimal; taxAmount: PrismaTypes.Decimal; total: PrismaTypes.Decimal } {
  const quantityDecimal = new PrismaTypes.Decimal(quantity);
  const subtotal = unitPrice.times(quantityDecimal);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const total = subtotal.plus(taxAmount);
  
  return { subtotal, taxAmount, total };
}

/**
 * Calculate invoice totals based on items
 */
function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    unitPrice: PrismaTypes.Decimal;
    taxRate?: PrismaTypes.Decimal | null;
  }>
): { subTotal: PrismaTypes.Decimal; taxAmount: PrismaTypes.Decimal; total: PrismaTypes.Decimal } {
  let subTotal = new PrismaTypes.Decimal(0);
  let taxAmount = new PrismaTypes.Decimal(0);
  
  for (const item of items) {
    const itemCalculations = calculateItemTotal(item.quantity, item.unitPrice, item.taxRate);
    subTotal = subTotal.plus(itemCalculations.subtotal);
    
    // Only add tax if applicable
    if (item.taxRate && !item.taxRate.isZero()) {
      taxAmount = taxAmount.plus(itemCalculations.taxAmount);
    }
  }
  
  const total = subTotal.plus(taxAmount);
  
  return {
    subTotal,
    taxAmount,
    total
  };
}

/**
 * Generate and upload PDF for an invoice
 */
async function generateAndUploadInvoicePDF(invoice: Invoice, client: Client, user: User): Promise<string> {
  // Get the invoice with items to generate the PDF
  const invoiceWithItems = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { items: true }
  });

  if (!invoiceWithItems) {
    throw new Error('Invoice not found');
  }

  // Prepare data for PDF generation
  const pdfElement = React.createElement(InvoicePDF as any, { 
    invoice: invoiceWithItems, 
    client, 
    user 
  }) as ReactElement;
  
  const pdfBuffer = await renderToBuffer(pdfElement as any);
  
  // Generate a unique public ID for Cloudinary
  const publicId = generatePublicId('invoice', invoice.id);
  
  // Upload to Cloudinary
  const result = await uploadToCloudinary(pdfBuffer, publicId, 'raw');
  
  return result.secure_url;
}

/**
 * Create a new invoice with proper totals, tax calculation, and optional email.
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  // Validate input
  if (!input.userId || !input.clientId) {
    throw new Error('User ID and Client ID are required');
  }

  // Calculate totals from items
  const totals = calculateInvoiceTotals(input.items);
  
  // Create invoice with calculated totals
  const invoice = await prisma.$transaction(async (tx) => {
    // Create the main invoice
    const newInvoice = await tx.invoice.create({
      data: {
        userId: input.userId,
        clientId: input.clientId,
        invoiceNumber: input.invoiceNumber,
        title: input.title || `Invoice ${input.invoiceNumber}`,
        status: input.status || 'DRAFT',
        issueDate: input.issueDate,
        dueDate: input.dueDate || null,
        notes: input.notes,
        pdfUrl: null, // Initialize as null, will be populated when sent
        subTotal: totals.subTotal,
        taxRate: new PrismaTypes.Decimal(0), // Tax rate is handled at item level
        taxAmount: totals.taxAmount,
        total: totals.total,
        sentCount: input.sendEmail !== false ? 1 : 0,
        recurring: Boolean(input.recurring),
        recurringInterval: input.recurringInterval || null,
        recurringDayOfMonth: input.recurringDayOfMonth || null,
        recurringDayOfWeek: input.recurringDayOfWeek || null,
        nextOccurrence: input.nextOccurrence || null,
      },
    });

    // Create invoice items
    for (const item of input.items) {
      const itemCalculations = calculateItemTotal(item.quantity, item.unitPrice, item.taxRate);
      
      await tx.invoiceItem.create({
        data: {
          invoiceId: newInvoice.id,
          name: item.name,
          description: item.description || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || null,
          total: itemCalculations.total,
        },
      });
    }

    return newInvoice;
  });

  // Send email if requested
  if (input.sendEmail !== false) {
    const [invoiceWithRelations, user, client] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true }
      }),
      prisma.user.findUnique({ where: { id: input.userId } }),
      prisma.client.findUnique({ where: { id: input.clientId } })
    ]);

    if (invoiceWithRelations && user && client) {
      // Generate and store PDF if status is SENT or UNPAID
      let finalInvoice = invoiceWithRelations;
      if (['SENT', 'UNPAID'].includes(invoiceWithRelations.status)) {
        const pdfUrl = await generateAndUploadInvoicePDF(invoiceWithRelations, client, user);
        // Update the invoice with the PDF URL
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl }
        });
        
        // Refresh the invoice data to include the pdfUrl
        finalInvoice = await prisma.invoice.findUnique({
          where: { id: invoice.id },
          include: { items: true }
        })!;
      }
      
      await sendInvoiceEmail(finalInvoice, client, user);
    }
  }

  return invoice;
}

/**
 * Update an existing invoice with new items and recalculate totals
 */
export async function updateInvoice(input: UpdateInvoiceInput): Promise<Invoice> {
  // Calculate new totals
  const totals = calculateInvoiceTotals(input.items || []);
  
  const updatedInvoice = await prisma.$transaction(async (tx) => {
    // Update the invoice with new totals
    const updatedInvoice = await tx.invoice.update({
      where: { id: input.id },
      data: {
        title: input.title,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        notes: input.notes,
        pdfUrl: { set: undefined }, // Preserve existing pdfUrl, don't change it through update
        status: input.status,
        subTotal: totals.subTotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
      },
    });

    // If items are provided, update them
    if (input.items && input.items.length > 0) {
      // Delete existing items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: input.id },
      });

      // Create new items
      for (const item of input.items) {
        const itemCalculations = calculateItemTotal(item.quantity, item.unitPrice, item.taxRate);
        
        await tx.invoiceItem.create({
          data: {
            invoiceId: updatedInvoice.id,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || null,
            total: itemCalculations.total,
          },
        });
      }
    }

    return updatedInvoice;
  });

  // Generate and store PDF if status changes to SENT or UNPAID
  let finalInvoice = updatedInvoice;
  if (['SENT', 'UNPAID'].includes(input.status!) && !updatedInvoice.pdfUrl) {
    const [invoiceWithItems, client, user] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: updatedInvoice.id },
        include: { items: true }
      }),
      prisma.client.findUnique({ where: { id: updatedInvoice.clientId! } }),
      prisma.user.findUnique({ where: { id: updatedInvoice.userId } })
    ]);

    if (invoiceWithItems && client && user) {
      const pdfUrl = await generateAndUploadInvoicePDF(invoiceWithItems, client, user);
      // Update the invoice with the PDF URL
      await prisma.invoice.update({
        where: { id: updatedInvoice.id },
        data: { pdfUrl }
      });
      
      // Refresh the invoice data to include the pdfUrl
      finalInvoice = await prisma.invoice.findUnique({
        where: { id: updatedInvoice.id },
        include: { items: true }
      })!;
    }
  }

  return finalInvoice;
}

/**
 * Get an invoice with all related data
 */
export async function getInvoice(id: string): Promise<(Invoice & { 
  items: InvoiceItem[]; 
  user: User; 
  client: Client | null 
}) | null> {
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' }
      },
      user: true,
      client: true,
    },
  });
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string): Promise<void> {
  await prisma.invoice.delete({
    where: { id },
  });
}

/**
 * Generate a unique invoice number for a user
 */
export async function generateInvoiceNumber(userId: string): Promise<string> {
  const count = await prisma.invoice.count({
    where: { userId }
  });
  
  // Generate a sequential invoice number with prefix
  return `INV-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Calculate tax for a given amount and rate
 * Exposed for use by other services
 */
export { calculateTaxAmount, calculateInvoiceTotals, calculateItemTotal };