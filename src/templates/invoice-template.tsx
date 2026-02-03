import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/utils/formatters';

// Register fonts
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#E4E4E4',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyInfo: {
    width: '50%',
  },
  invoiceInfo: {
    width: '40%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  companyLogo: {
    height: 60,
    width: 60,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4A5568',
  },
  text: {
    fontSize: 10,
    marginBottom: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4A5568',
    color: 'white',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E0',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    padding: 5,
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 10,
    padding: 5,
    textAlign: 'center',
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    padding: 5,
    textAlign: 'right',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsTable: {
    width: '40%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalsValue: {
    fontSize: 10,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#718096',
  },
});

interface InvoiceTemplateProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    title?: string;
    issueDate: Date | string;
    dueDate?: Date | string | null;
    notes?: string;
    subTotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    status: string;
    sentCount?: number;
    pdfUrl?: string;
  };
  client: {
    id: string;
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  user: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    company: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      logoUrl?: string;
    };
  };
  items: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, client, user, items }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          {user.company.logoUrl && (
            <Image style={styles.companyLogo} src={user.company.logoUrl} />
          )}
          <Text style={styles.heading}>{user.company.name || 'Company Name'}</Text>
          {user.company.address && <Text style={styles.text}>{user.company.address}</Text>}
          {user.company.city && <Text style={styles.text}>{user.company.city}, {user.company.state} {user.company.zip}</Text>}
          {user.company.country && <Text style={styles.text}>{user.company.country}</Text>}
          {user.phone && <Text style={styles.text}>Phone: {user.phone}</Text>}
          {user.email && <Text style={styles.text}>Email: {user.email}</Text>}
        </View>
        
        <View style={styles.invoiceInfo}>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.text}>Invoice #: {invoice.invoiceNumber}</Text>
          <Text style={styles.text}>Issue Date: {formatDate(invoice.issueDate)}</Text>
          {invoice.dueDate && <Text style={styles.text}>Due Date: {formatDate(invoice.dueDate)}</Text>}
          <Text style={styles.text}>Status: {invoice.status}</Text>
        </View>
      </View>

      {/* Client Info */}
      <View style={{ flexDirection: 'row', marginBottom: 30 }}>
        <View style={{ width: '50%' }}>
          <Text style={styles.heading}>Bill To:</Text>
          <Text style={styles.text}>{client.contactName || client.companyName || 'Client Name'}</Text>
          {client.email && <Text style={styles.text}>{client.email}</Text>}
          {client.phone && <Text style={styles.text}>{client.phone}</Text>}
          {client.address && <Text style={styles.text}>{client.address}</Text>}
          {client.city && <Text style={styles.text}>{client.city}, {client.state} {client.zip}</Text>}
          {client.country && <Text style={styles.text}>{client.country}</Text>}
        </View>
      </View>

      {/* Items Table */}
      <View style={{ marginBottom: 20 }}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
          <Text style={styles.tableCellCenter}>Quantity</Text>
          <Text style={styles.tableCellCenter}>Unit Price</Text>
          <Text style={styles.tableCellRight}>Total</Text>
        </View>
        
        {items.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.tableCell}>{item.name}</Text>
              {item.description && <Text style={[styles.tableCell, { fontSize: 8 }]}>{item.description}</Text>}
            </View>
            <Text style={styles.tableCellCenter}>{item.quantity}</Text>
            <Text style={styles.tableCellCenter}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={styles.tableCellRight}>{formatCurrency(item.total)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsTable}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.subTotal)}</Text>
          </View>
          {invoice.taxAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({invoice.taxRate}%):</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      {invoice.notes && (
        <View style={{ marginTop: 30 }}>
          <Text style={styles.heading}>Notes:</Text>
          <Text style={styles.text}>{invoice.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business! This invoice was generated on{' '}
        {new Date().toLocaleDateString()} and is available at {invoice.pdfUrl || 'PDF URL'}
      </Text>
    </Page>
  </Document>
);

export default InvoiceTemplate;