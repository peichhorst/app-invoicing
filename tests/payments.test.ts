import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma, InvoiceStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { reconcileInvoiceStatus } from '@/lib/payments';

describe('reconcileInvoiceStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockAggregate = (amount: number, refunded = 0) => {
    (prisma.payment.aggregate as any).mockResolvedValue({
      _sum: {
        amount: new Prisma.Decimal(amount),
        refundedAmount: new Prisma.Decimal(refunded),
      },
    });
  };

  const baseInvoice = {
    id: 'inv',
    clientId: 'client',
    total: 100,
    amountPaid: 0,
    dueDate: new Date(Date.now() + 1000 * 60),
    status: InvoiceStatus.SENT,
    paidAt: null,
    updatedAt: new Date(),
  };

  it('marks invoice as OPEN when amount paid is zero', async () => {
    mockAggregate(0);
    (prisma.invoice.findUnique as any).mockResolvedValue({ ...baseInvoice });
    await reconcileInvoiceStatus(baseInvoice.id);

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: baseInvoice.id },
      data: expect.objectContaining({
        status: InvoiceStatus.OPEN,
      }),
    });
  });

  it('marks invoice as OVERDUE when dueDate has passed and nothing paid', async () => {
    const overdueInvoice = { ...baseInvoice, dueDate: new Date(Date.now() - 1000 * 60) };
    mockAggregate(0);
    (prisma.invoice.findUnique as any).mockResolvedValue(overdueInvoice);
    await reconcileInvoiceStatus(overdueInvoice.id);

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvoiceStatus.OVERDUE }),
      }),
    );
  });

  it('marks invoice as PARTIALLY_PAID when amount paid > 0 but < total', async () => {
    mockAggregate(40);
    (prisma.invoice.findUnique as any).mockResolvedValue({
      ...baseInvoice,
      status: InvoiceStatus.OPEN,
      amountPaid: 0,
    });
    await reconcileInvoiceStatus(baseInvoice.id);

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InvoiceStatus.PARTIALLY_PAID,
          amountPaid: 40,
        }),
      }),
    );
  });

  it('marks invoice as PAID when amount paid meets total', async () => {
    mockAggregate(100);
    (prisma.invoice.findUnique as any).mockResolvedValue({
      ...baseInvoice,
      amountPaid: 0,
      status: InvoiceStatus.OPEN,
      paidAt: null,
    });
    await reconcileInvoiceStatus(baseInvoice.id);

    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paidAt: expect.any(Date),
        }),
      }),
    );
  });
});
