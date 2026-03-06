import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoicePDF } from '@/components/InvoicePDF';
import { resolveAppBaseUrl } from '@/lib/app-url';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const toSafeFilePart = (value?: string | null) =>
  (value || 'Unknown')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60) || 'Unknown';

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
    include: { client: { include: { portalUser: true } }, items: true, user: { include: { company: true } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const portalToken = invoice.client?.portalUser?.portalToken ?? null;
  const portalLink = portalToken
    ? `${resolveAppBaseUrl()}/client/${encodeURIComponent(portalToken)}`
    : null;

  const pdfElement = React.createElement(InvoicePDF as any, {
    invoice,
    client: invoice.client,
    user: invoice.user,
    portalLink,
  }) as React.ReactElement;

  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const body = new Uint8Array(pdfBuffer);
  const companyName = toSafeFilePart(
    invoice.user?.company?.name ?? invoice.user?.companyName ?? invoice.user?.name
  );
  const clientName = toSafeFilePart(
    invoice.client?.companyName ?? invoice.client?.contactName ?? invoice.client?.email
  );
  const invoiceNumber = toSafeFilePart(invoice.invoiceNumber);
  const filename = `${companyName} - ${clientName} - Invoice ${invoiceNumber}.pdf`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
