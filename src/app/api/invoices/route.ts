// src/app/api/invoices/route.ts
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

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

    const invoiceNumber = body.invoiceNumber || (await generateInvoiceNumber(body.clientId));

    // Temporary owner until auth is wired
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Demo User',
          email: 'demo@example.com',
          password: 'placeholder',
        },
      });
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

    const total = totals.subTotal;
    const taxRatePercent = 0;

    const invoice = (await prisma.invoice.create({
      data: {
        invoiceNumber,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(),
        notes: body.notes?.trim() ? body.notes.trim() : null,
        client: { connect: { id: body.clientId } },
        user: { connect: { id: user.id } },
        status: 'SENT',
        currency: 'USD',
        subTotal: totals.subTotal,
        taxRate: taxRatePercent,
        taxAmount: totals.taxAmount,
        total,
        items: {
          create: itemsForCreate,
        },
      },
      include: {
        client: true,
        items: true,
      },
    })) as Prisma.InvoiceGetPayload<{ include: { client: true; items: true } }>;

    const emailInvoice = {
      ...invoice,
      dueDays: Math.max(
        0,
        Math.round(
          (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      ),
      items: invoice.items.map((item) => ({
        ...item,
        amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
      })),
    };

    await sendInvoiceEmail(emailInvoice, invoice.client);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Invoice creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  }
}

async function generateInvoiceNumber(clientId: string) {
  const count = await prisma.invoice.count({ where: { clientId } });
  const next = count + 1;
  return next.toString();
}
