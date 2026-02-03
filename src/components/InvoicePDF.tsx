// src/components/InvoicePDF.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font, Link } from '@react-pdf/renderer';

// Prevent react-pdf from auto-hyphenating long URLs (e.g., payment links).
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: '#111' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 700 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' },
  partiesRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  partyCard: { flex: 1, padding: 10, border: '1 solid #eee', borderRadius: 6 },
  row: { flexDirection: 'row', borderBottom: '1 solid #eee', paddingVertical: 6 },
  cell: { fontSize: 11 },
  cellRight: { textAlign: 'right' },
  totals: { marginTop: 12, alignItems: 'flex-end', gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 220, fontSize: 12 },
  notes: { fontSize: 11, color: '#444', lineHeight: 1.4 },
  footer: { marginTop: 20, fontSize: 10, color: '#666', textAlign: 'center' },
});

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type InvoicePDFProps = {
  invoice: any;
  client: any;
  user?: any;
};

export const InvoicePDF = ({ invoice, client, user }: InvoicePDFProps) => {
  const signedOn =
    (invoice.status === 'SIGNED' || invoice.status === 'COMPLETED') && invoice.updatedAt
      ? new Date(invoice.updatedAt).toLocaleDateString()
      : null;
  const watermarkText = signedOn
    ? `Legally binding contract – signed on ${signedOn}`
    : null;
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
      acc.total += lineSubtotal; // tax fixed at 0
      return acc;
    },
    { subtotal: 0, total: 0 }
  );

  const issuedOn = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '';
  const dueOn = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '';
  const isPaid = invoice.status === 'PAID';
  const paidOn = invoice.updatedAt ? new Date(invoice.updatedAt).toLocaleDateString() : null;

  const fromLines = [
    user?.company?.name ?? user?.companyName ?? 'Your Company',
    user?.email,
    user?.phone,
    [user?.company?.addressLine1, user?.company?.addressLine2].filter(Boolean).join(', '),
    [user?.company?.city, user?.company?.state, user?.company?.postalCode].filter(Boolean).join(', '),
    user?.company?.country ?? 'USA',
    user?.website,
  ].filter(Boolean);

  const mailToTargetText = user?.mailToAddressTo?.trim();
  const mailRecipientName = mailToTargetText || user?.company?.name || user?.companyName || user?.name;
  const mailToLines = [
    mailRecipientName,
    user?.company?.addressLine1,
    user?.company?.addressLine2,
    [user?.company?.city, user?.company?.state, user?.company?.postalCode].filter(Boolean).join(', '),
    user?.company?.country ?? 'USA',
  ].filter(Boolean);
  const showMailBlock = (user?.mailToAddressEnabled ?? false) && mailToLines.length > 0;
  const mailHeading = 'Mail & Issue Check to:';

  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const payLink = `${appBase}/payment?seller=${user?.id || ''}&invoice=${invoice.id}`;
  const venmoLink =
    user?.venmoHandle && typeof user.venmoHandle === 'string'
      ? `https://venmo.com/${user.venmoHandle.replace(/^@/, '')}`
      : null;
  const venmoQr =
    venmoLink != null
      ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(venmoLink)}`
      : null;
  const mailBlock =
    showMailBlock && (
      <View style={{ marginTop: 6 }}>
        <Text style={[styles.notes, { fontWeight: 600 }]}>{mailHeading}</Text>
        {mailToLines.map((line: string, idx: number) => (
          <Text key={idx} style={styles.notes}>
            {line}
          </Text>
        ))}
      </View>
    );

  const footerLines = [
    'Thank you for your business.',
    user?.planTier === 'FREE' ? 'Powered by ClientWave' : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarkText && (
          <View
            style={{
              position: 'absolute',
              top: '45%',
              left: 0,
              right: 0,
              alignItems: 'center',
              opacity: 0.12,
              transform: 'rotate(-30deg)',
            }}
          >
            <Text
              style={{
                fontSize: 26,
                letterSpacing: 2,
                fontWeight: 700,
                color: '#2563eb',
              }}
            >
              {watermarkText}
            </Text>
          </View>
        )}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>
              {isPaid ? 'Receipt for Invoice' : 'Invoice'} #{invoice.invoiceNumber} 
            </Text>
            <Text>Date Issued: {issuedOn || '—'}</Text>
            {isPaid && paidOn ? <Text>Paid on: {paidOn}</Text> : dueOn ? <Text>Due: {dueOn}</Text> : null}
          </View>
        <View style={{ minWidth: 90, alignItems: 'flex-end' }}>
          {hasValidLogo ? (
            <Image src={logoCandidate as string} style={{ width: 140, height: 80, objectFit: 'contain' }} />
          ) : logoCandidate ? (
            <Text style={{ color: '#b91c1c', fontSize: 9, textAlign: 'right' }}>
              Logo URL invalid. Update in settings.
            </Text>
          ) : (
            <Text style={{ color: '#777', fontSize: 9, textAlign: 'right' }}></Text>
          )}
        </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyCard}>
            <Text style={styles.sectionTitle}>From</Text>
            {fromLines.map((line: string, idx: number) => (
              <Text key={idx}>{line}</Text>
            ))}
          </View>
          <View style={styles.partyCard}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text>{client.companyName}</Text>
            {client.contactName && <Text>{client.contactName}</Text>}
            {client.email && <Text>{client.email}</Text>}
            {client.phone && <Text>{client.phone}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={[styles.row, { borderBottom: '1 solid #ddd', fontWeight: 'bold' }]}>
            <Text style={[styles.cell, { flex: 3 }]}>Description</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>Qty</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>Unit Price</Text>
            <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>Line Total</Text>
          </View>
          {invoice.items.map((item: any, i: number) => {
            const qty = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const lineTotal = qty * unitPrice;
            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.cell, { flex: 3 }]}>{item.description || item.name}</Text>
                <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>{qty}</Text>
                <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>{currency.format(unitPrice)}</Text>
                <Text style={[styles.cell, styles.cellRight, { flex: 1 }]}>{currency.format(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 'bold' }}>Total</Text>
            <Text style={{ fontWeight: 'bold' }}>{currency.format(totals.total)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        ) : null}

        {(!isPaid && (user?.venmoHandle || user?.zelleHandle || mailToLines.length > 0)) && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
              <Text style={[styles.notes, { marginBottom: 6 }]}>
                <Text style={{ fontWeight: 700 }}>Pay online:</Text>{' '}
                <Link style={{ color: '#4f46e5' }} src={payLink}>
                  {payLink}
                </Link>
              </Text>
            {mailBlock}
            {user?.zelleHandle && (
              <Text style={[styles.notes, { marginTop: 6 }]}>
                <Text style={{ fontWeight: 700 }}>Zelle:</Text> {user.zelleHandle}
              </Text>
            )}
            {user?.venmoHandle && (
              <Text style={[styles.notes, { marginTop: 4 }]}>
                <Text style={{ fontWeight: 700 }}>Venmo:</Text> {user.venmoHandle}
              </Text>
            )}
            {venmoQr && (
              <View style={{ marginTop: 6, alignItems: 'flex-start' }}>
                <Text style={[styles.notes, { marginBottom: 4 }]}>Scan to pay with Venmo</Text>
                <Image src={venmoQr} style={{ width: 80, height: 80 }} />
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          {footerLines.map((line, idx) => (
            <Text key={idx}>{line}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
};
