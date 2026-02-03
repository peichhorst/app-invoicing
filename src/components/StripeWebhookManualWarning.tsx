'use client';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app').replace(/\/$/, '');
const WEBHOOK_ENDPOINT = `${APP_URL}/api/stripe/webhook`;
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'checkout.session.expired',
  'charge.refunded',
  'refund.updated',
  'charge.refund.updated',
  'invoice.payment_succeeded',
].join(', ');

export function StripeWebhookManualWarning() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-[0.75rem] text-amber-900">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-amber-700">Webhook needs your help</p>
      <p className="mt-2">
        The advanced Standard connection path cannot create webhooks on your behalf, so you must complete the webhook setup yourself after connecting.
        Once the account is linked, open <strong>Developers → Webhooks → Add endpoint</strong>, point it to{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.65rem] text-amber-900">{WEBHOOK_ENDPOINT}</code>, and enable the events listed below.
      </p>
      <p className="mt-2 font-semibold text-[0.7rem]">Enable events: {WEBHOOK_EVENTS}</p>
      <p className="mt-2 text-[0.7rem]">
        Copy the webhook signing secret and paste it into the “Webhook signing secret” field on this page (or store it as{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.65rem] text-amber-900">STRIPE_WEBHOOK_SECRET</code> or via the{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.65rem] text-amber-900">stripewebhookendpoint</code> record) so inbound events authenticate correctly.
      </p>
    </div>
  );
}
