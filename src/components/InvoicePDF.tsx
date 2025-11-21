// src/components/InvoicePDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' },
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
  const fromLines = [
    user?.companyName || 'Your Company',
    user?.email,
    user?.phone,
    [user?.addressLine1, user?.addressLine2].filter(Boolean).join(', '),
    [user?.city, user?.state, user?.postalCode].filter(Boolean).join(', '),
    user?.country,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice #{invoice.invoiceNumber}</Text>
            <Text>
              Issue: {issuedOn}
              {dueOn ? ` • Due: ${dueOn}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text>From</Text>
            {user?.logoDataUrl ? (
              <Image src={user.logoDataUrl} style={{ width: 80, height: 40, objectFit: 'contain', marginBottom: 6 }} />
            ) : null}
            {fromLines.map((line: string, idx: number) => (
              <Text key={idx}>{line}</Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{client.companyName}</Text>
          {client.contactName && <Text>{client.contactName}</Text>}
          {client.email && <Text>{client.email}</Text>}
          {client.phone && <Text>{client.phone}</Text>}
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
            <Text>Subtotal</Text>
            <Text>{currency.format(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax (0%)</Text>
            <Text>{currency.format(0)}</Text>
          </View>
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

        <Text style={styles.footer}>Thank you for your business.</Text>
      </Page>
    </Document>
  );
};
