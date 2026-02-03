// src/app/api/stripe/v1/calculate/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : null;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        total: true,
        subTotal: true,
        taxAmount: true,
        taxRate: true,
        currency: true,
        status: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Return calculation in the expected format
    return NextResponse.json({
      invoiceId: invoice.id,
      subtotal: Number(invoice.subTotal) || 0,
      tax: Number(invoice.taxAmount) || 0,
      taxRate: Number(invoice.taxRate) || 0,
      total: Number(invoice.total) || 0,
      currency: invoice.currency || 'USD',
      amountInCents: Math.round((Number(invoice.total) || 0) * 100),
    });
  } catch (error: any) {
    console.error('Calculate payment failed', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to calculate payment' },
      { status: 500 }
    );
  }
}
