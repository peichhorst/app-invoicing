// src/components/InvoicePDF.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font, Link } from '@react-pdf/renderer';
import {
  formatPhoneForDisplay,
  getRecurringPaymentTerms,
  getNoPaymentMethodsMessage,
  resolveInvoiceCompanyPreview,
  resolveInvoicePaymentMethods,
} from '@/lib/invoice-presentation';
import { getStripeFeeConfig, getStripeFeeConfigForMethod } from '@/lib/payments/stripe-fees';
import { resolveAppBaseUrl } from '@/lib/app-url';

Font.registerHyphenationCallback((word) => [word]);

const DEFAULT_BRAND = '#2563eb';
const PRIMARY_COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#1d4ed8',
  green: '#22c55e',
  red: '#ef4444',
};

const resolveBrandColor = (value?: string | null) => {
  if (!value) return DEFAULT_BRAND;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return DEFAULT_BRAND;
  return PRIMARY_COLOR_MAP[normalized] || value;
};

const formatBpsPercent = (bps: number) => {
  const normalized = Math.max(0, Math.round(bps));
  const value = (normalized / 100).toFixed(2).replace(/\.?0+$/, '');
  return `${value}%`;
};

const formatUsdCents = (cents: number) => `$${(Math.max(0, Math.round(cents)) / 100).toFixed(2)}`;
const resolveOnBrandTextColor = (hex: string) => {
  const cleaned = hex.replace('#', '').trim();
  const normalized = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#ffffff';
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.55 ? '#0f172a' : '#ffffff';
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 26,
    fontSize: 11,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  companyCol: {
    width: '58%',
  },
  logoWrap: {
    marginBottom: 8,
    alignItems: 'flex-start',
    marginLeft: 0,
    paddingLeft: 0,
  },
  logo: {
    width: 180,
    height: 56,
    objectFit: 'contain',
    objectPosition: 'left center',
    alignSelf: 'flex-start',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  companyLine: {
    fontSize: 11,
    color: '#4b5563',
    marginBottom: 2,
  },
  docCol: {
    width: '38%',
    alignItems: 'flex-end',
  },
  docTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 30,
    fontWeight: 700,
    color: DEFAULT_BRAND,
  },
  paidBadge: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#15803d',
  },
  docNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },
  metaValue: {
    fontSize: 11,
    color: '#6b7280',
  },
  billCard: {
    border: '1 solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    padding: 10,
    marginBottom: 18,
  },
  billLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  billPrimary: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 2,
  },
  billLine: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 2,
  },
  tableWrap: {
    border: '1 solid #e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headCell: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#4b5563',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    borderBottom: '0 solid transparent',
  },
  tableCell: {
    fontSize: 11,
    color: '#111827',
  },
  tableCellMuted: {
    fontSize: 11,
    color: '#374151',
  },
  tableCellStrong: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
  },
  right: {
    textAlign: 'right',
  },
  totalsWrap: {
    alignSelf: 'flex-end',
    width: 250,
    marginBottom: 16,
  },
  totalsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 6,
    marginBottom: 10,
  },
  totalsLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: '#4b5563',
  },
  totalsValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '2 solid #d1d5db',
    paddingTop: 8,
  },
  totalFinalLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  totalFinalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: DEFAULT_BRAND,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 11,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  paymentWrap: {
    border: '1 solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 10,
    marginTop: 2,
  },
  payLinkRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    textDecoration: 'none',
  },
  ctaButtonText: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#ffffff',
    textDecoration: 'none',
  },
  payHint: {
    marginTop: 4,
    fontSize: 9,
    color: '#6b7280',
  },
  feeHint: {
    marginTop: 6,
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.35,
  },
  paymentGrid: {
    flexDirection: 'row',
    marginTop: 4,
  },
  paymentCard: {
    flex: 1,
    border: '1 solid #e5e7eb',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    padding: 8,
    minHeight: 74,
  },
  paymentMiddleCard: {
    marginHorizontal: 8,
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#3f3f46',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.35,
  },
  paymentMuted: {
    fontSize: 11,
    color: '#6b7280',
  },
  qr: {
    width: 52,
    height: 52,
    marginTop: 4,
  },
  footer: {
    borderTop: '1 solid #e5e7eb',
    paddingTop: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 11,
    fontWeight: 500,
    color: '#6b7280',
  },
  poweredBy: {
    marginTop: 2,
    fontSize: 9,
    color: '#9ca3af',
  },
});

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type InvoicePDFProps = {
  invoice: any;
  client: any;
  user?: any;
  portalLink?: string | null;
};

const formatLongDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const InvoicePDF = ({ invoice, client, user, portalLink }: InvoicePDFProps) => {
  const brandColor = resolveBrandColor(user?.company?.primaryColor ?? null);
  const onBrandColor = resolveOnBrandTextColor(brandColor);
  const logoCandidate = user?.company?.logoUrl ?? user?.logoDataUrl;
  const hasValidLogo = (() => {
    if (!logoCandidate) return false;
    try {
      const url = new URL(logoCandidate);
      return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:';
    } catch {
      return false;
    }
  })();

  const totals = invoice.items.reduce(
    (acc: any, item: any) => {
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const lineSubtotal = qty * unitPrice;
      acc.subtotal += lineSubtotal;
      acc.total += lineSubtotal;
      return acc;
    },
    { subtotal: 0, total: 0 }
  );

  const issuedOn = formatLongDate(invoice.issueDate);
  const dueOn = formatLongDate(invoice.dueDate);
  const paidOn = invoice.status === 'PAID' ? formatLongDate(invoice.updatedAt) : null;
  const isPaid = invoice.status === 'PAID';

  const companyForPreview = resolveInvoiceCompanyPreview(user);
  const paymentMethods = resolveInvoicePaymentMethods(user, { invoiceId: invoice.id, qrSize: 160 });

  const fromLines = [
    ...(companyForPreview?.address ? companyForPreview.address.split('\n') : []),
    companyForPreview?.email,
    companyForPreview?.phone,
    user?.website,
  ].filter(Boolean);

  const billLines = [
    client?.companyName,
    client?.contactName,
    client?.email,
    formatPhoneForDisplay(client?.phone),
  ].filter(Boolean);

  const checkToLines = (paymentMethods.checkToLines ?? []).filter((line) => line.trim().length > 0);
  const showMailBlock = Boolean(paymentMethods.checkEnabled) && checkToLines.length > 0;
  const showVenmoCard = Boolean(paymentMethods.venmoHandle?.trim());
  const showZelleCard = Boolean(paymentMethods.zelleHandle?.trim());
  const showCheckCard = Boolean(showMailBlock);
  const hasAnyPaymentMethod =
    paymentMethods.payOnlineEnabled ||
    showCheckCard ||
    showZelleCard ||
    showVenmoCard;

  const noMethodsMessage = getNoPaymentMethodsMessage(
    paymentMethods.contactPhone,
    paymentMethods.contactEmail
  );
  const recurringPaymentTerms = getRecurringPaymentTerms({
    recurring: Boolean(invoice.recurring),
    recurringInterval: invoice.recurringInterval,
    recurringDayOfMonth: invoice.recurringDayOfMonth,
    recurringDayOfWeek: invoice.recurringDayOfWeek,
  });
  const showPaymentPage = !invoice.status || invoice.status !== 'PAID';
  const cardFeeConfig = getStripeFeeConfig();
  const achFeeConfig = getStripeFeeConfigForMethod('us_bank_account');
  const processingFeeMessage = paymentMethods.applyStripeFee
    ? `Online processing fees apply:\nCredit Card: ${formatBpsPercent(cardFeeConfig.rateBps)}${
        cardFeeConfig.fixedCents > 0 ? ` + ${formatUsdCents(cardFeeConfig.fixedCents)}` : ''
      }\nBank Transfer (ACH): ${formatBpsPercent(achFeeConfig.rateBps)}${
        achFeeConfig.fixedCents > 0 ? ` + ${formatUsdCents(achFeeConfig.fixedCents)}` : ''
      }${typeof achFeeConfig.maxCents === 'number' ? ` (max ${formatUsdCents(achFeeConfig.maxCents)})` : ''}`
    : null;
  const portalToken = client?.portalUser?.portalToken ?? invoice?.client?.portalUser?.portalToken ?? null;
  const resolvedPortalLink =
    portalLink ||
    (portalToken ? `${resolveAppBaseUrl()}/client/${encodeURIComponent(portalToken)}` : null);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.companyCol}>
            {hasValidLogo && (
              <View style={styles.logoWrap}>
                <Image src={logoCandidate as string} style={styles.logo} />
              </View>
            )}
            <Text style={styles.companyName}>{companyForPreview?.name || 'Your Company'}</Text>
            {fromLines.map((line: string, idx: number) => (
              <Text key={`${line}-${idx}`} style={styles.companyLine}>
                {line}
              </Text>
            ))}
          </View>

          <View style={styles.docCol}>
            <View style={styles.docTitleRow}>
              <Text style={[styles.docTitle, { color: brandColor }]}>Invoice</Text>
              {isPaid ? (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>Paid</Text>
                </View>
              ) : null}
            </View>
            {invoice.invoiceNumber ? <Text style={styles.docNumber}>#{invoice.invoiceNumber}</Text> : null}
            {issuedOn && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date: </Text>
                <Text style={styles.metaValue}>{issuedOn}</Text>
              </View>
            )}
            {paidOn ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Paid on: </Text>
                <Text style={styles.metaValue}>{paidOn}</Text>
              </View>
            ) : dueOn ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due: </Text>
                <Text style={styles.metaValue}>{dueOn}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {!!billLines.length && (
          <View style={styles.billCard}>
            <Text style={styles.billLabel}>Bill To</Text>
            <Text style={styles.billPrimary}>{billLines[0]}</Text>
            {billLines.slice(1).map((line: string, idx: number) => (
              <Text key={`${line}-${idx}`} style={styles.billLine}>
                {line}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.tableWrap}>
          <View style={styles.tableHead}>
            <Text style={[styles.headCell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.headCell, styles.right, { flex: 1 }]}>Qty</Text>
            <Text style={[styles.headCell, styles.right, { flex: 1 }]}>Rate</Text>
            <Text style={[styles.headCell, styles.right, { flex: 1 }]}>Amount</Text>
          </View>
          {invoice.items.map((item: any, i: number) => {
            const qty = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const lineTotal = qty * unitPrice;
            const isLast = i === invoice.items.length - 1;
            return (
              <View key={i} style={isLast ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{item.description || item.name || ''}</Text>
                <Text style={[styles.tableCellMuted, styles.right, { flex: 1 }]}>{qty}</Text>
                <Text style={[styles.tableCellMuted, styles.right, { flex: 1 }]}>{currency.format(unitPrice)}</Text>
                <Text style={[styles.tableCellStrong, styles.right, { flex: 1 }]}>{currency.format(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsLine}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{currency.format(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={[styles.totalFinalValue, { color: brandColor }]}>{currency.format(totals.total)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {recurringPaymentTerms ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Terms</Text>
            <Text style={styles.sectionText}>{recurringPaymentTerms}</Text>
          </View>
        ) : null}

        {!showPaymentPage ? (
          <View style={styles.footer}>
            <Text style={styles.thankYou}>Thank you for your business!</Text>
            {String(user?.planTier || '').toUpperCase() === 'FREE' ? (
              <Text style={styles.poweredBy}>Powered by ClientWave</Text>
            ) : null}
          </View>
        ) : null}
      </Page>
      {showPaymentPage ? (
        <Page size="A4" style={styles.page}>
          <View style={[styles.section, styles.paymentWrap]}>
            <Text style={styles.sectionLabel}>Payment Methods</Text>
            {(showVenmoCard || showZelleCard || showCheckCard) && (
              <View style={styles.paymentGrid}>
                {showVenmoCard && (
                  <View style={styles.paymentCard}>
                    <Text style={styles.paymentTitle}>Venmo</Text>
                    <Text style={styles.paymentValue}>{paymentMethods.venmoHandle}</Text>
                    {paymentMethods.venmoQrUrl ? (
                      <Image src={paymentMethods.venmoQrUrl} style={styles.qr} />
                    ) : null}
                  </View>
                )}

                {showZelleCard && (
                  <View
                    style={
                      showVenmoCard && showCheckCard
                        ? [styles.paymentCard, styles.paymentMiddleCard]
                        : showVenmoCard || showCheckCard
                        ? [styles.paymentCard, { marginLeft: 8 }]
                        : styles.paymentCard
                    }
                  >
                    <Text style={styles.paymentTitle}>Zelle</Text>
                    <Text style={styles.paymentValue}>{paymentMethods.zelleHandle}</Text>
                  </View>
                )}

                {showCheckCard && (
                  <View
                    style={
                      showVenmoCard || showZelleCard
                        ? [styles.paymentCard, { marginLeft: 8 }]
                        : styles.paymentCard
                    }
                  >
                    <Text style={styles.paymentTitle}>Check</Text>
                    {checkToLines.map((line: string, idx: number) => (
                      <Text key={`${line}-${idx}`} style={styles.paymentValue}>
                        {line}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {paymentMethods.payOnlineEnabled && (
              <View style={styles.payLinkRow}>
                {paymentMethods.payLink ? (
                  <Link style={[styles.ctaButton, { backgroundColor: brandColor }]} src={paymentMethods.payLink}>
                    <Text style={[styles.ctaButtonText, { color: onBrandColor }]}>Click Here to Pay Invoice Online</Text>
                  </Link>
                ) : (
                  <View style={[styles.ctaButton, { backgroundColor: brandColor }]}>
                    <Text style={[styles.ctaButtonText, { color: onBrandColor }]}>Click Here to Pay Invoice Online</Text>
                  </View>
                )}
                {!paymentMethods.payLink ? (
                  <Text style={styles.payHint}>Payment link will be generated when sent.</Text>
                ) : null}
                {processingFeeMessage ? <Text style={styles.feeHint}>{processingFeeMessage}</Text> : null}
              </View>
            )}
            {resolvedPortalLink ? (
              <View style={styles.payLinkRow}>
                <Link style={[styles.ctaButton, { backgroundColor: brandColor }]} src={resolvedPortalLink}>
                  <Text style={[styles.ctaButtonText, { color: onBrandColor }]}>View Public Portal</Text>
                </Link>
              </View>
            ) : null}

            {!hasAnyPaymentMethod && <Text style={[styles.sectionText, { marginTop: 8 }]}>{noMethodsMessage}</Text>}
          </View>
          <View style={styles.footer}>
            <Text style={styles.thankYou}>Thank you for your business!</Text>
            {String(user?.planTier || '').toUpperCase() === 'FREE' ? (
              <Text style={styles.poweredBy}>Powered by ClientWave</Text>
            ) : null}
          </View>
        </Page>
      ) : null}
    </Document>
  );
};
