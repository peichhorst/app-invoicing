'use server';

import { prisma } from '@lib/prisma';
import { InvoiceStatus, type Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

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
  dueDate?: string | null;
  notes?: string | null;
  status: InvoiceStatus;
  items: LineItemInput[];
};

export async function fetchClientOptionsAction(): Promise<ClientOption[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
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
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const client = await prisma.client.findUnique({
    where: { id: payload.clientId },
    select: { id: true, userId: true },
  });

  if (!client || client.userId !== user.id) {
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

  const created = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx, user.id);

    const record = await tx.invoice.create({
      data: {
        clientId: payload.clientId,
        userId: user.id,
        invoiceNumber,
        status: payload.status,
        issueDate: new Date(payload.issueDate),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
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

    return { invoiceNumber, id: record.id };
  });

  return created;
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient | typeof prisma, userId: string) {
  const last = await tx.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = (last ? Number(last.invoiceNumber) || 0 : 0) + 1;
  return next.toString();
}
