import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendInvoiceEmail } from '@/lib/email';
import { generateInvoiceNumber } from '@/app/dashboard/invoices/new/actions';

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const calculateNextRecurringDate = (
  current: Date,
  interval: 'week' | 'month' | 'quarter' | 'year',
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): Date => {
  const base = new Date(current);
  if (interval === 'week') {
    const target = Math.min(Math.max(dayOfWeek ?? 1, 1), 7);
    const currentDow = base.getDay() === 0 ? 7 : base.getDay();
    let diff = target - currentDow;
    if (diff <= 0) diff += 7;
    const next = new Date(base);
    next.setDate(base.getDate() + diff);
    return next;
  }
  const monthsToAdd = interval === 'quarter' ? 3 : interval === 'year' ? 12 : 1;
  const next = new Date(base);
  next.setDate(1);
  next.setMonth(next.getMonth() + monthsToAdd);
  const requestedDay = Math.max(dayOfMonth ?? base.getDate(), 1);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(requestedDay, daysInMonth));
  return next;
};

export async function GET() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = await prisma.recurringInvoice.findMany({
    where: {
      status: 'ACTIVE',
      nextSendDate: { lte: today },
    },
    include: { user: true, client: true },
  });

  let processed = 0;

  for (const rec of due) {
    const invoiceResult = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(tx, rec.userId);
      const now = new Date();
      const dueDate = addDays(now, 30);
      return tx.invoice.create({
        data: {
          userId: rec.userId,
          clientId: rec.clientId,
          invoiceNumber,
          title: rec.title,
          amount: Number(rec.amount),
          currency: rec.currency,
          issueDate: now,
          dueDate,
          status: 'SENT',
          subTotal: Number(rec.amount),
          taxRate: 0,
          taxAmount: 0,
          total: Number(rec.amount),
          recurringParentId: rec.id,
          items: {
            create: [
              {
                name: rec.title || 'Recurring invoice',
                description: rec.title || 'Recurring invoice',
                quantity: 1,
                unitPrice: Number(rec.amount),
                taxRate: 0,
                total: Number(rec.amount),
              },
            ],
          },
        },
      });
    });

    let invoice = await prisma.invoice.findUnique({
      where: { id: invoiceResult.id },
      include: { client: true, user: true, items: true },
    });

    if (!invoice) continue;

    if (rec.user.stripeCustomerId && rec.user.defaultPaymentMethodId) {
      try {
        await stripe.paymentIntents.create({
          amount: Math.round(Number(rec.amount) * 100),
          currency: rec.currency.toLowerCase(),
          customer: rec.user.stripeCustomerId,
          payment_method: rec.user.defaultPaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: { invoiceId: invoice.id },
        });
        invoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID' },
          include: { client: true, user: true, items: true },
        });
      } catch (error) {
        console.error('Recurring auto-charge failed', error);
      }
    }

    await sendInvoiceEmail(invoice, invoice.client, invoice.user);

    const next = calculateNextRecurringDate(
      rec.nextSendDate,
      rec.interval as 'week' | 'month' | 'quarter' | 'year',
      rec.dayOfMonth,
      rec.dayOfWeek
    );

    const shouldActivate = invoice.status === 'PAID' && !rec.firstPaidAt;

    await prisma.recurringInvoice.update({
      where: { id: rec.id },
      data: {
        nextSendDate: next,
        ...(shouldActivate && {
          status: 'ACTIVE',
          firstPaidAt: new Date(),
        }),
      },
    });

    processed += 1;
  }

  return NextResponse.json({ processed });
}
