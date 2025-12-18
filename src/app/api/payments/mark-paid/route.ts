import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoiceId = body.invoiceId as string | undefined;
    const sellerId = body.sellerId as string | undefined;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, userId: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (sellerId && invoice.userId !== sellerId) {
      return NextResponse.json({ error: 'Invoice does not belong to seller' }, { status: 403 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ ok: true, status: 'PAID', invoiceId });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' as any },
      include: {
        client: true,
        user: { include: { company: true } },
        items: true,
      },
    });

    // Fire and forget: email receipt to client and user
    void sendInvoiceEmail(
      { ...updated, status: 'PAID' },
      updated.client,
      updated.user
    ).catch((err) => console.error('Send paid receipt failed', err));

    return NextResponse.json({ ok: true, status: 'PAID', invoiceId });
  } catch (error: any) {
    console.error('Mark paid failed:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
