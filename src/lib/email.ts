// src/lib/email.ts
import { Resend } from 'resend';
import React from 'react';
import type { ReactElement } from 'react';
import { InvoicePDF } from '@/components/InvoicePDF';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFrom = process.env.RESEND_FROM || 'invoices@858webdesign.com';
const adminAlertEmail = process.env.REGISTRATION_ALERT_EMAIL || 'petere2103@gmail.com';

export async function sendTestEmail(to: string) {
  await resend.emails.send({
    from: defaultFrom,
    to,
    subject: 'Test email from app-invoicing',
    html: '<p>This is a test email from app-invoicing.</p>',
  });
}

export async function sendInvoiceEmail(
  invoice: any,
  client: any,
  user: any,
  options: { reminderNotice?: string; reminderSubject?: string } = {}
) {
  const pdfElement = React.createElement(InvoicePDF as any, { invoice, client, user }) as ReactElement;
  const pdfBuffer = await renderToBuffer(pdfElement as any);
  const pdfBase64 = pdfBuffer.toString('base64');

  // ——— LOGO HANDLING ———
  const isValidLogoUrl = (value?: string | null): boolean => {
    if (!value) return false;
    const normalized = value.trim();
    try {
      const url = new URL(normalized);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const rawLogoUrl = (user?.logoDataUrl ?? '').trim();
  const normalizedLogo = rawLogoUrl.replace(/\s+/g, '');
  const logoSrc = isValidLogoUrl(normalizedLogo) ? normalizedLogo : null;
  const logoBlock = logoSrc
    ? `<img src="${logoSrc}"
            alt="${user?.companyName || 'Company logo'}"
            style="max-height:72px; height:72px; width:auto; object-fit:contain; display:block; border:0; outline:none;" />`
    : '';
  const logoError = rawLogoUrl && !logoSrc
    ? `<div style="margin-bottom:12px; padding:8px 10px; background:#fef2f2; color:#b91c1c; border:1px solid #fecdd3; border-radius:8px;">
         Logo URL looks invalid. Please update it in your profile.
       </div>`
    : '';

  // ——— PAYMENT URL ———
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const payUrl = invoice.shortCode
    ? `${appBase}/p/${invoice.shortCode}`
    : `${appBase}/payment?seller=${user?.id || ''}&invoice=${invoice.id}`;
  let portalUser = invoice.client?.id
    ? await prisma.clientPortalUser.findFirst({ where: { clientId: invoice.client.id } })
    : null;
  if (!portalUser && invoice.client?.id) {
    portalUser = await prisma.clientPortalUser.create({
      data: {
        clientId: invoice.client.id,
        email: invoice.client.email ?? undefined,
        portalToken: crypto.randomBytes(24).toString('hex'),
      },
    });
  }
  const portalLink = portalUser ? `${appBase}/client/${encodeURIComponent(portalUser.portalToken)}` : null;

  // Attachments (only the PDF)
  const attachments: any[] = [
    {
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBase64,
      contentType: 'application/pdf',
    },
  ];

  // ——— REST OF EMAIL (unchanged) ———
  const formatCurrency = (n: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0));
  const totalFormatted = formatCurrency(invoice?.total ?? 0);
  const isPaid = invoice?.status === 'PAID';
  const paidOn = isPaid && invoice?.updatedAt ? new Date(invoice.updatedAt).toLocaleDateString() : null;
  const paidBadge = isPaid
    ? `<span style="display:inline-block; margin-left:8px; padding:2px 8px; border-radius:12px; background:#dcfce7; color:#15803d; font-size:12px; font-weight:700;">Paid</span>`
    : '';
  const reminderBadge = options.reminderNotice
    ? `<span style="display:inline-block; margin-left:8px; padding:2px 8px; border-radius:12px; background:#e0e7ff; color:#4338ca; font-size:12px; font-weight:700;">Reminder</span>`
    : '';

  const mailToTargetText = user?.mailToAddressTo?.trim();
  const mailRecipientName = mailToTargetText || user?.companyName || user?.name;
  const mailToLines = [
    mailRecipientName,
    user?.addressLine1,
    user?.addressLine2,
    [user?.city, user?.state, user?.postalCode].filter(Boolean).join(', '),
    user?.country,
  ].filter(Boolean);
  const showMailBlock = (user?.mailToAddressEnabled ?? false) && mailToLines.length > 0;
  const mailHeading = 'Mail & Issue Check To:';
  const mailBlock = showMailBlock
    ? `<div style="margin-top:8px; padding:8px; border:1px solid #eee; border-radius:6px; background:#fff;">
         <p style="margin:0 0 4px 0; color:#444; font-weight:600;">${mailHeading}</p>
         ${mailToLines.map((line) => `<p style="margin:0; color:#444;">${line}</p>`).join('')}
       </div>`
    : '';

  const hasStripeCredentials = Boolean(user?.stripeAccountId && user?.stripePublishableKey);
  const onlinePaymentSection = hasStripeCredentials
    ? `<p style="margin:0 0 12px 0;">
        <a href="${payUrl}" style="background:#6b21a8; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block;">
          Pay Invoice Online
        </a>
      </p>`
    : `<p style="margin:0 0 12px 0; color:#444;">Enable Stripe in your profile to accept online payments.</p>`;

  const portalSection = portalLink
    ? `<div style="margin-top:12px; padding:10px; border-radius:8px; background:#eef2ff; text-align:center;">
        <a href="${portalLink}" style="font-weight:600; color:#4f46e5;">View all your invoices</a>
      </div>`
    : '';
  const poweredByFooter =
    user?.planTier === 'FREE'
      ? `<p style="margin:16px 0 0; font-size:10px; color:#9ca3af; text-align:center;">Powered by ClientWave</p>`
      : '';

  const altPaymentsBlock = `
    <div style="margin-top:16px; padding:12px; border:1px dashed #ddd; border-radius:8px; background:#fafafa;">
      <p style="margin:0 0 6px 0; color:#555; font-weight:900; font-size:20px; padding-bottom:10px;">Payment options:</p>
      ${onlinePaymentSection}
      ${mailBlock ? `<div style="margin-bottom:12px;">${mailBlock}</div>` : ''}
      ${user?.zelleHandle ? `<p style="margin:0 0 4px 0; color:#444;">Zelle: ${user.zelleHandle}</p>` : ''}
      ${user?.venmoHandle ? `<p style="margin:0 0 4px 0; color:#444;">Venmo: ${user.venmoHandle}</p>` : ''}
    </div>`;

  const buildHtml = (copyNotice?: string) => `
    <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee; border-radius:12px;">
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="vertical-align:top;">
            <h1 style="color:#1a1a1a; margin:0 0 6px 0;">Invoice ${paidBadge}${reminderBadge}</h1>
            <p style="margin:0; color:#444;">From: ${user?.companyName || 'Your Company'}</p>
            <p style="margin:10px 0 0 0; color:#444;">${isPaid ? 'Receipt' : 'Invoice'} #${invoice.invoiceNumber}</p>
            ${paidOn ? `<p style="margin:2px 0 0 0; color:#444;">Paid on ${paidOn}</p>` : ''}
          </td>
          <td style="vertical-align:top; text-align:right; width:1%;">
            ${logoBlock || logoError}
          </td>
        </tr>
      </table>

      ${copyNotice ? `<p style="padding:10px 12px; background:#f4f4ff; border-radius:8px; color:#4f46e5; font-weight:600;">${copyNotice}</p>` : ''}

      <p>Hi ${client.contactName?.split(' ')[0] || 'there'},</p>
      <p>Thank you for your business! Please find your invoice attached.</p>
      <p style="margin:12px 0 18px 0; color:#111; font-weight:700;">Invoice Total: ${totalFormatted}</p>

      ${isPaid
        ? `<p style="padding:12px; border:1px dashed #ddd; border-radius:8px; background:#fafafa; color:#15803d; font-weight:700;">Paid${paidOn ? ` on ${paidOn}` : ''}. This is your receipt.</p>`
        : altPaymentsBlock}

      <p>Questions? Just reply to this email.</p>
      <hr style="margin:40px 0; border:none; border-top:1px solid #eee;" />
      <small>${user?.companyName || 'Your Company'} - ${user?.email || defaultFrom}</small>
      ${portalSection}
      ${poweredByFooter}
    </div>
  `;

  const baseSubject =
    invoice.status === 'PAID'
      ? 'Paid Invoice Receipt'
      : `Invoice from ${user?.companyName || 'Your Company'}`;
  const subject = options.reminderSubject ?? baseSubject;

  const adminInvoiceEmail = process.env.INVOICE_ADMIN_EMAIL || 'petere2103@gmail.com';
  const toRecipients = Array.from(
    new Set(
      [client.email, adminInvoiceEmail]
        .filter(Boolean)
        .map((value) => value!.trim())
    )
  );

  await resend.emails.send({
    from: defaultFrom,
    replyTo: user?.email || undefined,
    to: toRecipients,
    subject,
    html: buildHtml(options.reminderNotice),
    attachments,
  });

  if (user?.email && user.email !== client.email) {
    await resend.emails.send({
      from: defaultFrom,
      to: [user.email],
      subject: `Copy: Invoice #${invoice.invoiceNumber} sent to ${client.companyName || 'client'}`,
      html: buildHtml('Copy of the invoice that was sent to the client.'),
      attachments,
    });
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const resetUrl = new URL('/reset-password', appBase);
  resetUrl.searchParams.set('token', token);

  await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Reset your ClientWave password',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
        <h1 style="margin-bottom:16px;color:#1a1a1a;">Password reset requested</h1>
        <p style="margin-bottom:16px;color:#444;">Click the button below to set a new password for your ClientWave account. This link expires in one hour.</p>
        <p>
          <a href="${resetUrl.toString()}" style="background:#6366f1;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a>
        </p>
        <p style="margin-top:20px;color:#777;">If you didn’t request this change, just ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTrialReminderEmail(email: string) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  await resend.emails.send({
    from: defaultFrom,
    to: [email],
    subject: 'Your Pro trial now has 7 days remaining',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
        <h1 style="color:#1a1a1a;">Your Pro trial just entered the grace period</h1>
        <p style="color:#444; margin-bottom:16px;">
          Thanks for trying ClientWave Pro! You still have 7 days left to enjoy the pro features, before the trial expires.
        
        </p>
        <p style="margin-bottom:18px;">
          Want to keep the Pro features? <a href="${appBase}/dashboard/profile" style="color:#4f46e5;">Upgrade anytime from your dashboard.</a>
        </p>
        <p style="color:#777;">Feel free to reply with questions or request help anytime.</p>
    </div>
  `,
  });
}

type TrackDriveSummary = {
  caller_id?: string;
  email?: string;
  name?: string;
  source?: string;
  duration?: number;
  data?: Record<string, unknown>;
  clientId?: string;
  userEmail?: string;
  status?: 'success' | 'error';
  error?: string;
};

export async function sendTrackDriveNotification(to: string, payload: TrackDriveSummary) {
  const summaryLines = [
    payload.caller_id ? `Caller ID: ${payload.caller_id}` : null,
    payload.name ? `Name: ${payload.name}` : null,
    payload.email ? `Email: ${payload.email}` : null,
    payload.source ? `Source: ${payload.source}` : null,
    typeof payload.duration === 'number' ? `Duration: ${payload.duration}s` : null,
    payload.data ? `Data: ${JSON.stringify(payload.data)}` : null,
    payload.clientId ? `Client ID: ${payload.clientId}` : null,
    payload.userEmail ? `User: ${payload.userEmail}` : null,
  ]
    .filter(Boolean)
    .join('<br/>');
  const statusLabel =
    payload.status === 'error'
      ? `<span style="color:#dc2626;font-weight:700;">Failure</span>`
      : `<span style="color:#15803d;font-weight:700;">Success</span>`;

  await resend.emails.send({
    from: defaultFrom,
    to,
    subject: 'New TrackDrive lead received',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="margin-bottom:12px;color:#1e1e1e;">TrackDrive webhook triggered</h1>
        <p style="margin-bottom:6px;">Status: ${statusLabel}</p>
        <p style="margin-bottom:12px;color:#444;">A TrackDrive lead/call webhook just hit your app.</p>
        <div style="margin-bottom:12px; padding:12px; border-radius:8px; background:#f4f4ff; border:1px solid #e0e7ff;">
          ${summaryLines || 'No additional data'}
        </div>
        ${payload.error ? `<p style="margin-top:0;color:#dc2626;"><strong>Error:</strong> ${payload.error}</p>` : ''}
        <p style="margin-top:20px;color:#777;">This notification is auto-generated from the webhook.</p>
      </div>
    `,
  });
}

export async function sendRegistrationAlert(email: string) {
  const subject = 'New ClientWave user registered';
  const html = `
    <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
      <h1 style="margin-bottom:12px;color:#1e1e1e;">New registration</h1>
      <p style="margin-bottom:8px;color:#444;">A new user signed up for ClientWave:</p>
      <ul style="padding-left:18px; color:#444;">
        <li>Email: ${email}</li>
        <li>Time: ${new Date().toLocaleString()}</li>
      </ul>
    </div>
  `;
  await resend.emails.send({
    from: defaultFrom,
    to: [adminAlertEmail],
    subject,
    html,
  });
}
