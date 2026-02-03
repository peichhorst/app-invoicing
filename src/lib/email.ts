// src/lib/email.ts
import { Resend } from 'resend';
import React from 'react';
import type { ReactElement } from 'react';
import { InvoicePDF } from '@/components/InvoicePDF';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { renderToBuffer } from '@react-pdf/renderer';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFrom = process.env.RESEND_FROM || 'invoices@858webdesign.com';
const adminAlertEmail = process.env.REGISTRATION_ALERT_EMAIL || 'petere2103@gmail.com';
const emailsEnabled =
  process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_EMAIL === 'true';

const DEFAULT_BUTTON_COLOR = '#1d4ed8';
const PRIMARY_COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#1d4ed8',
  green: '#22c55e',
  red: '#ef4444',
};

const resolveEmailButtonColor = (value?: string | null) => {
  if (!value) {
    return DEFAULT_BUTTON_COLOR;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_BUTTON_COLOR;
  }
  return PRIMARY_COLOR_MAP[normalized] || value;
};

const resolveEmailButtonTextColor = (hex: string) => {
  const cleaned = hex.replace('#', '').trim();
  const normalized = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return '#ffffff';
  }
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
};

export async function sendEmail(payload: Parameters<typeof resend.emails.send>[0]) {
  if (!emailsEnabled) {
    console.log('[Email suppressed in dev]', payload.subject || 'No subject', payload.to);
    return;
  }
  await resend.emails.send(payload);
}

export async function sendMessageEmail({
  to,
  fromName,
  companyName,
  text,
  fromEmail,
  fileUrl,
}: {
  to: string;
  fromName?: string | null;
  companyName?: string | null;
  text: string;
  fromEmail?: string | null;
  fileUrl?: string;
}) {
  await sendEmail({
    from: defaultFrom,
    to: [to],
    subject: `${fromName || 'Someone'} sent a message${companyName ? ` · ${companyName}` : ''}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
        <h2 style="margin:0 0 12px; color:#111;">New message${companyName ? ` from ${companyName}` : ''}</h2>
        <p style="margin:0 0 16px; color:#444;"><strong>${fromName || 'A teammate'}</strong> says:</p>
        ${fromEmail ? `<p style="margin:0 0 16px; color:#444;">Email: <a href="mailto:${fromEmail}" style="color:#4f46e5; text-decoration:underline;">${fromEmail}</a></p>` : ''}
        <div style="white-space:pre-wrap; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; color:#0f172a; margin-bottom:16px;">
          ${text.replace(/\n/g, '<br/>')}
        </div>
        ${
          fileUrl
            ? `<p style="margin:0 0 12px;"><a href="${fileUrl}" style="color:#4f46e5; text-decoration:underline;">View attachment</a></p>`
            : ''
        }
        <p style="margin:24px 0 0; font-size:12px; color:#94a3b8;">You’re receiving this because you’re in ${
          companyName || 'your team'
        }.</p>
      </div>
    `,
  });
}

export async function sendInviteEmail({
  email,
  temporaryPassword,
  inviterName,
  companyName,
  confirmLink,
  companyPrimaryColor,
}: {
  email: string;
  temporaryPassword: string;
  inviterName?: string | null;
  companyName?: string | null;
  confirmLink?: string;
  companyPrimaryColor?: string | null;
}) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const loginUrl = new URL('/dashboard', appBase).toString();
  const inviter = inviterName ? inviterName.trim() : 'Your team admin';
  const companyLabel = companyName?.trim() || 'ClientWave';
  const link = confirmLink || loginUrl;
  const buttonColor = resolveEmailButtonColor(companyPrimaryColor);
  const buttonTextColor = resolveEmailButtonTextColor(buttonColor);

  await sendEmail({
    from: defaultFrom,
    to: [email],
    subject: `Invitaion from ${companyLabel} on ClientWave`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="margin-bottom:12px; color:#111;">You’re invited to ClientWave</h1>
        <p style="margin-bottom:12px; color:#444;">
          ${inviter} added you to ${companyLabel} on ClientWave. You can go ahead and log in to get started—the workspace is already unlocked.
        </p>
        <p style="margin-bottom:12px;">
          <strong>Email:</strong> ${email}<br/>
          <strong>Temporary password:</strong> ${temporaryPassword}
        </p>
        <p>
          <a
            href="${link}"
            style="background:${buttonColor}; color:${buttonTextColor}; padding:12px 20px; border-radius:8px; text-decoration:none; display:inline-block;"
          >
            Confirm your account
          </a>
        </p>
        <p style="margin-top:16px; color:#777;">
                    You'll be prompted to set your own password after logging in. If you need help, reply to this email.
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerificationEmail(
  newEmail: string,
  token: string,
  primaryColor?: string | null
) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const verifyUrl = new URL('/settings/email/verify', appBase);
  verifyUrl.searchParams.set('token', token);

  await sendEmail({
    from: defaultFrom,
    to: [newEmail],
    subject: 'Verify your new email for ClientWave',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#1b1b1b;">Verify your new email</h1>
        <p style="color:#444; margin-bottom:16px;">Click the button below to confirm you own this email address. Once verified, your ClientWave login will switch to ${newEmail}.</p>
        <p>
          <a href="${verifyUrl.toString()}" style="background:${resolveEmailButtonColor(
            primaryColor
          )}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block;">Verify new email</a>
        </p>
        <p style="margin-top:16px; color:#777;">This link expires in 1 hour. If you didn’t request this change, ignore this message.</p>
      </div>
    `,
  });
}

export async function sendEmailChangedNotification(oldEmail: string, newEmail: string) {
  if (!oldEmail) return;
  await sendEmail({
    from: defaultFrom,
    to: [oldEmail],
    subject: 'ClientWave email changed',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#1b1b1b;">Your ClientWave email changed</h1>
        <p style="color:#444; margin-bottom:16px;">We’ve updated your login email to ${newEmail}.</p>
        <p>If you didn’t authorize this change, please <a href="mailto:${defaultFrom}">contact support</a> immediately.</p>
      </div>
    `,
  });
}
export async function sendMagicLoginEmail(
  email: string,
  token: string,
  primaryColor?: string | null
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/api/auth/magic-login?token=${token}`;

  await sendEmail({
    from: defaultFrom,
    to: [email],
    subject: 'Your magic login link',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#1b1b1b;">Login to your account</h1>
        <p style="color:#444; margin-bottom:24px;">Click the button below to securely log in to your account. This link will expire in 15 minutes.</p>
        <a
          href="${loginUrl}"
          style="display:inline-block; background:${resolveEmailButtonColor(
            primaryColor
          )}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-bottom:24px;"
        >
          Log in to ClientWave
        </a>
        <p style="color:#777; font-size:14px; margin-top:24px;">Or copy this link: <a href="${loginUrl}" style="color:${resolveEmailButtonColor(
          primaryColor
        )}; word-break:break-all;">${loginUrl}</a></p>
        <p style="margin-top:16px; color:#777; font-size:14px;">This link expires in 15 minutes. If you didn't request this login link, ignore this message.</p>
      </div>
    `,
  });
}
export async function sendTestEmail(to: string) {
  await sendEmail({
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

  const rawLogoUrl = (user?.company?.logoUrl ?? user?.logoDataUrl ?? '').trim();
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
  const payUrl = `${appBase}/payment?seller=${user?.id || ''}&invoice=${invoice.id}`;
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

  // Attachments - Use stored PDF URL if available, otherwise generate on-the-fly
  let attachments: any[] = [];
  if (invoice.pdfUrl) {
    // If we have a stored PDF URL, we can reference it but we can't attach it directly from external storage
    // So we'll still generate the PDF for attachment but note that the stored version exists
    const pdfElement = React.createElement(InvoicePDF as any, { invoice, client, user }) as ReactElement;
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    const pdfBase64 = pdfBuffer.toString('base64');
    attachments = [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ];
  } else {
    // Generate PDF on-the-fly for attachment
    const pdfElement = React.createElement(InvoicePDF as any, { invoice, client, user }) as ReactElement;
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    const pdfBase64 = pdfBuffer.toString('base64');
    attachments = [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ];
  }

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
  const mailRecipientName =
    mailToTargetText || user?.company?.name || user?.companyName || user?.name;
  const mailToLines = [
    mailRecipientName,
    user?.company?.addressLine1,
    user?.company?.addressLine2,
    [user?.company?.city, user?.company?.state, user?.company?.postalCode].filter(Boolean).join(', '),
    user?.company?.country ?? 'USA',
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
        <a
          href="${payUrl}"
          style="background:${resolveEmailButtonColor(user?.company?.primaryColor ?? null)}; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block;"
        >
          Pay Invoice Online
        </a>
      </p>`
    : '';
  const hasPaymentOptions =
    hasStripeCredentials ||
    showMailBlock ||
    Boolean(user?.zelleHandle) ||
    Boolean(user?.venmoHandle);

  const portalSection = portalLink
    ? `<div style="margin-top:12px; padding:10px; border-radius:8px; background:#eef2ff; text-align:center;">
        <a href="${portalLink}" style="font-weight:600; color:#4f46e5;">View all your invoices</a>
      </div>`
    : '';
  const poweredByFooter =
    user?.planTier === 'FREE'
      ? `<p style="margin:16px 0 0; font-size:10px; color:#9ca3af; text-align:center;">Powered by ClientWave</p>`
      : '';

  const paymentOptionsBlock = hasPaymentOptions
    ? `
      <div style="margin-top:16px; padding:12px; border:1px dashed #ddd; border-radius:8px; background:#fafafa;">
        <p style="margin:0 0 6px 0; color:#555; font-weight:900; font-size:20px; padding-bottom:10px;">Payment options:</p>
        ${onlinePaymentSection}
        ${mailBlock ? `<div style="margin-bottom:12px;">${mailBlock}</div>` : ''}
        ${user?.zelleHandle ? `<p style="margin:0 0 4px 0; color:#444;">Zelle: ${user.zelleHandle}</p>` : ''}
        ${user?.venmoHandle ? `<p style="margin:0 0 4px 0; color:#444;">Venmo: ${user.venmoHandle}</p>` : ''}
      </div>`
    : '';

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
      : paymentOptionsBlock}
      
      ${invoice.pdfUrl ? `<p style="margin:12px 0 0 0; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:14px;">
        <strong>Official PDF:</strong> <a href="${invoice.pdfUrl}" style="color:#4f46e5; text-decoration:underline;">Download permanent copy</a>
      </p>` : ''}

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

  await sendEmail({
    from: defaultFrom,
    replyTo: user?.email || undefined,
    to: toRecipients,
    subject,
    html: buildHtml(options.reminderNotice),
    attachments,
  });

  if (user?.email && user.email !== client.email) {
    await sendEmail({
      from: defaultFrom,
      to: [user.email],
      subject: `Copy: Invoice #${invoice.invoiceNumber} sent to ${client.companyName || 'client'}`,
      html: buildHtml('Copy of the invoice that was sent to the client.'),
      attachments,
    });
  }
}

function formatDocumentLabel(type?: string) {
  const normalized = typeof type === 'string' ? type.toUpperCase() : '';
  if (normalized === 'CONTRACT') return 'Contract';
  return 'Proposal';
}

function formatDocumentLower(type?: string) {
  return formatDocumentLabel(type).toLowerCase();
}

export async function sendProposalEmail(proposal: any, client: any, user: any) {
  if (!client?.email) {
    return;
  }
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const proposalUrl = `${appBase}/dashboard/proposals/${proposal.id}`;

  const lineItems = (JSON.parse(proposal.lineItems || '[]') as {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[]).map((line) => ({
    description: line.description,
    quantity: Number(line.quantity) || 0,
    rate: Number(line.rate) || 0,
    amount: Number(line.amount) || 0,
  }));
  const subtotal = lineItems.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totals = {
    subtotal,
    total: Number(proposal.total) || subtotal,
    currency: proposal.currency || 'USD',
  };

  const companyInfo = {
    name: user?.company?.name || user?.companyName || 'Your Company',
    logoUrl: user?.company?.logoUrl || undefined,
    address:
      [user?.company?.addressLine1, user?.company?.addressLine2]
        .filter(Boolean)
        .join('\n') || undefined,
    email: user?.email || undefined,
    phone: user?.phone || undefined,
  };

  const clientInfo = {
    name: client.contactName || client.companyName || '',
    companyName: client.companyName || client.contactName || '',
    email: client.email || undefined,
    address: [client.addressLine1, client.addressLine2].filter(Boolean).join('\n') || undefined,
  };

  const label = formatDocumentLabel(proposal.type);
  const lower = formatDocumentLower(proposal.type);
  
  // Generate attachment PDF - use stored PDF if available, otherwise generate on-the-fly
  let pdfBase64: string;
  if (proposal.pdfUrl) {
    // If we have a stored PDF URL, generate a new one for attachment to ensure consistency
    const pdfElement = React.createElement(DocumentPreview as any, {
      type: lower,
      company: companyInfo,
      client: clientInfo,
      lineItems,
      totals,
      documentNumber: proposal.id.slice(0, 8).toUpperCase(),
      issueDate: proposal.createdAt ? new Date(proposal.createdAt) : undefined,
      dueDate: proposal.validUntil ? new Date(proposal.validUntil) : undefined,
      paymentTerms: proposal.notes || 'Review and sign to move forward.',
    });
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    pdfBase64 = pdfBuffer.toString('base64');
  } else {
    // Generate PDF on-the-fly for attachment
    const pdfElement = React.createElement(DocumentPreview as any, {
      type: lower,
      company: companyInfo,
      client: clientInfo,
      lineItems,
      totals,
      documentNumber: proposal.id.slice(0, 8).toUpperCase(),
      issueDate: proposal.createdAt ? new Date(proposal.createdAt) : undefined,
      dueDate: proposal.validUntil ? new Date(proposal.validUntil) : undefined,
      paymentTerms: proposal.notes || 'Review and sign to move forward.',
    });
    const pdfBuffer = await renderToBuffer(pdfElement as any);
    pdfBase64 = pdfBuffer.toString('base64');
  }

  const lineItemsHtml = lineItems
    .map(
      (line) => `
        <tr>
          <td style="padding:8px 0; color:#1f2937;">${line.description}</td>
          <td style="padding:8px 0; color:#1f2937; text-align:right;">${line.quantity}</td>
          <td style="padding:8px 0; color:#1f2937; text-align:right;">${line.rate.toFixed(2)}</td>
          <td style="padding:8px 0; color:#111; text-align:right; font-weight:700;">${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: totals.currency,
          }).format(line.amount || 0)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
      <h1 style="color:#111; margin-bottom:12px;">${user?.company?.name || 'Your Company'} sent a ${label}</h1>
      <p style="color:#444; margin-bottom:12px;">Hi ${client.contactName?.split(' ')[0] || 'there'},</p>
      <p style="color:#444; margin-bottom:24px;">
        We created a ${lower} for <strong>${proposal.title}</strong>. You can view the full details and approve it here:
      </p>
        <p style="margin-bottom:24px;">
          <a
            href="${proposalUrl}"
            style="background:${resolveEmailButtonColor(user?.company?.primaryColor ?? null)}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block;"
          >View ${lower}</a>
        </p>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
          <tr>
            <th style="text-align:left; color:#6b7280; padding-bottom:8px;">Description</th>
            <th style="text-align:right; color:#6b7280; padding-bottom:8px;">Qty</th>
            <th style="text-align:right; color:#6b7280; padding-bottom:8px;">Rate</th>
            <th style="text-align:right; color:#6b7280; padding-bottom:8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml || '<tr><td colspan="4" style="color:#6b7280; padding:8px 0;">No line items yet.</td></tr>'}
        </tbody>
      </table>
      <p style="color:#111; font-weight:700; margin-bottom:12px;">Total: ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: totals.currency,
      }).format(totals.total)}</p>
      ${proposal.scope ? `<p style="color:#444; margin-bottom:12px;"><strong>Scope:</strong> ${proposal.scope}</p>` : ''}
      ${proposal.description ? `<p style="color:#444; margin-bottom:12px;"><strong>Description:</strong> ${proposal.description}</p>` : ''}
      ${proposal.notes ? `<p style="color:#444; margin-bottom:12px;"><strong>Notes:</strong> ${proposal.notes}</p>` : ''}
      ${proposal.pdfUrl ? `<p style="margin:12px 0 12px 0; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:14px;">
        <strong>Official PDF:</strong> <a href="${proposal.pdfUrl}" style="color:#4f46e5; text-decoration:underline;">Download permanent copy</a>
      </p>` : ''}
      <p style="color:#94a3b8; font-size:12px; margin-top:24px;">To finalize this ${lower}, simply sign it in ClientWave.</p>
      <p style="margin-top:24px; font-size:11px; color:#94a3b8;">You're receiving this because you're listed as the client on this ${lower}.</p>
    </div>
  `;

  const attachments = [
    {
      filename: `${label}-${proposal.id.slice(0, 8)}.pdf`,
      content: pdfBase64,
      contentType: 'application/pdf',
    },
  ];

  const subject = `${label} from ${user?.company?.name || 'Your Company'}`;
  const toRecipients = Array.from(new Set([client.email].filter(Boolean)));

  await sendEmail({
    from: defaultFrom,
    to: toRecipients,
    subject,
    html,
    attachments,
  });

  if (user?.email && user.email !== client.email) {
    await sendEmail({
      from: defaultFrom,
      to: [user.email],
      subject: `Copy: ${label} "${proposal.title}" sent to ${client.companyName || client.contactName || 'client'}`,
      html: `<div style="font-family:system-ui,sans-serif; max-width:640px; margin:0 auto; padding:24px;">
        <p style="margin-bottom:12px;">${label} "${proposal.title}" was sent to ${client.companyName || client.contactName || 'client'}.</p>
        <p style="margin-bottom:12px;">Link: <a href="${proposalUrl}" style="color:#4f46e5;">View ${lower}</a></p>
      </div>`,
      attachments,
    });
  }
}

export async function sendProposalSentNotification(proposal: any, client: any, user: any) {
  if (!client?.email) return;
  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app'}/p/${proposal.id}/view`;
  const companyName = user?.company?.name || user?.companyName || 'Your Company';
  const label = formatDocumentLabel(proposal.type);
  const lower = formatDocumentLower(proposal.type);
  await sendEmail({
    from: defaultFrom,
    to: [client.email],
    subject: `${label} sent from ${companyName}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#111; margin-bottom:12px;">${label} sent</h1>
        <p style="margin-bottom:12px; color:#444;">${companyName} just sent you a ${lower} titled <strong>${proposal.title}</strong>.</p>
        <a
          href="${proposalUrl}"
          style="display:inline-block; margin-bottom:16px; padding:12px 24px; background:${resolveEmailButtonColor(
            user?.company?.primaryColor ?? null
          )}; color:white; text-decoration:none; border-radius:8px; font-weight:600;"
        >View ${lower}</a>
        <p style="margin:0; color:#1f2937;">Total: <strong>${new Intl.NumberFormat('en-US', { style: 'currency', currency: proposal.currency || 'USD' }).format(Number(proposal.total) || 0)}</strong></p>
        ${proposal.pdfUrl ? `<p style="margin:12px 0 0 0; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:14px;">
          <strong>Official PDF:</strong> <a href="${proposal.pdfUrl}" style="color:#4f46e5; text-decoration:underline;">Download permanent copy</a>
        </p>` : ''}
      </div>
    `,
  });
}

export async function sendProposalViewedNotification(proposal: any, user: any) {
  if (!user?.email) return;
  const label = formatDocumentLabel(proposal.type);
  const lower = formatDocumentLower(proposal.type);
  await sendEmail({
    from: defaultFrom,
    to: [user.email],
    subject: `${label} viewed: ${proposal.title}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#111; margin-bottom:12px;">${label} viewed</h1>
        <p style="margin-bottom:12px; color:#444;">Your ${lower} "${proposal.title}" was opened by ${proposal.client?.companyName || proposal.client?.contactName || 'a client'}.</p>
        <p style="margin:0; color:#1f2937;">Status: ${proposal.status}</p>
      </div>
    `,
  });
}

export async function sendProposalSignedNotification(proposal: any, client: any, user: any) {
  const recipients = Array.from(new Set([client?.email, user?.email].filter(Boolean) as string[]));
  if (!recipients.length) return;
  const label = formatDocumentLabel(proposal.type);
  const lower = formatDocumentLower(proposal.type);
  await sendEmail({
    from: defaultFrom,
    to: recipients,
    subject: `${label} signed: ${proposal.title}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#111; margin-bottom:12px;">${label} signed</h1>
        <p style="margin-bottom:12px; color:#444;">${proposal.client?.companyName || proposal.client?.contactName || 'A client'} signed the ${lower}.</p>
        <p style="margin:0; color:#1f2937;">Total: <strong>${new Intl.NumberFormat('en-US', { style: 'currency', currency: proposal.currency || 'USD' }).format(Number(proposal.total) || 0)}</strong></p>
        ${proposal.pdfUrl ? `<p style="margin:12px 0 0 0; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:14px;">
          <strong>Official PDF:</strong> <a href="${proposal.pdfUrl}" style="color:#4f46e5; text-decoration:underline;">Download permanent copy</a>
        </p>` : ''}
      </div>
    `,
  });
}

export async function sendProposalCompletedNotification(proposal: any, client: any, user: any) {
  if (!client?.email) return;
  const label = formatDocumentLabel(proposal.type);
  const lower = formatDocumentLower(proposal.type);
  await sendEmail({
    from: defaultFrom,
    to: [client.email],
    subject: `${label} completed: ${proposal.title}`,
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
        <h1 style="color:#111; margin-bottom:12px;">${label} completed</h1>
        <p style="margin-bottom:12px; color:#444;">Your ${lower} "${proposal.title}" has been marked complete.</p>
        <p style="margin:0; color:#1f2937;">An invoice is on the way to finalize payment.</p>
      </div>
    `,
  });
}

export async function sendContractSignedEmail(invoice: any, client: any, user: any) {
  if (!user?.email) return;
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const formatCurrency = (n: any) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0));
  const totalFormatted = formatCurrency(invoice?.total ?? 0);
  const clientName = client?.companyName || client?.contactName || 'client';
  const subject = `Contract signed – ${totalFormatted} from ${clientName}`;
  const adminInvoiceEmail = process.env.INVOICE_ADMIN_EMAIL || 'petere2103@gmail.com';
  const recipients = Array.from(
    new Set(
      [user.email, adminInvoiceEmail]
        .filter(Boolean)
        .map((value) => value!.trim())
    )
  );
  const html = `
    <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px; text-align:left;">
      <h1 style="color:#111; margin-bottom:12px;">Contract signed</h1>
      <p style="color:#444; margin-bottom:12px;">
        ${clientName} signed the contract for ${totalFormatted}.
      </p>
      <p style="margin-bottom:12px;">
        View the signed document: <a href="${appBase}/dashboard/invoices/${invoice.id}" style="color:#4f46e5;">Dashboard invoice</a>
      </p>
      ${invoice.pdfUrl ? `<p style="margin:12px 0 12px 0; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; font-size:14px;">
        <strong>Official PDF:</strong> <a href="${invoice.pdfUrl}" style="color:#4f46e5; text-decoration:underline;">Download permanent copy</a>
      </p>` : ''}
      <p style="margin-top:24px; font-size:12px; color:#777;">Signed contracts are tracked inside ClientWave.</p>
    </div>
  `;
  await sendEmail({
    from: defaultFrom,
    to: recipients,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const resetUrl = new URL('/reset-password', appBase);
  resetUrl.searchParams.set('token', token);

  await sendEmail({
    from: defaultFrom,
    to: [email],
    subject: 'Reset your ClientWave password',
    html: `
      <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:20px;">
        <h1 style="margin-bottom:16px;color:#1a1a1a;">Password reset requested</h1>
        <p style="margin-bottom:16px;color:#444;">Click the button below to set a new password for your ClientWave account. This link expires in one hour.</p>
        <p>
          <a
            href="${resetUrl.toString()}"
            style="background:${resolveEmailButtonColor()};color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;"
          >Reset password</a>
        </p>
        <p style="margin-top:20px;color:#777;">If you didn’t request this change, just ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTrialReminderEmail(email: string) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  await sendEmail({
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

  await sendEmail({
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
  await sendEmail({
    from: defaultFrom,
    to: [adminAlertEmail],
    subject,
    html,
  });
}

export async function sendAdminNotificationEmail({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  await sendEmail({
    from: defaultFrom,
    to: [adminAlertEmail],
    subject,
    html,
  });
}
