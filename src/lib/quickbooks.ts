// @ts-ignore - node-quickbooks doesn't have type definitions
import QuickBooks from 'node-quickbooks';
import crypto from 'crypto';

// Encryption helpers for storing tokens securely
const ENCRYPTION_KEY = process.env.QUICKBOOKS_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-cbc';

export function encryptToken(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('QUICKBOOKS_ENCRYPTION_KEY must be 32 characters');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptToken(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('QUICKBOOKS_ENCRYPTION_KEY must be 32 characters');
  }
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Initialize QuickBooks client
export function createQBClient(
  accessToken: string,
  realmId: string,
  useSandbox: boolean = process.env.QUICKBOOKS_USE_SANDBOX === 'true'
): QuickBooks {
  return new QuickBooks(
    process.env.QUICKBOOKS_CLIENT_ID || '',
    process.env.QUICKBOOKS_CLIENT_SECRET || '',
    accessToken,
    false, // no token secret needed for OAuth 2.0
    realmId,
    useSandbox,
    true, // use OAuth 2.0
    null,
    '2.0',
    accessToken
  );
}

// Refresh access token
export async function refreshQuickBooksToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || '';
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh QuickBooks token: ${error}`);
  }

  return response.json();
}

// Map invoice status to QuickBooks
export function mapInvoiceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    OPEN: 'Sent',
    SENT: 'Sent',
    VIEWED: 'Sent',
    SIGNED: 'Sent',
    COMPLETED: 'Sent',
    PARTIALLY_PAID: 'Sent',
    OVERDUE: 'Sent',
    PAID: 'Paid',
    PARTIALLY_REFUNDED: 'Paid',
    REFUNDED: 'Paid',
    VOID: 'Voided',
    CANCELLED: 'Voided',
  };
  return statusMap[status] || 'Draft';
}
