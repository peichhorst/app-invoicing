// src/app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  return NextResponse.json(invoice);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();

    const itemsInput = Array.isArray(body.items) ? body.items : [];

    const itemsForCreate = itemsInput.map((item: any) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPrice = Number(item.unitPrice ?? 0) || 0;
      const taxRate = 0; // tax disabled for now
      const lineSubtotal = quantity * unitPrice;
      return {
        name: item.name ?? item.description ?? 'Item',
        description: item.description ?? item.name ?? '',
        quantity,
        unitPrice,
        taxRate,
        total: lineSubtotal,
      };
    });

    const totals = itemsForCreate.reduce(
      (acc, item) => {
        const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
        acc.subTotal += lineSubtotal;
        return acc;
      },
      { subTotal: 0 }
    );
    const total = totals.subTotal;

    const updated = (await prisma.invoice.update({
      where: { id },
      data: {
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes?.trim() ? body.notes.trim() : null,
        status: body.status ?? undefined,
        subTotal: totals.subTotal,
        taxRate: 0,
        taxAmount: 0,
        total,
        items: {
          deleteMany: {},
          create: itemsForCreate,
        },
      },
      include: { client: true, items: true },
    })) as Prisma.InvoiceGetPayload<{ include: { client: true; items: true } }>;

    if (updated.status === 'SENT') {
      const emailInvoice = {
        ...updated,
        dueDays: Math.max(
          0,
          Math.round(
            (new Date(updated.dueDate).getTime() - new Date(updated.issueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
        items: updated.items.map((item) => ({
          ...item,
          amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
        })),
      };
      await sendInvoiceEmail(emailInvoice, updated.client);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update invoice failed:', error);
    return NextResponse.json({ error: 'Failed to update invoice', details: error?.message || String(error) }, { status: 500 });
  }
}
