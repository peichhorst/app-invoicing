// src/app/api/payments/config/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const SUBSCRIPTION_PRICE_CENTS = Number(process.env.PRO_SUBSCRIPTION_PRICE_CENTS ?? 999);
const SUBSCRIPTION_PRICE_ID = process.env.PRO_SUBSCRIPTION_PRICE_ID || null;
const SUBSCRIPTION_PRODUCT_ID = process.env.PRODUCT_ID || null;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get('seller') || null;
  const invoiceId = url.searchParams.get('invoice') || null;
  const mode = url.searchParams.get('mode') || null;

  let targetUser = null as any;
  let amountCents: number | null = null;
  let invoiceStatus: string | null = null;
  let paidAt: string | null = null;
  let customerEmail: string | null = null;
  let customerAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null = null;

  try {
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: {
          id: true,
          userId: true,
          total: true,
          status: true,
          updatedAt: true,
          shortCode: true,
          client: {
            select: {
              email: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
        },
      });
      if (invoice) {
        if (sellerId && invoice.userId !== sellerId) {
          return NextResponse.json({ error: 'Invoice does not belong to seller' }, { status: 400 });
        }
        targetUser = await prisma.user.findUnique({ where: { id: invoice.userId } });
        amountCents = Math.max(1, Math.round((invoice.total || 0) * 100));
        invoiceStatus = invoice.status;
        paidAt = invoice.status === 'PAID' ? invoice.updatedAt.toISOString() : null;
        customerEmail = invoice.client?.email || null;
        customerAddress = invoice.client
          ? {
              line1: invoice.client.addressLine1,
              line2: invoice.client.addressLine2,
              city: invoice.client.city,
              state: invoice.client.state,
              postalCode: invoice.client.postalCode,
              country: invoice.client.country,
            }
          : null;
      }
    }

    if (!targetUser && sellerId) {
      targetUser = await prisma.user.findUnique({ where: { id: sellerId } });
    }

    if (!targetUser) {
      targetUser = await getCurrentUser();
    }

    const platformPublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
    const platformStripeAccountId = process.env.STRIPE_ACCOUNT_ID || null;

    let responsePayload: Record<string, any>;
    const userEmail = targetUser?.email ?? null;
    const userCompanyAddress = targetUser?.company
      ? {
          line1: targetUser.company.addressLine1 ?? null,
          line2: targetUser.company.addressLine2 ?? null,
          city: targetUser.company.city ?? null,
          state: targetUser.company.state ?? null,
          postalCode: targetUser.company.postalCode ?? null,
          country: targetUser.company.country ?? null,
        }
      : null;

    if (mode === 'subscription') {
      if (!platformPublishableKey) {
        return NextResponse.json({ error: 'Platform publishable key not configured' }, { status: 500 });
      }
      responsePayload = {
        publishableKey: platformPublishableKey,
        stripeAccountId: platformStripeAccountId,
        sellerId: null,
        invoiceId: invoiceId || null,
        amountCents,
        invoiceStatus,
        paidAt,
        customerEmail: customerEmail ?? userEmail,
        customerAddress: customerAddress ?? userCompanyAddress,
        stripeCustomerId: targetUser?.stripeCustomerId || null,
        defaultPaymentMethodId: targetUser?.defaultPaymentMethodId || null,
      };
    } else {
      if (!targetUser?.stripePublishableKey) {
        return NextResponse.json({ error: 'Stripe publishable key not configured for seller' }, { status: 500 });
      }
      if (!targetUser?.stripeAccountId) {
        return NextResponse.json({ error: 'Stripe account not configured for seller' }, { status: 500 });
      }
      responsePayload = {
        publishableKey: targetUser.stripePublishableKey,
        stripeAccountId: targetUser.stripeAccountId,
        sellerId: targetUser?.id || null,
        invoiceId: invoiceId || null,
        amountCents,
        invoiceStatus,
        paidAt,
        customerEmail,
        customerAddress,
        stripeCustomerId: targetUser.stripeCustomerId || null,
        defaultPaymentMethodId: targetUser.defaultPaymentMethodId || null,
      };
    }

    if (mode === 'subscription') {
      responsePayload.subscriptionPriceId = SUBSCRIPTION_PRICE_ID;
      responsePayload.subscriptionProductId = SUBSCRIPTION_PRODUCT_ID;
      responsePayload.subscriptionFallbackAmount = SUBSCRIPTION_PRICE_CENTS;
      if (SUBSCRIPTION_PRICE_ID) {
        try {
          const price = await stripe.prices.retrieve(SUBSCRIPTION_PRICE_ID);
          responsePayload.subscriptionPriceAmount = price.unit_amount ?? null;
          responsePayload.subscriptionPriceCurrency = price.currency ?? null;
        } catch (priceError) {
          console.error('Failed to fetch subscription price', priceError);
          responsePayload.subscriptionPriceAmount = null;
          responsePayload.subscriptionPriceCurrency = null;
        }
      } else {
        responsePayload.subscriptionPriceAmount = null;
        responsePayload.subscriptionPriceCurrency = null;
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Payments config failed', error);
    return NextResponse.json({ error: error?.message || 'Failed to load payment config' }, { status: 500 });
  }
}
