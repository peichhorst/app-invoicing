import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { PaymentStatus, Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/stripe', () => ({
  stripe: {
    charges: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/payments', () => ({
  reconcileInvoiceStatus: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendAdminNotificationEmail: vi.fn(),
}));

vi.mock('@/lib/webhook-logger', () => ({
  sendWebhookLogEmail: vi.fn(),
}));

import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { reconcileInvoiceStatus } from '@/lib/payments';
import { handleStripeEvent } from '@/lib/stripe-webhooks';

describe('Stripe Refund Webhook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockPayment = {
    id: 'payment_123',
    clientId: 'client_123',
    invoiceId: 'invoice_123',
    provider: 'stripe' as const,
    status: PaymentStatus.succeeded,
    amount: new Prisma.Decimal(100.00),
    currency: 'USD',
    feeAmount: new Prisma.Decimal(3.20),
    netAmount: new Prisma.Decimal(96.80),
    refundedAmount: new Prisma.Decimal(0),
    paidAt: new Date('2024-01-01T12:00:00Z'),
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: 'pi_123',
    stripeChargeId: 'ch_123',
    stripeCustomerId: 'cus_123',
    stripeBalanceTransactionId: 'txn_123',
    lastError: null,
    metadata: null,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
  };

  describe('charge.refunded event', () => {
    it('should handle full refund correctly', async () => {
      const fullRefundEvent: Stripe.Event = {
        id: 'evt_refund_full',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_123',
            object: 'refund',
            amount: 10000, // $100.00 in cents
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      // Mock Stripe charge retrieve
      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 10000, // Fully refunded
        balance_transaction: 'txn_123',
        metadata: {
          paymentId: 'payment_123',
        },
      });

      // Mock database lookups
      (prisma.payment.findFirst as any).mockResolvedValue(mockPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(100.00),
        status: PaymentStatus.refunded,
      });

      await handleStripeEvent(fullRefundEvent);

      // Verify payment was updated with full refund
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: expect.objectContaining({
          refundedAmount: expect.any(Prisma.Decimal),
          status: PaymentStatus.refunded,
          stripePaymentIntentId: 'pi_123',
          stripeChargeId: 'ch_123',
        }),
      });

      // Verify the refunded amount is correct
      const updateCall = (prisma.payment.update as any).mock.calls[0][0];
      expect(updateCall.data.refundedAmount.toString()).toBe('100');

      // Verify invoice status was reconciled
      expect(reconcileInvoiceStatus).toHaveBeenCalledWith('invoice_123');
    });

    it('should handle partial refund correctly', async () => {
      const partialRefundEvent: Stripe.Event = {
        id: 'evt_refund_partial',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_456',
            object: 'refund',
            amount: 3500, // $35.00 in cents
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      // Mock Stripe charge retrieve
      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 3500, // Partially refunded
        balance_transaction: 'txn_123',
        metadata: {
          paymentId: 'payment_123',
        },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(mockPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(35.00),
        status: PaymentStatus.partially_refunded,
      });

      await handleStripeEvent(partialRefundEvent);

      // Verify payment was updated with partial refund
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: expect.objectContaining({
          refundedAmount: expect.any(Prisma.Decimal),
          status: PaymentStatus.partially_refunded,
        }),
      });

      // Verify the refunded amount is correct
      const updateCall = (prisma.payment.update as any).mock.calls[0][0];
      expect(updateCall.data.refundedAmount.toString()).toBe('35');

      // Verify invoice status was reconciled
      expect(reconcileInvoiceStatus).toHaveBeenCalledWith('invoice_123');
    });

    it('should handle multiple partial refunds', async () => {
      const secondRefundEvent: Stripe.Event = {
        id: 'evt_refund_second',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_789',
            object: 'refund',
            amount: 2000, // $20.00 in cents (second refund)
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      // Mock payment already has $35 refunded
      const partiallyRefundedPayment = {
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(35.00),
        status: PaymentStatus.partially_refunded,
      };

      // Mock Stripe charge retrieve - now shows $55 total refunded
      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 5500, // $35 + $20 = $55 total refunded
        balance_transaction: 'txn_123',
        metadata: {
          paymentId: 'payment_123',
        },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(partiallyRefundedPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...partiallyRefundedPayment,
        refundedAmount: new Prisma.Decimal(55.00),
        status: PaymentStatus.partially_refunded,
      });

      await handleStripeEvent(secondRefundEvent);

      // Verify refunded amount was updated to cumulative total
      const updateCall = (prisma.payment.update as any).mock.calls[0][0];
      expect(updateCall.data.refundedAmount.toString()).toBe('55');
      expect(updateCall.data.status).toBe(PaymentStatus.partially_refunded);
    });

    it('should mark as fully refunded when cumulative refunds equal payment amount', async () => {
      const finalRefundEvent: Stripe.Event = {
        id: 'evt_refund_final',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_final',
            object: 'refund',
            amount: 4500, // Final $45 to complete full refund
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      const partiallyRefundedPayment = {
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(55.00),
        status: PaymentStatus.partially_refunded,
      };

      // Mock Stripe charge retrieve - now fully refunded
      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 10000, // Now fully refunded
        balance_transaction: 'txn_123',
        metadata: {
          paymentId: 'payment_123',
        },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(partiallyRefundedPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...partiallyRefundedPayment,
        refundedAmount: new Prisma.Decimal(100.00),
        status: PaymentStatus.refunded,
      });

      await handleStripeEvent(finalRefundEvent);

      // Verify status changed to fully refunded
      const updateCall = (prisma.payment.update as any).mock.calls[0][0];
      expect(updateCall.data.refundedAmount.toString()).toBe('100');
      expect(updateCall.data.status).toBe(PaymentStatus.refunded);
    });

    it('should handle missing payment gracefully', async () => {
      const refundEvent: Stripe.Event = {
        id: 'evt_refund_missing',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_missing',
            object: 'refund',
            amount: 5000,
            charge: 'ch_nonexistent',
            currency: 'usd',
            payment_intent: 'pi_nonexistent',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_nonexistent',
        amount: 10000,
        amount_refunded: 5000,
        metadata: {},
      });

      (prisma.payment.findFirst as any).mockResolvedValue(null);
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      await handleStripeEvent(refundEvent);

      // Should not attempt to update if payment not found
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(reconcileInvoiceStatus).not.toHaveBeenCalled();
    });

    it('should use Decimal arithmetic to prevent rounding errors', async () => {
      const refundEvent: Stripe.Event = {
        id: 'evt_refund_decimal',
        object: 'event',
        type: 'charge.refunded',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_decimal',
            object: 'refund',
            amount: 3333, // $33.33 - tricky amount
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 3333,
        metadata: { paymentId: 'payment_123' },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(mockPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(33.33),
        status: PaymentStatus.partially_refunded,
      });

      await handleStripeEvent(refundEvent);

      const updateCall = (prisma.payment.update as any).mock.calls[0][0];
      const refundedAmount = updateCall.data.refundedAmount;

      // Verify it's a Decimal instance
      expect(refundedAmount).toBeInstanceOf(Prisma.Decimal);
      
      // Verify exact value (no floating point errors)
      expect(refundedAmount.toString()).toBe('33.33');
    });
  });

  describe('refund.updated event', () => {
    it('should handle refund.updated event', async () => {
      const refundUpdatedEvent: Stripe.Event = {
        id: 'evt_refund_updated',
        object: 'event',
        type: 'refund.updated',
        api_version: '2023-10-16',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        data: {
          object: {
            id: 'refund_updated',
            object: 'refund',
            amount: 5000,
            charge: 'ch_123',
            currency: 'usd',
            payment_intent: 'pi_123',
            status: 'succeeded',
          } as Stripe.Refund,
        },
      };

      (stripe.charges.retrieve as any).mockResolvedValue({
        id: 'ch_123',
        amount: 10000,
        amount_refunded: 5000,
        metadata: { paymentId: 'payment_123' },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(mockPayment);
      (prisma.payment.update as any).mockResolvedValue({
        ...mockPayment,
        refundedAmount: new Prisma.Decimal(50.00),
        status: PaymentStatus.partially_refunded,
      });

      await handleStripeEvent(refundUpdatedEvent);

      expect(prisma.payment.update).toHaveBeenCalled();
      expect(reconcileInvoiceStatus).toHaveBeenCalledWith('invoice_123');
    });
  });
});
