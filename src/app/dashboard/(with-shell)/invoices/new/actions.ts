'use server';

import { prisma } from '@lib/prisma';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';

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
  recurring?: boolean;
  recurringInterval?: 'week' | 'month' | 'quarter' | 'year' | null;
  recurringDayOfMonth?: number | null;
  recurringDayOfWeek?: number | null;
  nextOccurrence?: string | null;
  recurringParentId?: string | null;
};

export async function fetchClientOptionsAction(): Promise<ClientOption[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const clients = await prisma.client.findMany({
    where: clientVisibilityWhere(user),
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
    select: { id: true, companyId: true, assignedToId: true },
  });

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  if (
    !client ||
    client.companyId !== (user.companyId ?? user.company?.id ?? null) ||
    (!isOwnerOrAdmin && client.assignedToId !== user.id)
  ) {
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
            recurring: payload.recurring ?? false,
            recurringInterval: payload.recurringInterval ?? null,
            recurringDayOfMonth: payload.recurringDayOfMonth ?? null,
            recurringDayOfWeek: payload.recurringDayOfWeek ?? null,
            nextOccurrence: payload.nextOccurrence ? new Date(payload.nextOccurrence) : null,
            recurringParentId: payload.recurringParentId ?? null,
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

        if (
          payload.recurring &&
          payload.recurringInterval &&
          payload.nextOccurrence
        ) {
              await tx.recurringInvoice.create({
                data: {
                  clientId: payload.clientId,
                  userId: user.id,
                  title: payload.notes?.trim() || 'Recurring invoice',
                  amount: new Prisma.Decimal(record.total),
                  currency: 'USD',
                  interval: payload.recurringInterval,
                  dayOfMonth:
                    payload.recurringInterval !== 'week'
                      ? payload.recurringDayOfMonth ?? null
                      : null,
                  dayOfWeek:
                    payload.recurringInterval === 'week'
                      ? payload.recurringDayOfWeek ?? null
                      : null,
                  nextSendDate: new Date(payload.nextOccurrence),
                  status: 'PENDING',
                  sendFirstNow: true,
                },
              });
            }

        return { invoiceNumber, id: record.id };
      });

  return created;
}

export type CreateRecurringInvoicePayload = {
  clientId: string;
  amount: number;
  interval: 'week' | 'month' | 'quarter' | 'year';
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  nextSendDate: string;
  sendFirstNow?: boolean;
  title?: string | null;
  currency?: string;
  status?: string;
};

export async function createRecurringInvoiceAction(
  payload: CreateRecurringInvoicePayload
): Promise<{ id: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  // reuse the validated client above; ensure it exists and is scoped
  const client = await prisma.client.findUnique({
    where: { id: payload.clientId },
    select: { id: true, companyId: true, assignedToId: true },
  });

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  if (
    !client ||
    client.companyId !== (user.companyId ?? user.company?.id ?? null) ||
    (!isOwnerOrAdmin && client.assignedToId !== user.id)
  ) {
    throw new Error('Client not found');
  }

  const recurring = await prisma.recurringInvoice.create({
    data: {
      clientId: payload.clientId,
      userId: user.id,
      title: payload.title?.trim() ? payload.title.trim() : 'Recurring invoice',
      amount: new Prisma.Decimal(payload.amount),
      currency: payload.currency ?? 'USD',
      interval: payload.interval,
      dayOfMonth: payload.dayOfMonth ?? null,
      dayOfWeek: payload.dayOfWeek ?? null,
      nextSendDate: new Date(payload.nextSendDate),
      status: payload.status ?? 'PENDING',
      sendFirstNow: payload.sendFirstNow ?? true,
    },
  });

  // If sendFirstNow is true, generate the first invoice immediately
  if (payload.sendFirstNow ?? true) {
    const invoiceNumber = await generateInvoiceNumber(prisma, user.id);
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const firstInvoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: payload.clientId,
        invoiceNumber,
        title: recurring.title,
        currency: recurring.currency,
        issueDate: now,
        dueDate,
        status: 'SENT',
        subTotal: Number(recurring.amount),
        taxRate: 0,
        taxAmount: 0,
        total: Number(recurring.amount),
        recurringParentId: recurring.id,
        items: {
          create: [
            {
              name: recurring.title || 'Recurring invoice',
              description: recurring.title || 'Recurring invoice',
              quantity: 1,
              unitPrice: Number(recurring.amount),
              taxRate: 0,
              total: Number(recurring.amount),
            },
          ],
        },
      },
      include: {
        client: true,
        user: { include: { company: true } },
        items: true,
      },
    });

    // Send invoice email
    const { sendInvoiceEmail } = await import('@/lib/email');
    await sendInvoiceEmail(firstInvoice, firstInvoice.client, firstInvoice.user).catch(err => {
      console.error('Failed to send first recurring invoice email:', err);
    });
  }

  return { id: recurring.id };
}

export async function generateInvoiceNumber(tx: Prisma.TransactionClient | typeof prisma, userId: string) {
  const last = await tx.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = (last ? Number(last.invoiceNumber) || 0 : 0) + 1;
  return next.toString();
}
