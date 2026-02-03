import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoicePDF } from '@/components/InvoicePDF';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: isOwnerOrAdmin
      ? { id, user: { companyId: companyId ?? undefined } }
      : { id, userId: user.id },
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
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
