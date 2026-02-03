// src/app/api/invoices/reminders/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';

const REMINDER_HEADER = 'x-invoice-reminder-secret';
const MS_IN_DAY = 1000 * 60 * 60 * 24;
const REMINDER_INTERVAL_MS = 1000 * 60 * 2; // 2 minutes for temporary reminder/testing

type ReminderInvoice = Prisma.InvoiceGetPayload<{
  include: { client: true; items: true; user: { include: { company: true } } };
}>;

async function handle(request: Request) {
  const configuredSecret = process.env.INVOICE_REMINDER_SECRET;
  const providedSecret = getSecretFromHeaders(request.headers);

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ['DRAFT', 'PAID', 'VOID'] },
      client: { email: { not: null } },
    },
    include: {
      client: true,
      items: true,
      user: { include: { company: true } },
    },
  });

  let remindersSent = 0;

  for (const invoice of invoices) {
    if (!invoice.client?.email || !invoice.user) continue;

    const nextReminder = getNextReminderDate(invoice, now);
    if (!nextReminder || nextReminder.getTime() > now.getTime()) continue;

    const dueDays = calculateDueDays(invoice);
    const emailInvoice = {
      ...invoice,
      dueDays,
      items: invoice.items.map((item) => ({
        ...item,
        amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
      })),
    };

    const overdue = invoice.dueDate ? now.getTime() >= new Date(invoice.dueDate).getTime() : false;
    const reminderSubject = overdue
      ? `Past due reminder: Invoice #${invoice.invoiceNumber}`
      : `Reminder: Invoice #${invoice.invoiceNumber}`;
    const reminderNotice = overdue
      ? 'This invoice is past due. Please send payment as soon as you can.'
      : 'Friendly reminder — this invoice is awaiting payment.';

    const sentAt = new Date();
    try {
      await sendInvoiceEmail(emailInvoice, invoice.client, invoice.user, {
        reminderSubject,
        reminderNotice,
      });
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { lastReminderSentAt: sentAt },
      });
      remindersSent += 1;
    } catch (error) {
      console.error('Failed to send invoice reminder', invoice.id, error);
    }
  }

  return NextResponse.json({ remindersSent });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

function getSecretFromHeaders(headers: Headers) {
  const headerValue = headers.get(REMINDER_HEADER);
  if (headerValue) return headerValue;
  const authValue = headers.get('authorization');
  if (!authValue) return null;
  if (authValue.toLowerCase().startsWith('bearer ')) {
    return authValue.slice(7).trim();
  }
  return authValue;
}

function getNextReminderDate(invoice: ReminderInvoice, now: Date) {
  const lastReminder = invoice.lastReminderSentAt ? new Date(invoice.lastReminderSentAt) : null;
  const reference = lastReminder ?? new Date(invoice.createdAt);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const overdue = dueDate ? now.getTime() >= dueDate.getTime() : false;

  if (overdue && (!lastReminder || (dueDate && lastReminder.getTime() < dueDate.getTime()))) {
    return now;
  }

  const intervalMs = overdue ? MS_IN_DAY : REMINDER_INTERVAL_MS;
  return new Date(reference.getTime() + intervalMs);
}

function calculateDueDays(invoice: ReminderInvoice) {
  if (!invoice.dueDate || !invoice.issueDate) return 0;
  const diff = new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime();
  return Math.max(0, Math.round(diff / MS_IN_DAY));
}
