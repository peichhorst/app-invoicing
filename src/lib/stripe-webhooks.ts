import { Payment, Prisma, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { reconcileInvoiceStatus } from '@/lib/payments';
import { sendAdminNotificationEmail } from '@/lib/email';
import { sendWebhookLogEmail } from './webhook-logger';

type PaymentIntentWithCharges = Stripe.PaymentIntent & {
  charges?: Stripe.ApiList<Stripe.Charge>;
};

async function findPaymentByIntent(intentId: string) {
  return prisma.payment.findFirst({ where: { stripePaymentIntentId: intentId } });
}

async function findPaymentByCharge(chargeId: string) {
  return prisma.payment.findFirst({ where: { stripeChargeId: chargeId } });
}

async function findPaymentSafely(intentId: string, metadataId?: string | null) {
  let payment = await findPaymentByIntent(intentId);
  if (!payment && metadataId) {
    payment = await prisma.payment.findUnique({ where: { id: metadataId } });
  }
  return payment;
}

async function updatePaymentAndReconcile(paymentId: string, data: Prisma.PaymentUpdateInput) {
  const payment = await prisma.payment.update({ where: { id: paymentId }, data });
  await reconcileInvoiceStatus(payment.invoiceId);
  return payment;
}

async function logPaymentRow(event: Stripe.Event, payment: Payment) {
  const payload = JSON.stringify(payment, null, 2);
  console.info('Payment row inserted/updated in DB via webhook', {
    event: event.type,
    payment,
    payload,
  });

  try {
    await sendWebhookLogEmail(
      'Payment Row Inserted/Updated',
      `Payment row inserted/updated in DB:\n${payload}\n\nWebhook event processed successfully.`
    );
    await sendWebhookLogEmail(
      'Webhook Debug',
      `Webhook endpoint was hit and processed event: ${event.type}\nPayment row: ${payload}`
    );
  } catch (error: any) {
    console.error('Webhook debug email failed', error);
  }
}

async function logStripeEventReceived(event: Stripe.Event) {
  const stripeAccountId = event.account ?? 'platform';
  console.info('Stripe event received', {
    eventId: event.id,
    type: event.type,
    stripeAccountId,
  });

  try {
    const detail = event.data.object as Record<string, any>;
    const summary = {
      eventId: event.id,
      type: event.type,
      object: detail?.object ?? 'unknown',
      status: detail?.status,
      amount: detail?.amount,
      metadata: detail?.metadata,
      invoice: detail?.invoice,
      payment_intent: detail?.payment_intent,
      payment_method: detail?.payment_method,
    };
    await sendWebhookLogEmail(
      'Stripe event received',
      `Stripe event received for ${event.type}:\n${JSON.stringify(summary, null, 2)}`
    );
  } catch (error: any) {
    console.error('Stripe event receipt logging failed', error);
  }
}




export async function handleStripeEvent(event: Stripe.Event) {
  const stripeAccountHeader = event.account ? { stripeAccount: event.account } : undefined;

  await logStripeEventReceived(event);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.payment_intent) break;

      console.info(`Looking up payment for session ${session.id}`);
      const payment = await prisma.payment.findFirst({
        where: {
          stripeCheckoutSessionId: session.id,
        },
      });
      if (!payment) {
        console.info(`No payment found for session ${session.id}`);
        break;
      }

    console.info(`Associating payment ${payment.id} with checkout session ${session.id}`);
    const updated = await updatePaymentAndReconcile(payment.id, {
      stripePaymentIntentId: session.payment_intent as string,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : payment.stripeCustomerId,
    });

    await logPaymentRow(event, updated);
    void sendStripePaymentNotification(event, `Checkout session ${session.id} completed with intent ${session.payment_intent}`, {
      id: payment.id,
      invoiceId: payment.invoiceId,
    });
    break;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as PaymentIntentWithCharges;
      console.info(`Looking up payment for intent ${intent.id}`);
      const payment = await findPaymentSafely(intent.id, intent.metadata?.paymentId ?? null);
      if (!payment) {
        console.info(`No payment found for intent ${intent.id}`);
        break;
      }

    const charge = intent.charges?.data?.[0];
    const latestChargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge?.id ?? null;
    const chargeId = charge?.id ?? latestChargeId;
    const balanceTransactionId =
      (charge?.balance_transaction as string) ?? payment.stripeBalanceTransactionId;
    const updated = await updatePaymentAndReconcile(payment.id, {
      status: PaymentStatus.succeeded,
      paidAt: new Date(),
      stripeCustomerId: typeof intent.customer === 'string' ? intent.customer : undefined,
      stripePaymentIntentId: intent.id,
      stripeChargeId: chargeId ?? payment.stripeChargeId,
      stripeBalanceTransactionId: balanceTransactionId,
    });
      await logPaymentRow(event, updated);
      void sendStripePaymentNotification(
        event,
        `Payment intent ${intent.id} succeeded for ${intent.amount / 100} ${intent.currency}`,
        { id: payment.id, invoiceId: payment.invoiceId },
        `Capture: ${charge?.captured ? 'yes' : 'no'}`
      );
      break;
    }

    case 'payment_intent.payment_failed':
    case 'checkout.session.async_payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.info(`Looking up payment for failed intent ${intent.id}`);
      const payment = await findPaymentByIntent(intent.id);
      if (!payment) {
        console.info(`No payment found for failed intent ${intent.id}`);
        break;
      }

      const latestCharge = intent.latest_charge;
      const message =
        intent.last_payment_error?.message ??
        (typeof latestCharge !== 'string' ? latestCharge?.failure_message : undefined) ??
        'Payment failed';

      const updated = await updatePaymentAndReconcile(payment.id, {
        status: PaymentStatus.failed,
        lastError: message,
      });
      await logPaymentRow(event, updated);
      void sendStripePaymentNotification(
        event,
        `Payment intent ${intent.id} failed: ${message}`,
        { id: payment.id, invoiceId: payment.invoiceId },
        `Last_payment_error: ${message}`
      );
      break;
    }

    case 'payment_intent.canceled':
    case 'checkout.session.expired': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.info(`Looking up payment for canceled intent ${intent.id}`);
      const payment = await findPaymentByIntent(intent.id);
      if (!payment) {
        console.info(`No payment found for canceled intent ${intent.id}`);
        break;
      }

      const updated = await updatePaymentAndReconcile(payment.id, { status: PaymentStatus.canceled });
      await logPaymentRow(event, updated);
      void sendStripePaymentNotification(
        event,
        `Payment intent ${intent.id} was canceled`,
        { id: payment.id, invoiceId: payment.invoiceId }
      );
      break;
    }

    case 'charge.refunded':
    case 'refund.updated':
    case 'charge.refund.updated': {
      const refund = event.data.object as Stripe.Refund;
      const chargeRef = refund.charge;
      if (!chargeRef) break;
      const chargeId = typeof chargeRef === 'string' ? chargeRef : chargeRef.id;

      console.info(`Looking up payment for charge ${chargeId}`);
      const stripeCharge = stripeAccountHeader
        ? await stripe.charges.retrieve(chargeId, stripeAccountHeader)
        : await stripe.charges.retrieve(chargeId);
      const metadataPaymentId =
        typeof stripeCharge.metadata?.paymentId === 'string'
          ? stripeCharge.metadata.paymentId
          : null;

      const paymentIntentRef = refund.payment_intent;
      const paymentIntentId =
        typeof paymentIntentRef === 'string' ? paymentIntentRef : paymentIntentRef?.id;

      let payment =
        (await findPaymentByCharge(chargeId)) ??
        (paymentIntentId ? await findPaymentByIntent(paymentIntentId) : null);
      if (!payment && metadataPaymentId) {
        payment = await prisma.payment.findUnique({ where: { id: metadataPaymentId } });
      }
      if (!payment) {
        console.info(`No payment found for charge ${chargeId}`);
        break;
      }

      const refundedDecimal = new Prisma.Decimal((stripeCharge.amount_refunded ?? 0) / 100);
      const totalPaidDecimal = new Prisma.Decimal(payment.amount ?? 0);
      const status =
        refundedDecimal.greaterThanOrEqualTo(totalPaidDecimal)
          ? PaymentStatus.refunded
          : PaymentStatus.partially_refunded;

      const updated = await updatePaymentAndReconcile(payment.id, {
        refundedAmount: refundedDecimal.toNumber(),
        status,
        stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
        stripeChargeId: chargeId ?? payment.stripeChargeId,
        stripeBalanceTransactionId:
          (stripeCharge.balance_transaction as string) ?? payment.stripeBalanceTransactionId,
      });
      await logPaymentRow(event, updated);
      void sendStripePaymentNotification(
        event,
        `Charge ${chargeId} refunded (${status})`,
        { id: payment.id, invoiceId: payment.invoiceId },
        `Refunded amount: ${refundedDecimal.toString()}`
      );
      break;
    }

    default:
      break;
  }
}

type NotificationContext = { id?: string; invoiceId?: string };

async function sendStripePaymentNotification(
  event: Stripe.Event,
  summary: string,
  payment?: NotificationContext,
  extra?: string
) {
  try {
    const detail = event.data.object as Record<string, any>;
    const objectId = detail?.id ?? 'N/A';
    const objectType = detail?.object ?? 'unknown';
    const lines = [
      `Event ID: ${event.id}`,
      `Object: ${objectId} (${objectType})`,
      payment?.id ? `Payment ID: ${payment.id}` : '',
      payment?.invoiceId ? `Invoice ID: ${payment.invoiceId}` : '',
      extra ?? '',
    ].filter(Boolean);
    const html = `
      <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
        <h2 style="margin-bottom:12px;color:#111;">Stripe payment notification</h2>
        <p style="margin:0 0 8px;color:#444;">${summary}</p>
        ${lines
          .map((line) => `<p style="margin:0 0 4px;color:#444;">${line}</p>`)
          .join('')}
        <p style="margin-top:12px;font-size:12px;color:#94a3b8;">Received ${new Date().toLocaleString()}</p>
      </div>
    `;
    await sendAdminNotificationEmail({
      subject: `Stripe event ${event.type}`,
      html,
    });
  } catch (error: any) {
    console.error('Stripe notification email failed', error);
  }
}
