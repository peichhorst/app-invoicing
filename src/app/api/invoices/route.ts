// src/app/api/invoices/route.ts
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { createInvoice } from '@/services/InvoiceService';
import { createRecurringInvoice } from '@/services/SubscriptionService';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await prisma.client.findFirst({
      where: { id: body.clientId, ...clientVisibilityWhere(currentUser) },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Use InvoiceService to create invoice with proper totals
    const invoice = await createInvoice({
      userId: currentUser.id,
      clientId: client.id,
      title: body.title,
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes,
      status: 'UNPAID',
      items: body.items || [],
      recurring: Boolean(body.recurring),
      recurringInterval: body.recurringInterval ?? null,
      recurringDayOfMonth: body.recurringDayOfMonth ?? null,
      recurringDayOfWeek: body.recurringDayOfWeek ?? null,
      nextOccurrence: body.nextOccurrence ? new Date(body.nextOccurrence) : null,
      invoiceNumber: body.invoiceNumber,
      sendEmail: true,
    });

    // If recurring, create the recurring invoice record using SubscriptionService
    if (body.recurring && body.recurringInterval && body.nextOccurrence) {
      const recurringInvoice = await createRecurringInvoiceSchedule({
        clientId: client.id,
        userId: currentUser.id,
        title: (body.title?.trim() || body.notes?.trim()) || 'Recurring invoice',
        amount: new Prisma.Decimal(invoice.total),
        currency: invoice.currency,
        interval: body.recurringInterval,
        dayOfMonth:
          body.recurringInterval && ['month', 'quarter', 'year'].includes(body.recurringInterval)
            ? body.recurringDayOfMonth ?? null
            : null,
        dayOfWeek: body.recurringInterval === 'week' ? body.recurringDayOfWeek ?? null : null,
        nextSendDate: new Date(body.nextOccurrence),
      });

      // Link the invoice to the recurring parent
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { recurringParentId: recurringInvoice.id },
      });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Invoice creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  }
}
