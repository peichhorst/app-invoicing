import { Invoice, InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

const SUCCESSFUL_PAYMENT_STATUSES = [
  PaymentStatus.succeeded,
  PaymentStatus.partially_refunded,
  PaymentStatus.refunded,
];

export type InvoicePaidAmounts = {
  paidAmount: Prisma.Decimal;
  refundedAmount: Prisma.Decimal;
};

export async function computeInvoicePaidAmounts(
  invoiceId: string
): Promise<InvoicePaidAmounts> {
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
  const netPaid = paidAmount.minus(refundedAmount);

  return {
    paidAmount: netPaid,
    refundedAmount,
  };
}

export async function reconcileInvoiceStatus(invoiceId: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return null;
  }

  const { paidAmount } = await computeInvoicePaidAmounts(invoiceId);

  const total = new Prisma.Decimal(invoice.total ?? 0);
  const zero = new Prisma.Decimal(0);
  const now = new Date();

  let nextStatus: InvoiceStatus;

  if (paidAmount.greaterThanOrEqualTo(total)) {
    nextStatus = InvoiceStatus.PAID;
  } else if (paidAmount.greaterThan(zero)) {
    nextStatus = InvoiceStatus.PARTIALLY_PAID;
  } else if (invoice.dueDate && invoice.dueDate.getTime() < now.getTime()) {
    nextStatus = InvoiceStatus.OVERDUE;
  } else {
    nextStatus = InvoiceStatus.OPEN;
  }

  const currentAmountPaid = new Prisma.Decimal(invoice.amountPaid ?? 0);
  const needsAmountUpdate = !paidAmount.equals(currentAmountPaid);

  const updates: Prisma.InvoiceUpdateInput = {};

  if (needsAmountUpdate) {
    updates.amountPaid = paidAmount;
  }

  if (invoice.status !== nextStatus) {
    updates.status = nextStatus;
  }

  if (nextStatus === InvoiceStatus.PAID && !invoice.paidAt) {
    updates.paidAt = now;
  }

  if (Object.keys(updates).length === 0) {
    return invoice;
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: updates,
  });
}
