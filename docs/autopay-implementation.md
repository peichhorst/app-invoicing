# Automatic Recurring Payment Implementation

## Overview
Implemented automatic payment functionality for recurring invoices. After a client pays their first recurring invoice, the system will automatically charge their saved payment method for all future recurring invoices.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
Added new fields to `RecurringInvoice` model:
- `autoPayEnabled` (Boolean, default false) - Flag to enable/disable auto-payment
- `stripePaymentMethodId` (String?) - Stored payment method ID from Stripe
- `stripeCustomerId` (String?) - Stripe customer ID for the client
- `lastPaymentError` (String?) - Stores error messages from failed auto-payments

### 2. Payment Capture (`src/app/api/payments/store-recurring-payment-method/route.ts`)
Created new API endpoint that:
- Detects when a recurring invoice is paid for the first time
- Retrieves the payment method from Stripe
- Stores payment method ID and customer ID in the RecurringInvoice record
- Enables auto-pay flag
- Sets `firstPaidAt` timestamp and changes status to ACTIVE

### 3. Payment Form Integration (`src/components/CheckoutForm.tsx`)
Updated the CheckoutForm component to:
- Call the new store-recurring-payment-method endpoint after successful payment
- Automatically capture payment method for recurring invoices
- Works seamlessly with existing payment flow

### 4. Cron Job for Auto-Charging (`src/app/api/cron/recurring-invoices/route.ts`)
Enhanced the recurring invoice generation cron job to:
- Check if auto-pay is enabled for each recurring invoice
- Automatically charge the saved payment method using Stripe Connected Accounts
- Mark invoice as PAID if charge succeeds
- Store error messages and optionally disable auto-pay if payment fails
- Send notifications for failed payments

### 5. Failed Payment Notifications (`src/lib/recurring-payment-notifications.ts`)
Created notification system that:
- Sends email to business owner when auto-payment fails
- Sends email to client notifying them of failed payment
- Includes error details and next steps

### 6. UI Updates (`src/app/recurring/page.tsx`)
Updated recurring invoices page to:
- Display "Auto-pay enabled" badge with credit card icon
- Shows on both mobile and desktop views
- Visual indicator for invoices with automatic payment enabled

## How It Works

### First Payment Flow:
1. Client receives first recurring invoice
2. Client pays invoice through the payment form
3. Payment succeeds and payment method is captured
4. System stores payment method ID, customer ID, and enables auto-pay
5. RecurringInvoice status changes to ACTIVE

### Subsequent Payments:
1. Cron job runs daily checking for due recurring invoices
2. For invoices with auto-pay enabled, system automatically charges saved payment method
3. If successful:
   - Invoice marked as PAID
   - Email receipt sent to client
   - Next invoice scheduled
4. If failed:
   - Error stored in lastPaymentError field
   - Auto-pay disabled if card_declined or insufficient_funds
   - Email notifications sent to both owner and client
   - Invoice still created and sent manually

## Testing

To test this feature:
1. Create a recurring invoice for a test client
2. Pay the first invoice through the payment portal
3. Verify auto-pay indicator appears on recurring invoices page
4. Trigger the cron job manually: `GET /api/cron/recurring-invoices`
5. Verify subsequent invoices are auto-charged

## Database Migration

Run the following to apply schema changes:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add_recurring_autopay
```

Then regenerate Prisma Client:
```bash
npx prisma generate
```

## Important Notes

- Auto-pay uses Stripe Connected Accounts (seller's account)
- Payment methods are stored securely in Stripe, not in our database
- Failed payments will disable auto-pay for declined cards or insufficient funds
- Clients can still pay invoices manually if auto-pay fails
- System requires seller to have connected Stripe account

## Future Enhancements

Potential improvements:
- Retry logic for failed payments (e.g., retry 3 times over 3 days)
- Client portal page to manage saved payment methods
- Admin UI to manually enable/disable auto-pay
- Support for multiple payment methods per client
- Grace period before disabling auto-pay after failures
