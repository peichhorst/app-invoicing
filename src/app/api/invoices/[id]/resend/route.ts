// src/app/api/invoices/[id]/resend/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const invoice = (await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    })) as Prisma.InvoiceGetPayload<{ include: { client: true; items: true } }> | null;

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

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

    await sendInvoiceEmail(emailInvoice, invoice.client);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resend invoice failed:', error);
    return NextResponse.json(
      { error: 'Failed to resend invoice', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
