import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import prisma from '@/lib/prisma';
import { InvoicePDF } from '@/components/InvoicePDF';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing invoice slug' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { shortCode: slug },
    include: { client: true, items: true, user: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const pdfElement = React.createElement(InvoicePDF as any, {
    invoice,
    client: invoice.client,
    user: invoice.user,
  }) as React.ReactElement;

  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
