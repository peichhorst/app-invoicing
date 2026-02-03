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
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 15,
    borderBottom: '1px solid #E2E8F0',
  },
  companyInfo: {
    width: '50%',
  },
  proposalInfo: {
    width: '40%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
    color: '#2C5282',
    fontFamily: 'Roboto',
  },
  companyLogo: {
    height: 80,
    width: 80,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2D3748',
  },
  text: {
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #E2E8F0',
    color: '#2C5282',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  itemDescription: {
    flex: 3,
    fontSize: 10,
    paddingRight: 10,
  },
  itemAmount: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 10,
    borderTop: '1px solid #E2E8F0',
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalsValue: {
    fontSize: 11,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#718096',
    borderTop: '1px solid #E2E8F0',
    paddingTop: 10,
  },
  signatureArea: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '40%',
    paddingTop: 20,
    borderTop: '1px solid #000',
  },
});

interface ProposalTemplateProps {
  proposal: {
    id: string;
    title: string;
    description?: string;
    scope?: string;
    validUntil?: Date | string | null;
    notes?: string;
    total: number;
    status: string;
    type: 'PROPOSAL' | 'CONTRACT';
    currency?: string;
    createdAt: Date | string;
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
    description: string;
    amount: number;
    quantity?: number;
    unit?: string;
  }>;
}

export const ProposalTemplate: React.FC<ProposalTemplateProps> = ({ proposal, client, user, items }) => (
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
        
        <View style={styles.proposalInfo}>
          <Text style={styles.title}>{proposal.type === 'CONTRACT' ? 'CONTRACT' : 'PROPOSAL'}</Text>
          <Text style={styles.text}>{proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal'} #: {proposal.id.substring(0, 8).toUpperCase()}</Text>
          <Text style={styles.text}>Date: {formatDate(proposal.createdAt)}</Text>
          {proposal.validUntil && <Text style={styles.text}>Valid Until: {formatDate(proposal.validUntil)}</Text>}
          <Text style={styles.text}>Status: {proposal.status}</Text>
        </View>
      </View>

      {/* Client Info */}
      <View style={{ flexDirection: 'row', marginBottom: 30 }}>
        <View style={{ width: '50%' }}>
          <Text style={styles.heading}>Prepared For:</Text>
          <Text style={styles.text}>{client.contactName || client.companyName || 'Client Name'}</Text>
          {client.email && <Text style={styles.text}>{client.email}</Text>}
          {client.phone && <Text style={styles.text}>{client.phone}</Text>}
          {client.address && <Text style={styles.text}>{client.address}</Text>}
          {client.city && <Text style={styles.text}>{client.city}, {client.state} {client.zip}</Text>}
          {client.country && <Text style={styles.text}>{client.country}</Text>}
        </View>
      </View>

      {/* Title and Description */}
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionHeading}>{proposal.title}</Text>
        {proposal.description && <Text style={styles.text}>{proposal.description}</Text>}
      </View>

      {/* Scope */}
      {proposal.scope && (
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionHeading}>Scope of Work</Text>
          <Text style={styles.text}>{proposal.scope}</Text>
        </View>
      )}

      {/* Items/Services */}
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionHeading}>Services & Pricing</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemDescription}>{item.description}</Text>
            <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsTable}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total:</Text>
            <Text style={styles.totalsValue}>{formatCurrency(proposal.total, proposal.currency)}</Text>
          </View>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={{ marginTop: 30 }}>
        <Text style={styles.sectionHeading}>Terms & Conditions</Text>
        <Text style={styles.text}>• This {proposal.type.toLowerCase()} is valid until {formatDate(proposal.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</Text>
        <Text style={styles.text}>• Payment terms: Net 30 days unless otherwise specified</Text>
        <Text style={styles.text}>• All work is subject to the terms and conditions outlined in our standard agreement</Text>
      </View>

      {/* Notes */}
      {proposal.notes && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionHeading}>Additional Notes</Text>
          <Text style={styles.text}>{proposal.notes}</Text>
        </View>
      )}

      {/* Signature Area */}
      <View style={styles.signatureArea}>
        <View style={styles.signatureBox}>
          <Text style={styles.text}>Client Signature</Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>_______________________________________</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.text}>Authorized Signature</Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>_______________________________________</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal'} #{proposal.id.substring(0, 8).toUpperCase()} • Generated on{' '}
        {new Date().toLocaleDateString()} • {proposal.pdfUrl || 'PDF URL'}
      </Text>
    </Page>
  </Document>
);

export default ProposalTemplate;