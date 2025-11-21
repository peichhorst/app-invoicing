// src/lib/email.ts
import { Resend } from 'resend';
import React from 'react';
import type { ReactElement } from 'react';
import { InvoicePDF } from '@/components/InvoicePDF';
import { renderToBuffer } from '@react-pdf/renderer';

const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFrom = process.env.RESEND_FROM || 'invoices@858webdesign.com';

export async function sendTestEmail(to: string) {
  await resend.emails.send({
    from: defaultFrom,
    to,
    subject: 'Test email from app-invoicing',
    html: '<p>This is a test email from app-invoicing.</p>',
  });
}

export async function sendInvoiceEmail(invoice: any, client: any, user: any) {
  const pdfElement = React.createElement(InvoicePDF as any, { invoice, client }) as ReactElement;
  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const pdfBase64 = pdfBuffer.toString('base64');

  const dueDays =
    invoice.dueDays ??
    (invoice.issueDate && invoice.dueDate
      ? Math.max(
          0,
          Math.round(
            (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0);

  await resend.emails.send({
    from: defaultFrom,
    replyTo: user?.email || undefined,
    to: [client.email],
    subject: `Invoice #${invoice.invoiceNumber} from ${user?.companyName || 'Your Company'}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h1 style="color: #1a1a1a;">Invoice #${invoice.invoiceNumber}</h1>
        <p>Hi ${client.contactName?.split(' ')[0] || 'there'},</p>
        <p>Thank you for your business! Please find your invoice attached.</p>
        <p style="margin: 30px 0;">
          <a href="https://yourapp.com/i/${invoice.id}"
             style="background: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
            View Invoice Online
          </a>
        </p>
        <p>Payment is due within ${dueDays} days.</p>
        <p>Questions? Just reply to this email.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
        <small>${user?.companyName || 'Your Company'} - ${user?.email || defaultFrom}</small>
      </div>
    `,
    attachments: [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
      },
    ],
  });
}
