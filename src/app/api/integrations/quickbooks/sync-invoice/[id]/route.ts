import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decryptToken, createQBClient, refreshQuickBooksToken, encryptToken, mapInvoiceStatus } from '@/lib/quickbooks';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Get company with QB credentials
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
    });

    if (!company?.quickbooksConnected) {
      return NextResponse.json(
        { error: 'QuickBooks not connected. Please connect in Settings.' },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Get the invoice with all details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        user: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!invoice.client) {
      return NextResponse.json({ error: 'Invoice has no associated client' }, { status: 400 });
    }

    // Check if client has QuickBooks ID, if not create customer first
    let qbCustomerId = invoice.client.quickbooksId;

    if (!qbCustomerId) {
      qbCustomerId = await createQBCustomer(company, invoice.client);
    }

    // Decrypt access token and check expiry
    let accessToken = decryptToken(company.quickbooksAccessToken!);
    
    // Refresh token if expired or about to expire (within 5 minutes)
    if (company.quickbooksTokenExpiry && new Date(company.quickbooksTokenExpiry) < new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshToken = decryptToken(company.quickbooksRefreshToken!);
      const newTokens = await refreshQuickBooksToken(refreshToken);
      
      // Update tokens in database
      await prisma.company.update({
        where: { id: company.id },
        data: {
          quickbooksAccessToken: encryptToken(newTokens.access_token),
          quickbooksRefreshToken: encryptToken(newTokens.refresh_token),
          quickbooksTokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000),
        },
      });
      
      accessToken = newTokens.access_token;
    }

    // Create QuickBooks client
    const qbo = createQBClient(accessToken, company.quickbooksRealmId!);

    // Build QuickBooks invoice object
    const qbInvoice: any = {
      Line: invoice.items.map((item, index) => ({
        DetailType: 'SalesItemLineDetail',
        Amount: item.total,
        Description: item.description || item.name,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.unitPrice,
          // You'll need to map to a QB Item - for now using a generic one
          ItemRef: {
            value: '1', // Default to first item in QB (you may need to create/fetch items)
            name: 'Services',
          },
        },
      })),
      CustomerRef: {
        value: qbCustomerId,
      },
      TxnDate: invoice.issueDate.toISOString().split('T')[0],
      DueDate: invoice.dueDate ? invoice.dueDate.toISOString().split('T')[0] : undefined,
      DocNumber: invoice.invoiceNumber,
      PrivateNote: invoice.notes || undefined,
      CustomerMemo: invoice.notes ? { value: invoice.notes } : undefined,
    };

    // If invoice already synced, update it, otherwise create new
    let qbResult;
    if (invoice.quickbooksId) {
      // Update existing invoice
      qbInvoice.Id = invoice.quickbooksId;
      qbInvoice.sparse = true;
      
      qbResult = await new Promise((resolve, reject) => {
        qbo.updateInvoice(qbInvoice, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } else {
      // Create new invoice
      qbResult = await new Promise((resolve, reject) => {
        qbo.createInvoice(qbInvoice, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    }

    // Update invoice with QuickBooks ID and sync status
    await prisma.invoice.update({
      where: { id },
      data: {
        quickbooksId: (qbResult as any).Id,
        quickbooksSyncedAt: new Date(),
        quickbooksSyncError: null,
      },
    });

    return NextResponse.json({
      success: true,
      quickbooksId: (qbResult as any).Id,
      message: 'Invoice synced to QuickBooks successfully',
    });
  } catch (error: any) {
    console.error('Error syncing invoice to QuickBooks:', error);
    
    // Save error to database
    const { id } = await params;
    await prisma.invoice.update({
      where: { id },
      data: {
        quickbooksSyncError: error.message || 'Unknown error',
      },
    }).catch(() => {});

    return NextResponse.json(
      { error: error.message || 'Failed to sync invoice to QuickBooks' },
      { status: 500 }
    );
  }
}

async function createQBCustomer(company: any, client: any): Promise<string> {
  const accessToken = decryptToken(company.quickbooksAccessToken!);
  const qbo = createQBClient(accessToken, company.quickbooksRealmId!);

  const qbCustomer = {
    DisplayName: client.companyName || client.contactName || client.email || 'Unnamed Customer',
    GivenName: client.contactName?.split(' ')[0],
    FamilyName: client.contactName?.split(' ').slice(1).join(' '),
    CompanyName: client.companyName,
    PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
    PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    BillAddr: client.addressLine1 ? {
      Line1: client.addressLine1,
      Line2: client.addressLine2,
      City: client.city,
      CountrySubDivisionCode: client.state,
      PostalCode: client.postalCode,
      Country: client.country,
    } : undefined,
  };

  const result: any = await new Promise((resolve, reject) => {
    qbo.createCustomer(qbCustomer, (err: any, customer: any) => {
      if (err) reject(err);
      else resolve(customer);
    });
  });

  // Save QB customer ID to our database
  await prisma.client.update({
    where: { id: client.id },
    data: { quickbooksId: result.Id },
  });

  return result.Id;
}
