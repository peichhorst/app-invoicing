// src/app/api/invoices/route.ts
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { generateUniqueShortCode } from '@/lib/shortcodes';
import { clientVisibilityWhere } from '@/lib/client-scope';

type IncomingItem = {
  description?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
  amount?: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemsInput: IncomingItem[] = Array.isArray(body.items) ? body.items : [];

    const itemsForCreate = itemsInput.map((item) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPrice = Number(item.unitPrice ?? item.amount ?? 0) || 0;
      const taxRate = 0; // tax disabled for now
      const lineSubtotal = quantity * unitPrice;
      const lineTax = 0;
      return {
        name: item.name ?? item.description ?? 'Item',
        description: item.description ?? item.name ?? '',
        quantity,
        unitPrice,
        taxRate,
        total: lineSubtotal + lineTax,
      };
    });

    const client = await prisma.client.findFirst({
      where: { id: body.clientId, ...clientVisibilityWhere(currentUser) },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const totals = itemsForCreate.reduce(
      (acc, item) => {
        const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
        const lineTax = 0;
        acc.subTotal += lineSubtotal;
        acc.taxAmount += lineTax;
        return acc;
      },
      { subTotal: 0, taxAmount: 0 }
    );

    const taxRatePercent = 0;

    const invoice = (await prisma.$transaction(async (tx) => {
      const invoiceNumber = body.invoiceNumber || (await generateInvoiceNumber(tx, currentUser.id));

      const shortCode = await generateUniqueShortCode(tx);

      const record = await tx.invoice.create({
        data: {
          invoiceNumber,
          issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes?.trim() ? body.notes.trim() : null,
          shortCode,
          client: { connect: { id: client.id } },
          user: { connect: { id: currentUser.id } },
          status: 'SENT',
          sentCount: 1,
          currency: 'USD',
          subTotal: totals.subTotal,
          taxRate: taxRatePercent,
          taxAmount: totals.taxAmount,
          total: totals.subTotal,
          recurring: Boolean(body.recurring),
          recurringInterval: body.recurringInterval ?? null,
          recurringDayOfMonth: body.recurringDayOfMonth ?? null,
          recurringDayOfWeek: body.recurringDayOfWeek ?? null,
          nextOccurrence: body.nextOccurrence ? new Date(body.nextOccurrence) : null,
          items: {
            create: itemsForCreate,
          },
        },
        include: {
          client: true,
          items: true,
          user: {
            include: {
              company: true,
            },
          },
        },
      });

      if (
        body.recurring &&
        body.recurringInterval &&
        body.nextOccurrence &&
        body.clientId
      ) {
            const recurringInvoice = await tx.recurringInvoice.create({
              data: {
                clientId: client.id,
                userId: currentUser.id,
                title: body.notes?.trim() || 'Recurring invoice',
                amount: new Prisma.Decimal(record.total),
                currency: record.currency,
                interval: body.recurringInterval,
                dayOfMonth:
                  body.recurringInterval &&
                  ['month', 'quarter', 'year'].includes(body.recurringInterval)
                    ? body.recurringDayOfMonth ?? null
                    : null,
                dayOfWeek:
                  body.recurringInterval === 'week' ? body.recurringDayOfWeek ?? null : null,
                nextSendDate: new Date(body.nextOccurrence),
                status: 'PENDING',
                sendFirstNow: true,
              },
            });

            // Link the first invoice to the recurring invoice
            await tx.invoice.update({
              where: { id: record.id },
              data: { recurringParentId: recurringInvoice.id },
            });
      }

      return record;
    })) as Prisma.InvoiceGetPayload<{
      include: {
        client: true;
        items: true;
        user: { include: { company: true } };
      };
    }>;

    const dueDays =
      invoice.dueDate != null
        ? Math.max(
            0,
            Math.round(
              (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;

    const emailInvoice = {
      ...invoice,
      dueDays,
      items: invoice.items.map((item) => ({
        ...item,
        amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
      })),
    };

    await sendInvoiceEmail(emailInvoice, invoice.client, invoice.user);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Invoice creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  }
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient | typeof prisma, userId: string) {
  const last = await tx.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = (last ? Number(last.invoiceNumber) || 0 : 0) + 1;
  return next.toString();
}
