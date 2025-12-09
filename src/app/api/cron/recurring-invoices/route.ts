import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' }) : null;

function addInterval(date: Date, interval: string, dayOfMonth?: number | null, dayOfWeek?: number | null): Date {
  const result = new Date(date);
  if (interval === 'week') {
    const targetDow = Math.min(Math.max(dayOfWeek ?? 1, 1), 7);
    const currentDow = result.getDay() === 0 ? 7 : result.getDay();
    let diff = targetDow - currentDow;
    if (diff <= 0) diff += 7;
    result.setDate(result.getDate() + diff);
    return result;
  }

  const step = interval === 'quarter' ? 3 : interval === 'year' ? 12 : 1;
  result.setDate(1);
  result.setMonth(result.getMonth() + step);
  const requestedDay = Math.max(dayOfMonth ?? date.getDate(), 1);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(requestedDay, daysInMonth));
  return result;
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient, userId: string) {
  const last = await tx.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const next = (last ? Number(last.invoiceNumber) || 0 : 0) + 1;
  return next.toString();
}

async function attemptAutoCharge(userId: string, invoice: { id: string; total: number }, stripeAccountId: string | null) {
  if (!stripe || !stripeAccountId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  const amountCents = Math.round((invoice.total || 0) * 100);
  if (amountCents <= 0) return false;

  const params: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: 'usd',
    confirm: true,
    payment_method_types: ['card'],
    metadata: {
      invoiceId: invoice.id,
      source: 'recurring-cron',
    },
  };
  if (user?.stripeCustomerId) {
    params.customer = user.stripeCustomerId;
  }

  try {
    await stripe.paymentIntents.create(params, {
      stripeAccount: stripeAccountId,
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID' },
    });
    console.log(`Recurring cron: auto-charged invoice ${invoice.id}`);
    return true;
  } catch (error) {
    console.error('Recurring cron auto-charge failed', error);
    return false;
  }
}

export async function GET() {
  try {
    const now = new Date();
    const recurringList = await prisma.recurringInvoice.findMany({
      where: { status: 'ACTIVE', nextSendDate: { lte: now } },
      include: { client: true, user: true },
    });

    if (!recurringList.length) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    for (const recurring of recurringList) {
      try {
        const invoice = await prisma.$transaction(async (tx) => {
          const invoiceNumber = await generateInvoiceNumber(tx, recurring.userId);
          return tx.invoice.create({
            data: {
              clientId: recurring.clientId,
              userId: recurring.userId,
              invoiceNumber,
              status: 'SENT',
              issueDate: new Date(),
              currency: recurring.currency,
              subTotal: Number(recurring.amount),
              taxRate: 0,
              taxAmount: 0,
              total: Number(recurring.amount),
              notes: `Recurring invoice: ${recurring.title}`,
              sentCount: 1,
              items: {
                create: [
                  {
                    name: recurring.title,
                    description: recurring.title,
                    quantity: 1,
                    unitPrice: Number(recurring.amount),
                    taxRate: 0,
                    total: Number(recurring.amount),
                  },
                ],
              },
              recurring: true,
              recurringParentId: recurring.id,
            },
            include: {
              client: true,
              user: true,
              items: true,
            },
          });
        });

        await sendInvoiceEmail(invoice, invoice.client, invoice.user);

        await attemptAutoCharge(recurring.userId, { id: invoice.id, total: invoice.total }, recurring.user.stripeAccountId ?? null);

        const nextDate = addInterval(new Date(recurring.nextSendDate), recurring.interval, recurring.dayOfMonth, recurring.dayOfWeek);
        await prisma.recurringInvoice.update({
          where: { id: recurring.id },
          data: { nextSendDate: nextDate },
        });

        processed += 1;
      } catch (error) {
        console.error('Recurring cron processing failed for', recurring.id, error);
      }
    }

    return NextResponse.json({ processed });
  } catch (error) {
    console.error('Recurring cron error', error);
    return NextResponse.json({ error: 'Recurring job failed' }, { status: 500 });
  }
}
