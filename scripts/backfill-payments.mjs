import { PrismaClient, Prisma, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const SUCCESSFUL_PAYMENT_STATUSES = [
  PaymentStatus.succeeded,
  PaymentStatus.partially_refunded,
  PaymentStatus.refunded,
];

async function computeInvoicePaidAmounts(invoiceId) {
  const aggregate = await prisma.payment.aggregate({
    where: {
      invoiceId,
      status: { in: SUCCESSFUL_PAYMENT_STATUSES },
    },
    _sum: {
      amount: true,
      refundedAmount: true,
    },
  });

  const paidAmount = aggregate._sum.amount ?? new Prisma.Decimal(0);
  const refundedAmount = aggregate._sum.refundedAmount ?? new Prisma.Decimal(0);
  return {
    paidAmount: paidAmount.minus(refundedAmount),
    refundedAmount,
  };
}

async function reconcileInvoiceStatus(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      total: true,
      amountPaid: true,
      paidAt: true,
      status: true,
      dueDate: true,
    },
  });

  if (!invoice) return null;

  const { paidAmount } = await computeInvoicePaidAmounts(invoiceId);
  const total = new Prisma.Decimal(invoice.total ?? 0);
  const zero = new Prisma.Decimal(0);
  const now = new Date();

  let nextStatus;
  if (paidAmount.greaterThanOrEqualTo(total)) {
    nextStatus = InvoiceStatus.PAID;
  } else if (paidAmount.greaterThan(zero)) {
    nextStatus = InvoiceStatus.PARTIALLY_PAID;
  } else if (invoice.dueDate && invoice.dueDate.getTime() < now.getTime()) {
    nextStatus = InvoiceStatus.OVERDUE;
  } else {
    nextStatus = InvoiceStatus.OPEN;
  }

  const amountPaidNumber = Number(paidAmount.toString());
  const needsAmountUpdate = Math.abs((invoice.amountPaid ?? 0) - amountPaidNumber) > 1e-6;
  const updates = {};

  if (needsAmountUpdate) updates.amountPaid = amountPaidNumber;
  if (invoice.status !== nextStatus) updates.status = nextStatus;
  if (nextStatus === InvoiceStatus.PAID && !invoice.paidAt) {
    updates.paidAt = now;
  }

  if (!Object.keys(updates).length) {
    return invoice;
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: updates,
  });
}

async function backfillPayments() {
  console.log('Finding paid invoices with no payments...');

  const invoices = await prisma.invoice.findMany({
    where: { status: InvoiceStatus.PAID },
    select: {
      id: true,
      total: true,
      currency: true,
      paidAt: true,
      updatedAt: true,
      clientId: true,
      payments: { select: { id: true }, take: 1 },
    },
  });

  let created = 0;
  for (const invoice of invoices) {
    if (invoice.payments.length > 0) continue;
    if (!invoice.clientId) {
      console.warn(`Skipping invoice ${invoice.id} (missing clientId)`);
      continue;
    }

    const amount = new Prisma.Decimal(invoice.total ?? 0);
    const paidAt = invoice.paidAt ?? invoice.updatedAt ?? new Date();

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        provider: 'manual',
        status: PaymentStatus.succeeded,
        amount,
        currency: invoice.currency ?? 'USD',
        paidAt,
      },
    });

    await reconcileInvoiceStatus(invoice.id);
    created += 1;
    console.log(`Created manual payment for invoice ${invoice.id}`);
  }

  console.log(`Backfill complete; created ${created} payment(s).`);
}

backfillPayments()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
