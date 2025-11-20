import { NextResponse } from 'next/server';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: '#111' },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  tableHeader: { flexDirection: 'row', borderBottom: '1 solid #ddd', paddingBottom: 6, marginBottom: 6 },
  th: { flex: 1, fontSize: 10, fontWeight: 600, color: '#444' },
  thRight: { textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: '1 solid #f0f0f0' },
  td: { flex: 1, fontSize: 10, color: '#111' },
  tdRight: { textAlign: 'right' },
  totals: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, fontSize: 11 },
});

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const totals = invoice.items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const rate = Number(item.taxRate) || 0;
      const lineSubtotal = quantity * unitPrice;
      const lineTax = lineSubtotal * (rate / 100);

      acc.subtotal += lineSubtotal;
      acc.tax += lineTax;
      acc.total += lineSubtotal + lineTax;
      return acc;
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice #{invoice.invoiceNumber}</Text>
          <Text style={styles.subtitle}>
            Issued {new Date(invoice.issueDate).toLocaleDateString()} - Due{' '}
            {new Date(invoice.dueDate).toLocaleDateString()}
          </Text>
          <Text style={styles.subtitle}>Status: {invoice.status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{invoice.client.companyName}</Text>
          {invoice.client.contactName && <Text>{invoice.client.contactName}</Text>}
          {invoice.client.email && <Text>{invoice.client.email}</Text>}
          {invoice.client.phone && <Text>{invoice.client.phone}</Text>}
          {[
            invoice.client.addressLine1,
            invoice.client.addressLine2,
            invoice.client.city,
            invoice.client.state,
            invoice.client.postalCode,
            invoice.client.country,
          ]
            .filter(Boolean)
            .join(', ')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.th}>Description</Text>
            <Text style={[styles.th, styles.thRight]}>Qty</Text>
            <Text style={[styles.th, styles.thRight]}>Unit</Text>
            <Text style={[styles.th, styles.thRight]}>Tax %</Text>
            <Text style={[styles.th, styles.thRight]}>Total</Text>
          </View>
          {invoice.items.map((item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const rate = Number(item.taxRate) || 0;
            const lineSubtotal = quantity * unitPrice;
            const lineTax = lineSubtotal * (rate / 100);
            const lineTotal = lineSubtotal + lineTax;

            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.td}>{item.description || item.name}</Text>
                <Text style={[styles.td, styles.tdRight]}>{quantity}</Text>
                <Text style={[styles.td, styles.tdRight]}>{currency.format(unitPrice)}</Text>
                <Text style={[styles.td, styles.tdRight]}>{rate}%</Text>
                <Text style={[styles.td, styles.tdRight]}>{currency.format(lineTotal)}</Text>
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
            <Text>Tax</Text>
            <Text>{currency.format(totals.tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{currency.format(totals.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );

  const pdfBuffer = await renderToBuffer(doc);
  const body = new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
