'use server';

import { prisma } from '@lib/prisma';
import { InvoiceStatus } from '@prisma/client';

export type ClientOption = {
  id: string;
  companyName: string;
  contactName: string | null;
};

type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export type CreateInvoicePayload = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  status: InvoiceStatus;
  items: LineItemInput[];
};

export async function fetchClientOptionsAction(): Promise<ClientOption[]> {
  const clients = await prisma.client.findMany({
    orderBy: { companyName: 'asc' },
    select: {
      id: true,
      companyName: true,
      contactName: true,
    },
  });

  return clients;
}

export async function createInvoiceAction(
  payload: CreateInvoicePayload
): Promise<{ invoiceNumber: string; id: string }> {
  const client = await prisma.client.findUnique({
    where: { id: payload.clientId },
    select: { id: true, userId: true },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const computedTotals = payload.items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const rate = Number(item.taxRate) || 0;
      const lineSubtotal = quantity * unitPrice;
      const lineTax = lineSubtotal * (rate / 100);

      acc.subtotal += lineSubtotal;
      acc.tax += lineTax;
      acc.total += lineSubtotal + lineTax;

      return acc;
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  const invoiceNumber = await generateInvoiceNumber(payload.clientId);

  const created = await prisma.invoice.create({
    data: {
      clientId: payload.clientId,
      userId: client.userId,
      invoiceNumber,
      status: payload.status,
      issueDate: new Date(payload.issueDate),
      dueDate: new Date(payload.dueDate),
      currency: 'USD',
      subTotal: computedTotals.subtotal,
      taxRate: computedTotals.subtotal > 0 ? (computedTotals.tax / computedTotals.subtotal) * 100 : 0,
      taxAmount: computedTotals.tax,
      total: computedTotals.total,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
      items: {
        create: payload.items.map((item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const rate = Number(item.taxRate) || 0;
          const lineSubtotal = quantity * unitPrice;
          const lineTax = lineSubtotal * (rate / 100);

          return {
            name: item.description,
            description: item.description,
            quantity,
            unitPrice,
            taxRate: rate,
            total: lineSubtotal + lineTax,
          };
        }),
      },
    },
  });

  return { invoiceNumber, id: created.id };
}

async function generateInvoiceNumber(clientId: string) {
  const count = await prisma.invoice.count({ where: { clientId } });
  const next = count + 1;
  return next.toString();
}
