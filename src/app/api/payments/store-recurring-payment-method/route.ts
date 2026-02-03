import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
  : null;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { invoiceId, paymentIntentId, paymentMethodId } = body;

    if (!invoiceId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the invoice and check if it's a recurring invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        userId: true,
        recurringParentId: true,
        user: {
          select: {
            id: true,
            stripeAccountId: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.recurringParentId) {
      // Not a recurring invoice, nothing to do
      return NextResponse.json({ ok: true, message: 'Not a recurring invoice' });
    }

    // Get the recurring invoice record
    const recurringInvoice = await prisma.recurringInvoice.findUnique({
      where: { id: invoice.recurringParentId },
      select: {
        id: true,
        autoPayEnabled: true,
        firstPaidAt: true,
        stripeCustomerId: true,
      },
    });

    if (!recurringInvoice) {
      return NextResponse.json({ error: 'Recurring invoice not found' }, { status: 404 });
    }

    // Check if this is the first payment
    const isFirstPayment = !recurringInvoice.firstPaidAt;

    if (isFirstPayment && invoice.user.stripeAccountId) {
      // Retrieve the payment method from the connected account
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId,
        { stripeAccount: invoice.user.stripeAccountId }
      );

      // Get or create a customer for future charges
      let customerId = recurringInvoice?.stripeCustomerId;
      
      if (!customerId && paymentMethod.customer) {
        customerId = typeof paymentMethod.customer === 'string' 
          ? paymentMethod.customer 
          : paymentMethod.customer.id;
      }

      // Update the recurring invoice with payment method and enable auto-pay
      await prisma.recurringInvoice.update({
        where: { id: invoice.recurringParentId },
        data: {
          stripePaymentMethodId: paymentMethodId,
          stripeCustomerId: customerId || undefined,
          autoPayEnabled: true,
          firstPaidAt: new Date(),
          status: 'ACTIVE',
        },
      });

      console.log(`✅ Auto-pay enabled for recurring invoice ${invoice.recurringParentId}`);
    }

    return NextResponse.json({ 
      ok: true, 
      autoPayEnabled: isFirstPayment,
      message: isFirstPayment 
        ? 'Payment method saved. Future invoices will be charged automatically.' 
        : 'Recurring invoice already set up for auto-pay'
    });
  } catch (error: any) {
    console.error('Store recurring payment method failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to store payment method' },
      { status: 500 }
    );
  }
}
