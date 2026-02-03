import { Prisma, RecurringInvoice, Prisma as PrismaTypes } from '@prisma/client';
import { InvoiceStatus, Invoice } from '@/lib/prisma-types';
import prisma from '@/lib/prisma';
import { createInvoice } from './InvoiceService';
import { sendInvoiceEmail } from '@/lib/email';

interface CreateRecurringInvoiceInput {
  clientId: string;
  userId: string;
  title: string;
  amount: PrismaTypes.Decimal;
  currency?: string;
  interval: string; // 'day', 'week', 'month', 'year'
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  nextSendDate: Date;
  sendFirstNow?: boolean;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: PrismaTypes.Decimal;
    taxRate?: PrismaTypes.Decimal | null;
  }>;
}

/**
 * Create a recurring invoice with associated schedule
 */
export async function createRecurringInvoice(input: CreateRecurringInvoiceInput): Promise<{ recurringInvoice: RecurringInvoice; firstInvoice?: Invoice }> {
  // Create the recurring invoice schedule
  const recurringInvoice = await prisma.recurringInvoice.create({
    data: {
      clientId: input.clientId,
      userId: input.userId,
      title: input.title,
      amount: input.amount,
      currency: input.currency || 'USD',
      interval: input.interval,
      dayOfMonth: input.dayOfMonth || null,
      dayOfWeek: input.dayOfWeek || null,
      nextSendDate: input.nextSendDate,
      status: 'ACTIVE', // Changed from PENDING to ACTIVE since it's just been created
      sendFirstNow: input.sendFirstNow ?? true,
    },
  });

  let firstInvoice: Invoice | undefined;

  // Optionally create the first invoice immediately
  if (input.sendFirstNow !== false) {
    const invoiceItems = input.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxRate: item.taxRate == null ? null : Number(item.taxRate),
    }));

    // Generate a unique invoice number
    const invoiceCount = await prisma.invoice.count({
      where: { userId: input.userId }
    });
    
    const newInvoice = await createInvoice({
      userId: input.userId,
      clientId: input.clientId,
      title: `${input.title} - Initial Invoice`,
      issueDate: new Date(),
      dueDate: null, // Could be configurable
      notes: `Initial invoice for recurring series: ${input.title}`,
      status: InvoiceStatus.OPEN,
      items: invoiceItems,
      recurring: true,
      recurringInterval: input.interval,
      recurringDayOfMonth: input.dayOfMonth || null,
      recurringDayOfWeek: input.dayOfWeek || null,
      nextOccurrence: getNextOccurrence(new Date(), input.interval, input.dayOfMonth, input.dayOfWeek),
      invoiceNumber: `SUB-${String(invoiceCount + 1).padStart(4, '0')}`,
      sendEmail: true, // Send immediately for the first invoice
    });

    firstInvoice = newInvoice;

    // Link the first invoice to the recurring parent
    await prisma.invoice.update({
      where: { id: firstInvoice.id },
      data: { recurringParentId: recurringInvoice.id },
    });
  }

  return { recurringInvoice, firstInvoice };
}

/**
 * Create a recurring invoice schedule only (without creating the first invoice)
 * Used when creating recurring invoices from the API route after the initial invoice is already created
 */
export async function createRecurringInvoiceSchedule(data: {
  clientId: string;
  userId: string;
  title: string;
  amount: PrismaTypes.Decimal;
  currency: string;
  interval: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  nextSendDate: Date;
}): Promise<RecurringInvoice> {
  return await prisma.recurringInvoice.create({
    data: {
      clientId: data.clientId,
      userId: data.userId,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      interval: data.interval,
      dayOfMonth: data.dayOfMonth,
      dayOfWeek: data.dayOfWeek,
      nextSendDate: data.nextSendDate,
      status: 'ACTIVE',
      sendFirstNow: false,
    },
  });
}

/**
 * Process all due recurring invoices: generate new invoices, attempt auto-payment, send emails.
 */
export async function processDueRecurringInvoices(): Promise<{ processed: number; errors: Array<{ id: string; error: any }> }> {
  const now = new Date();
  const errors: Array<{ id: string; error: any }> = [];

  // Find all recurring invoices that are due
  const dueRecurringInvoices = await prisma.recurringInvoice.findMany({
    where: {
      nextSendDate: { lte: now },
      status: 'ACTIVE', // Only process active recurring invoices
    },
  });

  let processedCount = 0;

  for (const recurringInvoice of dueRecurringInvoices) {
    try {
      // Get the client and user details
      const [client, user] = await Promise.all([
        prisma.client.findUnique({ where: { id: recurringInvoice.clientId } }),
        prisma.user.findUnique({ where: { id: recurringInvoice.userId } }),
      ]);

      if (!client || !user) {
        throw new Error(`Missing client (${recurringInvoice.clientId}) or user (${recurringInvoice.userId})`);
      }

      // Get items based on the recurring invoice (could be stored differently in your schema)
      // For now, we'll create a simple line item based on the recurring amount
      const items = [{
        name: recurringInvoice.title,
        description: `Recurring payment for ${recurringInvoice.title}`,
        quantity: 1,
        unitPrice: Number(recurringInvoice.amount),
        taxRate: null, // Could be configured per recurring invoice
      }];

      // Generate a unique invoice number
      const invoiceCount = await prisma.invoice.count({
        where: { userId: recurringInvoice.userId }
      });

      // Create new invoice using the InvoiceService
      const invoice = await createInvoice({
        userId: recurringInvoice.userId,
        clientId: recurringInvoice.clientId,
        title: `${recurringInvoice.title} - ${now.toLocaleDateString()}`,
        issueDate: now,
        dueDate: null, // Could be configurable
        notes: `Recurring invoice from series: ${recurringInvoice.title}`,
        status: InvoiceStatus.OPEN,
        items,
        recurring: true,
        recurringInterval: recurringInvoice.interval,
        recurringDayOfMonth: recurringInvoice.dayOfMonth,
        recurringDayOfWeek: recurringInvoice.dayOfWeek,
        nextOccurrence: getNextOccurrence(now, recurringInvoice.interval, recurringInvoice.dayOfMonth, recurringInvoice.dayOfWeek),
        invoiceNumber: `SUB-${String(invoiceCount + 1).padStart(4, '0')}`,
        sendEmail: true, // Send invoice email
      });

      // Update the recurring invoice with the next send date
      const nextSendDate = getNextOccurrence(now, recurringInvoice.interval, recurringInvoice.dayOfMonth, recurringInvoice.dayOfWeek);
      
      await prisma.recurringInvoice.update({
        where: { id: recurringInvoice.id },
        data: {
          nextSendDate,
        },
      });

      // Link the generated invoice to the recurring parent
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { recurringParentId: recurringInvoice.id },
      });

      processedCount++;
    } catch (error: any) {
      console.error(`Failed to process recurring invoice ${recurringInvoice.id}:`, error);
      errors.push({ id: recurringInvoice.id, error: error.message });
    }
  }

  return { processed: processedCount, errors };
}

/**
 * Get the next occurrence date based on the interval
 */
function getNextOccurrence(
  from: Date,
  interval: string,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date {
  const nextDate = new Date(from);

  switch (interval.toLowerCase()) {
    case 'day':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'week':
      // If dayOfWeek is specified, find the next occurrence of that day
      if (dayOfWeek !== undefined && dayOfWeek !== null) {
        const currentDayOfWeek = nextDate.getDay(); // 0 (Sunday) to 6 (Saturday)
        let daysToAdd = dayOfWeek - currentDayOfWeek;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Add a week if the day has passed
        }
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'month':
      // If dayOfMonth is specified, set to that day of the next month
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(dayOfMonth);
        // Handle months that don't have certain days (e.g., Feb 31st -> Mar 3rd)
        if (nextDate.getDate() !== dayOfMonth) {
          // If the target day doesn't exist in the next month, set to last day of that month
          nextDate.setDate(0); // Last day of previous month
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'year':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }

  return nextDate;
}

/**
 * Cancel a recurring invoice subscription
 */
export async function cancelRecurringInvoice(recurringInvoiceId: string): Promise<RecurringInvoice> {
  return await prisma.recurringInvoice.update({
    where: { id: recurringInvoiceId },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Update a recurring invoice
 */
export async function updateRecurringInvoice(
  recurringInvoiceId: string,
  data: Partial<{
    title: string;
    amount: PrismaTypes.Decimal;
    interval: string;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    nextSendDate: Date;
    status: string;
  }>
): Promise<RecurringInvoice> {
  return await prisma.recurringInvoice.update({
    where: { id: recurringInvoiceId },
    data,
  });
}
