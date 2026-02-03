import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWebhookLogEmail(subject: string, body: string) {
  await resend.emails.send({
    from: 'webhook-logger@858webdesign.com',
    to: 'petere2103@gmail.com',
    subject,
    html: `<pre>${body}</pre>`,
  });
}

export async function GET() {
  await sendWebhookLogEmail(
    'Test Email from API',
    'This is a test email sent from the /api/test-email endpoint.'
  );
  return NextResponse.json({ success: true });
}