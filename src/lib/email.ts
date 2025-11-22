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
  const pdfElement = React.createElement(InvoicePDF as any, { invoice, client, user }) as ReactElement;
  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const pdfBase64 = pdfBuffer.toString('base64');

  const logoBlock =
    user?.logoDataUrl &&
    `<div style="margin-bottom:12px;"><img src="${user.logoDataUrl}" alt="Logo" style="max-height:48px; object-fit:contain;"/></div>`;

  const attachments = [
    {
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBase64,
    },
  ];

  const buildHtml = (copyNotice?: string) => `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
      ${logoBlock || ''}
      <h1 style="color: #1a1a1a; margin: 0 0 8px 0;">Invoice #${invoice.invoiceNumber}</h1>
      <p style="margin: 0 0 16px 0; color: #444;">${user?.companyName || 'Your Company'}</p>
      ${copyNotice ? `<p style="padding: 10px 12px; background: #f4f4ff; border-radius: 8px; color: #4f46e5; font-weight: 600;">${copyNotice}</p>` : ''}
      <p>Hi ${client.contactName?.split(' ')[0] || 'there'},</p>
      <p>Thank you for your business! Please find your invoice attached.</p>
      <p style="margin: 30px 0;">
        <a href="https://yourapp.com/i/${invoice.id}"
           style="background: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          View Invoice Online
        </a>
      </p>
      <p>Questions? Just reply to this email.</p>
      <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
      <small>${user?.companyName || 'Your Company'} - ${user?.email || defaultFrom}</small>
    </div>
  `;

  // Send to client
  await resend.emails.send({
    from: defaultFrom,
    replyTo: user?.email || undefined,
    to: [client.email],
    subject: `Invoice #${invoice.invoiceNumber} from ${user?.companyName || 'Your Company'}`,
    html: buildHtml(),
    attachments,
  });

  // Send a separate copy to the account user
  if (user?.email) {
    await resend.emails.send({
      from: defaultFrom,
      to: [user.email],
      subject: `Copy: Invoice #${invoice.invoiceNumber} sent to ${client.companyName || 'client'}`,
      html: buildHtml('Copy of the invoice that was sent to the client.'),
      attachments,
    });
  }
}
