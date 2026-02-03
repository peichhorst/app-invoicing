// src/app/api/invoices/[id]/resend/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { generateUniqueShortCode } from '@/lib/shortcodes';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const shortCode = existing.shortCode || (await generateUniqueShortCode(prisma));

    const invoice = (await prisma.invoice.update({
      where: { id },
      data: {
        sentCount: (existing.sentCount || 0) + 1,
        status: existing.status === 'PAID' ? 'PAID' : 'UNPAID',
        shortCode,
      },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    })) as Prisma.InvoiceGetPayload<{
      include: { client: true; items: true; user: { include: { company: true } } };
    }>;

    const dueDays =
      invoice.dueDate != null && invoice.issueDate != null
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

    await sendInvoiceEmail(emailInvoice, invoice.client, invoice.user, {
      reminderSubject: `Reminder: Invoice #${invoice.invoiceNumber}`,
      reminderNotice: 'This invoice has been re-sent. Please review it when you have a moment.',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resend invoice failed:', error);
    return NextResponse.json(
      { error: 'Failed to resend invoice', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
