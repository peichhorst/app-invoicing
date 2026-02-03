import { Resend } from 'resend';

const ENABLE_LOG_EMAILS = process.env.WEBHOOK_LOG_EMAILS_ENABLED === 'true';
const resend =
  ENABLE_LOG_EMAILS && process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export async function sendWebhookLogEmail(subject: string, body: string) {
  if (!ENABLE_LOG_EMAILS) {
    console.debug('Webhook log email suppressed (disabled in env).', { subject });
    return;
  }

  if (!resend) {
    console.warn('Webhook log email requested, but RESEND_API_KEY or config missing.', { subject });
    return;
  }

  await resend.emails.send({
    from: 'webhook-logger@858webdesign.com',
    to: 'petere2103@gmail.com',
    subject,
    html: `<pre>${body}</pre>`,
  });
}
