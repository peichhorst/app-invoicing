export type InvoicePreviewCompany = {
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  phone?: string;
};

export type InvoicePaymentMethods = {
  payOnlineEnabled: boolean;
  payLink: string;
  applyStripeFee: boolean;
  checkEnabled: boolean;
  checkToLines: string[];
  zelleHandle: string;
  venmoHandle: string;
  venmoQrUrl: string;
  contactEmail: string;
  contactPhone: string;
};

export function formatPhoneForDisplay(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return trimmed;
}

export function resolveInvoiceCompanyPreview(user: any): InvoicePreviewCompany | undefined {
  if (!user) return undefined;
  const company = user.company ?? {};
  return {
    name: company.name || user.companyName || user.name || 'Your Company',
    logoUrl: company.logoUrl || undefined,
    address:
      [
        company.addressLine1,
        company.addressLine2,
        [company.city, company.state, company.postalCode].filter(Boolean).join(', '),
        company.country,
      ]
        .filter(Boolean)
        .join('\n') || undefined,
    email: company.email || user.email || undefined,
    phone: formatPhoneForDisplay(company.phone || user.phone) || undefined,
  };
}

export function resolveInvoicePaymentMethods(
  user: any,
  options: { invoiceId?: string; qrSize?: number; appBase?: string } = {}
): InvoicePaymentMethods {
  const company = user?.company ?? {};
  const stripeAccountId = company.stripeAccountId ?? '';
  const stripePublishableKey = company.stripePublishableKey ?? '';
  const payOnlineEnabled = Boolean(stripeAccountId && stripePublishableKey);
  const appBase = options.appBase ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app';
  const applyStripeFee = (company.stripeFeeResponsibility ?? 'business_absorbs') === 'client_pays';
  const payParams = new URLSearchParams();
  if (user?.id) payParams.set('seller', String(user.id));
  if (options.invoiceId) payParams.set('invoice', options.invoiceId);
  if (applyStripeFee) payParams.set('applyStripeFee', '1');
  const payQuery = payParams.toString();
  const payLink = payQuery ? `${appBase}/payment?${payQuery}` : `${appBase}/payment`;

  const mailToAddressEnabled = Boolean(company.mailToAddressEnabled ?? user?.mailToAddressEnabled ?? false);
  const mailToTargetText = (company.mailToAddressTo ?? user?.mailToAddressTo ?? '').trim();
  const mailRecipientName = mailToTargetText || company.name || user?.companyName || user?.name || 'Your Company';
  const checkToLines = [
    mailRecipientName,
    company.addressLine1,
    company.addressLine2,
    [company.city, company.state, company.postalCode].filter(Boolean).join(', '),
    company.country || 'USA',
  ].filter(Boolean) as string[];

  const zelleHandle = (company.zelleHandle ?? user?.zelleHandle ?? '').trim();
  const venmoHandle = (company.venmoHandle ?? user?.venmoHandle ?? '').trim();
  const venmoLink = venmoHandle ? `https://venmo.com/${venmoHandle.replace(/^@/, '')}` : '';
  const qrSize = options.qrSize ?? 150;
  const venmoQrUrl = venmoLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(venmoLink)}`
    : '';

  const contactEmail = (company.email ?? user?.email ?? '').trim();
  const contactPhone = formatPhoneForDisplay(company.phone ?? user?.phone ?? '');

  return {
    payOnlineEnabled,
    payLink,
    applyStripeFee,
    checkEnabled: mailToAddressEnabled,
    checkToLines,
    zelleHandle,
    venmoHandle,
    venmoQrUrl,
    contactEmail,
    contactPhone,
  };
}

export function getNoPaymentMethodsMessage(contactPhone?: string, contactEmail?: string) {
  if (contactPhone && contactEmail) {
    return `No payment methods are set on this invoice. Please call ${contactPhone} or email ${contactEmail} to arrange payment.`;
  }
  if (contactPhone) {
    return `No payment methods are set on this invoice. Please call ${contactPhone} to arrange payment.`;
  }
  if (contactEmail) {
    return `No payment methods are set on this invoice. Please email ${contactEmail} to arrange payment.`;
  }
  return 'No payment methods are set on this invoice. Please call or email to arrange payment.';
}

type RecurringTermsInput = {
  recurring?: boolean | null;
  recurringInterval?: 'day' | 'week' | 'month' | 'quarter' | 'year' | string | null;
  recurringDayOfMonth?: number | null;
  recurringDayOfWeek?: number | null;
};

export function getRecurringPaymentTerms(input: RecurringTermsInput): string | undefined {
  if (!input.recurring) return undefined;
  const interval = (input.recurringInterval ?? 'month').toString().toLowerCase();
  const dayOfMonth = Number(input.recurringDayOfMonth ?? 0);
  const dayOfWeek = Number(input.recurringDayOfWeek ?? 0);

  if (interval === 'month') {
    return dayOfMonth > 0
      ? `Monthly payment terms: this invoice recurs every month on day ${dayOfMonth}.`
      : 'Monthly payment terms: this invoice recurs every month.';
  }
  if (interval === 'week') {
    const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOfWeek - 1];
    return weekday
      ? `Weekly payment terms: this invoice recurs every ${weekday}.`
      : 'Weekly payment terms: this invoice recurs every week.';
  }
  if (interval === 'quarter') {
    return dayOfMonth > 0
      ? `Quarterly payment terms: this invoice recurs every quarter on day ${dayOfMonth}.`
      : 'Quarterly payment terms: this invoice recurs every quarter.';
  }
  if (interval === 'year') {
    return dayOfMonth > 0
      ? `Yearly payment terms: this invoice recurs annually on day ${dayOfMonth}.`
      : 'Yearly payment terms: this invoice recurs annually.';
  }
  if (interval === 'day') {
    return 'Daily payment terms: this invoice recurs every day.';
  }
  return 'Recurring payment terms apply to this invoice.';
}
