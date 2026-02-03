import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { reconcileInvoiceStatus } from '../src/lib/payments';

async function backfillPayments() {
  console.log('Finding paid invoices without payments...');

  const invoices = await prisma.invoice.findMany({
    where: { status: 'PAID' },
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
      console.warn(`Skipping invoice ${invoice.id} because clientId is missing`);
      continue;
    }

    const amount =
      typeof invoice.total === 'number'
        ? invoice.total
        : invoice.total
        ? Number(invoice.total)
        : 0;
    const paidAt = invoice.paidAt ?? invoice.updatedAt;

    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        provider: 'manual',
        status: 'succeeded',
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
