// src/app/api/payments/config/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get('seller') || null;
  const invoiceId = url.searchParams.get('invoice') || null;

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

    if (!targetUser?.stripePublishableKey) {
      return NextResponse.json({ error: 'Stripe publishable key not configured for seller' }, { status: 500 });
    }
    if (!targetUser?.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe account not configured for seller' }, { status: 500 });
    }

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Payments config failed', error);
    return NextResponse.json({ error: error?.message || 'Failed to load payment config' }, { status: 500 });
  }
}
