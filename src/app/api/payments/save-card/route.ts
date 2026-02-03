import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

type SaveCardPayload = {
  userId: string;
  customerId: string;
  paymentMethodId: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SaveCardPayload;
    if (!payload.userId || !payload.customerId || !payload.paymentMethodId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    await stripe.paymentMethods.attach(payload.paymentMethodId, {
      customer: payload.customerId,
    });

    await stripe.customers.update(payload.customerId, {
      invoice_settings: {
        default_payment_method: payload.paymentMethodId,
      },
    });

    await prisma.user.update({
      where: { id: payload.userId },
      data: { defaultPaymentMethodId: payload.paymentMethodId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save card failed', error);
    return NextResponse.json({ error: error?.message || 'Failed to save card' }, { status: 500 });
  }
}
