import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/payments', () => ({
  reconcileInvoiceStatus: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { handleStripeEvent } from '@/lib/stripe-webhooks';

describe('handleStripeEvent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const paymentRecord = {
    id: 'p1',
    invoiceId: 'inv1',
    amount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const event: Stripe.Event = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    object: 'event',
    data: {
      object: {
        id: 'pi_123',
        customer: 'cus_123',
        charges: {
          data: [{ id: 'ch_123', balance_transaction: 'bt_123' }],
        },
      },
    },
  } as any;

  it('updates the payment once on success', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue(paymentRecord);
    (prisma.payment.update as any).mockResolvedValue(paymentRecord);

    await handleStripeEvent(event);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: paymentRecord.id },
      data: expect.objectContaining({
        status: PaymentStatus.succeeded,
        stripePaymentIntentId: 'pi_123',
      }),
    });
  });

  it('handles the same event twice without creating duplicates', async () => {
    (prisma.payment.findFirst as any).mockResolvedValue(paymentRecord);
    (prisma.payment.update as any).mockResolvedValue(paymentRecord);

    await handleStripeEvent(event);
    await handleStripeEvent(event);

    expect(prisma.payment.update).toHaveBeenCalledTimes(2);
    expect(prisma.payment.findFirst).toHaveBeenCalledTimes(2);
  });
});
