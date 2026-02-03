'use server';

import prisma from '@lib/prisma';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { createInvoice, generateInvoiceNumber } from '@/services/InvoiceService';
import { createRecurringInvoice } from '@/services/SubscriptionService';

export type ClientOption = {
  id: string;
  companyName: string;
  contactName: string | null;
  email?: string | null;
};

type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export type CreateInvoicePayload = {
  clientId: string;
  title?: string | null;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  status: InvoiceStatus;
  items: LineItemInput[];
  recurring?: boolean;
  recurringInterval?: 'day' | 'week' | 'month' | 'quarter' | 'year' | null;
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
      email: true,
    },
  });

  return clients.map((client) => ({
    ...client,
    companyName: client.companyName ?? '',
  }));
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

  // Prepare items with proper decimal conversion
  const items = payload.items.map((item) => ({
    name: item.description,
    description: item.description,
    quantity: item.quantity,
    unitPrice: new Prisma.Decimal(item.unitPrice),
    taxRate: item.taxRate ? new Prisma.Decimal(item.taxRate) : null,
  }));

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(user.id);

  // Use InvoiceService to create invoice with centralized tax calculation
  const invoice = await createInvoice({
    userId: user.id,
    clientId: payload.clientId,
    title: payload.title || 'New Invoice',
    issueDate: new Date(payload.issueDate),
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    notes: payload.notes || undefined,
    status: payload.status,
    items,
    recurring: payload.recurring ?? false,
    recurringInterval: payload.recurringInterval ?? null,
    recurringDayOfMonth: payload.recurringDayOfMonth ?? null,
    recurringDayOfWeek: payload.recurringDayOfWeek ?? null,
    nextOccurrence: payload.nextOccurrence ? new Date(payload.nextOccurrence) : null,
    invoiceNumber,
    sendEmail: false, // Don't send email from Server Action
  });

  // If recurring, create the recurring invoice using SubscriptionService
  if (payload.recurring && payload.recurringInterval && payload.nextOccurrence) {
    await createRecurringInvoice({
      userId: user.id,
      clientId: payload.clientId,
      title: payload.notes?.trim() || payload.title?.trim() || 'Recurring invoice',
      amount: invoice.total,
      currency: 'USD',
      interval: payload.recurringInterval as any,
      dayOfMonth: payload.recurringDayOfMonth,
      dayOfWeek: payload.recurringDayOfWeek,
      nextSendDate: new Date(payload.nextOccurrence),
      status: 'PENDING',
      sendFirstNow: false, // First invoice already created above
    });
  }

  return { invoiceNumber: invoice.invoiceNumber, id: invoice.id };
}

export type CreateRecurringInvoicePayload = {
  clientId: string;
  amount: number;
  interval: 'day' | 'week' | 'month' | 'quarter' | 'year';
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

  // Validate client access
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

  // Prepare a simple item for the recurring invoice
  const items = [{
    name: payload.title?.trim() || 'Recurring Service',
    description: payload.title?.trim() || 'Recurring Service',
    quantity: 1,
    unitPrice: new Prisma.Decimal(payload.amount),
    taxRate: null,
  }];

  // Use SubscriptionService to create recurring invoice
  const { recurringInvoice } = await createRecurringInvoice({
    userId: user.id,
    clientId: payload.clientId,
    title: payload.title?.trim() || 'Recurring invoice',
    amount: new Prisma.Decimal(payload.amount),
    currency: payload.currency ?? 'USD',
    interval: payload.interval,
    dayOfMonth: payload.dayOfMonth,
    dayOfWeek: payload.dayOfWeek,
    nextSendDate: new Date(payload.nextSendDate),
    sendFirstNow: payload.sendFirstNow ?? true,
    items,
  });
  
  const recurring = recurringInvoice;

  return { id: recurring.id };
}

// Note: generateInvoiceNumber is available in @/services/InvoiceService
// Import directly from there instead of re-exporting from this "use server" file
