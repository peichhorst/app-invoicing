# QuickBooks Integration Setup Guide

## Overview
This integration allows you to sync invoices and clients from your app to QuickBooks Online.

## Features
- ✅ One-way sync (App → QuickBooks)
- ✅ Sync invoices with line items
- ✅ Auto-create customers in QuickBooks
- ✅ Manual sync per invoice
- ✅ Automatic token refresh

## Setup Instructions

### 1. Create QuickBooks App

1. Go to [developer.intuit.com](https://developer.intuit.com/)
2. Sign in and click "Create an app"
3. Select "QuickBooks Online and Payments"
4. Name your app (e.g., "Your Company Invoicing")
5. Select scopes:
   - ✅ Accounting

### 2. Get Your Credentials

1. Go to your app's dashboard
2. Click "Keys & credentials"
3. Copy your **Client ID** and **Client Secret**
4. Add to your `.env.local`:

```env
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_REDIRECT_URI=https://yourdomain.com/api/integrations/quickbooks/callback
QUICKBOOKS_USE_SANDBOX=false
QUICKBOOKS_ENCRYPTION_KEY=your32characterlongencryptionkey
```

### 3. Generate Encryption Key

Run this command to generate a secure 32-character key:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Add it to `QUICKBOOKS_ENCRYPTION_KEY` in `.env.local`

### 4. Set Redirect URI

In QuickBooks app settings → Keys & credentials:
1. Add Redirect URI: `https://yourdomain.com/api/integrations/quickbooks/callback`
2. For local dev: `http://localhost:3000/api/integrations/quickbooks/callback`

### 5. Testing (Sandbox)

For development/testing:
1. Use sandbox credentials
2. Set `QUICKBOOKS_USE_SANDBOX=true`
3. Connect with a QuickBooks Sandbox company

### 6. Production

For production:
1. Submit your app for review (if needed)
2. Get production credentials
3. Set `QUICKBOOKS_USE_SANDBOX=false`
4. Update redirect URI to production domain

## Usage

### Connect QuickBooks
1. Go to Settings
2. Find "QuickBooks Integration" section
3. Click "Connect to QuickBooks"
4. Authorize with your QuickBooks account

### Sync Invoices
1. Create/edit an invoice
2. Click "Sync to QB" button
3. Invoice and customer automatically created in QuickBooks

### Disconnect
1. Go to Settings
2. Click "Disconnect" under QuickBooks Integration
3. Tokens are removed (data stays in QuickBooks)

## What Gets Synced?

### Invoices → QuickBooks Invoices
- Invoice number
- Issue date / Due date
- Line items (description, quantity, price)
- Subtotal, tax, total
- Notes

### Clients → QuickBooks Customers
- Name / Company name
- Email / Phone
- Billing address

## Troubleshooting

### Token Expired
Tokens automatically refresh. If sync fails:
1. Disconnect QuickBooks
2. Reconnect
3. Try syncing again

### Customer Not Found
The app will automatically create the customer in QuickBooks if they don't exist.

### Sync Error
Check the invoice for error details. Common issues:
- Required fields missing
- QuickBooks rate limits (500 req/min)
- Invalid data format

## API Endpoints

### Connect
`GET /api/integrations/quickbooks/connect`
Returns OAuth URL

### Callback
`GET /api/integrations/quickbooks/callback`
Handles OAuth redirect

### Sync Invoice
`POST /api/integrations/quickbooks/sync-invoice/[id]`
Syncs specific invoice

### Disconnect
`POST /api/integrations/quickbooks/disconnect`
Removes connection

## Database Schema

### User Table
```prisma
quickbooksRealmId       String?   // Company ID
quickbooksAccessToken   String?   // Encrypted
quickbooksRefreshToken  String?   // Encrypted
quickbooksTokenExpiry   DateTime?
quickbooksConnected     Boolean   @default(false)
```

### Invoice Table
```prisma
quickbooksId        String?   // QB Invoice ID
quickbooksSyncedAt  DateTime? // Last sync
quickbooksSyncError String?   // Error message
```

### Client Table
```prisma
quickbooksId String? // QB Customer ID
```

## Security Notes

- ✅ Tokens are encrypted using AES-256-CBC
- ✅ State parameter prevents CSRF attacks
- ✅ Tokens auto-refresh before expiry
- ✅ No sensitive data in URLs
- ⚠️ Keep `QUICKBOOKS_ENCRYPTION_KEY` secret
- ⚠️ Use HTTPS in production

## Rate Limits

QuickBooks API limits:
- 500 requests per minute
- Batch operations recommended for bulk sync

## Support

For QuickBooks API documentation:
- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
