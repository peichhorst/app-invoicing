// src/app/api/invoices/route.ts
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

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
      const invoiceNumber = body.invoiceNumber || (await generateInvoiceNumber(tx));

      return tx.invoice.create({
        data: {
          invoiceNumber,
          issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes?.trim() ? body.notes.trim() : null,
          client: { connect: { id: body.clientId } },
          user: { connect: { id: currentUser.id } },
          status: 'SENT',
          currency: 'USD',
          subTotal: totals.subTotal,
          taxRate: taxRatePercent,
          taxAmount: totals.taxAmount,
          total: totals.subTotal,
          items: {
            create: itemsForCreate,
          },
        },
        include: {
          client: true,
          items: true,
          user: true,
        },
      });
    })) as Prisma.InvoiceGetPayload<{ include: { client: true; items: true; user: true } }>;

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

async function generateInvoiceNumber(tx: Prisma.TransactionClient | typeof prisma) {
  const last = await tx.invoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = (last ? Number(last.invoiceNumber) || 0 : 0) + 1;
  return next.toString();
}
