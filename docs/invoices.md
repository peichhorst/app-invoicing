# Invoices Management

The Invoices module allows you to create, send, and track professional invoices efficiently. Streamline your billing process and accelerate payment collection with automated features and professional presentation.

## Invoice Creation

### New Invoice Process
1. Navigate to **Invoices > New Invoice**
2. Select the client from your contact database
3. Choose the associated opportunity or project
4. Add line items with descriptions, quantities, and rates
5. Apply taxes or discounts as appropriate
6. Preview and send the invoice

### Quick Invoice Creation
- Use templates for recurring billing
- Duplicate previous invoices for similar projects
- Create invoices directly from opportunities
- Generate bulk invoices for multiple clients

## Invoice Components

### Header Information
- Invoice number (automatically generated or custom)
- Invoice date and due date
- Client contact information
- Your company details and logo

### Line Items
- **Description**: Clear explanation of goods/services provided
- **Name**: Defaults to the description for internal records and integrations
- **Quantity**: Amount of goods or time spent
- **Rate**: Price per unit or hourly rate
- **Amount**: Calculated total for each line item
- **Tax**: Applicable tax calculations

### Totals Section
- Subtotal calculation
- Tax amount breakdown
- Discount application
- Grand total
- Payment terms

## Invoice Templates

### Template Creation
1. Go to **Settings > Invoice Templates**
2. Choose from available template designs
3. Customize colors, fonts, and layout
4. Add your company logo and branding
5. Modify sections to match your business needs
6. Save and set as default

### Template Customization
- **Layout Options**: Single column, two column, or detailed layouts
- **Branding Elements**: Colors, fonts, logos, and headers
- **Content Sections**: Additional fields for special terms or information
- **Conditional Logic**: Different layouts based on invoice type or client

## Payment Processing

### Payment Methods
- **Credit Card**: Stripe integration for online payments
- **ACH Transfer**: Bank-to-bank transfers
- **Check**: Traditional paper check payments
- **Cash**: Cash payment recording

### Payment Terms
- **Net 30**: Standard 30-day payment terms
- **Due on Receipt**: Immediate payment required
- **Custom Terms**: User-defined payment schedules
- **Deposit Requirements**: Upfront payment for large projects
- **Refund policy (Stripe pass-through)**: Refunds apply to service amount only; processing fees are non-refundable.

### Online Payment Portal
- Secure client payment portal
- Invoice checkout now uses Stripe **Payment Element** (instead of card-only Card Element).
- If ACH (`us_bank_account`) is enabled and eligible on the connected Stripe account, ACH appears in checkout alongside card.
- When both Card and ACH are enabled, checkout shows explicit Card/ACH tabs (Card selected by default).
- If **Client pays Stripe fees** is enabled, switching tabs recalculates totals using the selected method fee schedule.
- If **Business absorbs Stripe fees** is enabled, the main Stripe form keeps all enabled methods available.
- Optional Stripe fee pass-through logic is now supported in checkout APIs via `applyStripeFee`.
  By default, this is controlled by **Business Settings -> Stripe Processing Fees**.
  When enabled, checkout computes:
  - `Invoice amount` (base)
  - `Processing fee` (derived from configured Stripe fee rate/fixed cents)
  - `Total` (base + fee)
- In invoice email content and PDF, when **Client pays Stripe fees** is enabled, the Pay Online section now shows a short processing-fee notice under the button (Credit Card rate and ACH rule/cap).
- Automatic receipt generation
- Payment confirmation notifications
- Transaction history tracking

### Invoices Page Layout
- The primary **New Invoice** button is shown in the top invoices header area.
- Filter controls are positioned directly below the invoice summary section for clearer scanning flow.
- The resend control opens a mode picker with **Send as Original** (neutral resend copy) and **Send as Reminder** (explicit reminder labeling).

### Invoice PDF Payment Methods
- The invoice PDF only shows **Pay online** when Stripe is configured (both `stripeAccountId` and `stripePublishableKey` are present).
- The invoice PDF shows **Zelle** only when a Zelle handle is saved.
- The invoice PDF shows **Venmo** only when a Venmo handle is saved, and includes a Venmo QR code.
- Invoice email payment options also show a Venmo QR code when a Venmo handle is configured.
- Payment settings are resolved from Company Settings first, then user-level profile fields as fallback.
- In the PDF payment section, **Venmo / Zelle / Check** are shown first (Venmo first, Check last), and the **Pay Invoice** online button appears last on its own line.
- Invoice emails and PDFs now include a branded **View Public Portal** button (matching the pay CTA style) so clients can jump directly into their portal from either format.
- If no payment methods are configured, the PDF shows a fallback note asking the client to call or email to arrange payment.

### Invoice Live Preview Payment Methods
- The invoice editor live preview now shows the same payment-method section while creating/editing invoices.
- It shows only configured **Venmo / Zelle / Check** cards first (Venmo first, Check last), and **Pay Invoice** (when Stripe is configured) appears last. Unset methods are hidden.
- Pay-link presentation is now button-style in both preview and emailed/attached PDF (instead of rendering long raw URLs), with a short helper note when the link is generated only after send.
- For unpaid invoice PDFs, payment methods are rendered on a dedicated second page, and page one shows a short note: "View next page for payment methods."
- Stripe webhook handling now includes secret-resolution fallback (platform and stored account secrets) and can create a fallback payment row from `invoiceId` metadata on `payment_intent.succeeded` when a pre-created payment row is missing.
- It uses Company Settings payment values first, with user-level profile values as fallback.
- Issue date and due date in live preview are parsed as local calendar dates to avoid timezone day-shift.
- The preview header shows the company logo (when a logo URL is configured).
- In invoice mode, the live preview header shows an invoice number line only when a real invoice number exists.
- Preview and email PDF now share a common invoice presentation mapping utility for payment method resolution (company-first fallback, pay-link visibility, Venmo/Zelle/Check ordering, and no-method fallback message).
- The emailed invoice PDF layout/branding now mirrors the live preview structure more closely (header placement, Bill To card, table styling, totals emphasis, payment cards, and footer branding).
- The emailed invoice PDF now uses your workspace primary brand color for key accents (company name, invoice heading, total highlight, and pay link) instead of a fixed default blue.
- Invoice phone numbers now use a shared display format across preview and email/PDF contexts (US numbers shown as `(###) ###-####`, with graceful fallback for other formats).
- On Free plan workspaces, preview shows **Powered by ClientWave** directly below "Thank you for your business!"
- In the invoice creator layout, the **Save Draft** and **Save & Send** buttons are positioned below the preview section.
- Invoice and recurring-invoice previews stay in the inline editor preview, while the emailed/attached PDF applies the same payment-method visibility and ordering rules (Pay Invoice line, then Venmo / Zelle / Check columns).
- In invoice mode, the live preview now shows a small **Preview** badge above the main preview container, and the check-payment card label reads **Check**.
- For recurring invoices, the live preview now shows recurring payment terms (for example monthly terms), and the same recurring terms are included in emailed/downloaded PDFs.

### Usage Example (Invoice PDF)
1. Leave Stripe, Venmo, and Zelle blank in company settings.
2. Send an unpaid invoice and open its PDF.
3. The **Payment Methods** section will display: "No payment methods are set on this invoice. Please call or email to arrange payment."
4. Add a Venmo handle and resend.
5. The PDF now shows the Venmo handle plus a QR code for scan-to-pay.
6. Add a Zelle handle.
7. The PDF now includes both Venmo and Zelle entries.
8. Connect Stripe (set `stripeAccountId` and `stripePublishableKey`).
9. The PDF now includes the **Pay online** payment link.

### Usage Example: Stripe Fee Pass-Through (API/Checkout Foundation)
1. Set **Business Settings -> Stripe Processing Fees -> Client pays Stripe fees**.
2. Open an invoice payment link.
3. Checkout will automatically include processing fee lines.
4. The server computes a gross amount that covers Stripe processing fees and returns:
   - `baseAmountCents`
   - `stripeFeeCents`
   - `amountCents` (final charge)
5. Checkout displays the fee breakdown and charges the final amount.

## Invoice Tracking

### Status Monitoring
- **Draft**: Invoice created but not sent
- **Open**: Invoice sent and unpaid (active receivable)
- **Viewed**: Client opened the invoice
- **Partial Payment**: Some payment received
- **Paid**: Full payment received
- **Overdue**: Payment past due date
  Overdue starts the day after the due date (not on the due date itself).
- Legacy note: older records may still show `UNPAID` temporarily, but the active canonical unpaid status is `OPEN`.
- **Paid Date Editing**: The invoice list paid-date editor reads/writes the invoice `paidAt` field, which is also used by reporting.
- **Invoice List Status Column**: The list now combines status context in one column; paid invoices show `Paid on <date>`, and unpaid invoices show `Sent: <count>` or `Not Sent`.

### Delete vs Void Behavior
- Draft invoices with no payment records are permanently deleted.
- Any invoice with payment history, or any non-draft invoice, is marked `VOID` instead of hard-deleted.
- This preserves payment/reporting history while still removing the invoice from active collections workflows.

### Payment Tracking
- Record all payment methods
- Track partial payments
- Monitor outstanding balances
- Identify late-paying clients

## Automation Features

### Recurring Invoices
- Set up automatic monthly billing
- Configure seasonal billing schedules
- Adjust amounts based on usage or time
- Cancel or modify recurring invoices
- In the standard **New Invoice** form, checking recurring now maps directly to recurring schedule payload fields (`recurring`, interval/day, next occurrence), so a recurring parent schedule is actually created (not a one-time invoice only).
- In `/dashboard/invoices/recurring-new`, saving now uses the same invoice payload flow as standard invoices (including recurring schedule fields), and form validation failures show a visible error toast.
- Forced-recurring forms now keep recurring interval/payment terms controls visible even after validation errors.
- Validation errors in the editor now surface the first concrete field message in the toast, so hidden/implicit failures are easier to diagnose.
- New recurring schedules start in `PENDING` and only transition to `ACTIVE` after the first invoice in that series is marked paid.
- Recurring list "Subscription" badges are now payment-aware: they display `PENDING` until first paid invoice is detected (via `firstPaidAt` or paid child invoice), while `PAUSED` and `CANCELLED` remain authoritative.

### Reminders
- **First Reminder**: Sent at due date
- **Second Reminder**: Sent 7 days after due date
- **Final Notice**: Sent 14 days after due date
- **Custom Schedules**: User-defined reminder timing

### Notifications
- Email alerts when invoices are viewed
- Payment received notifications
- Overdue invoice warnings
- Custom notification rules

## Reporting and Analytics

### Revenue Reports
- Monthly, quarterly, annual revenue
- Outstanding receivables
- Client payment history
- Profit margin analysis

### Performance Metrics
- Days to payment
- Invoice aging report
- Client payment patterns
- Payment method preferences

## Client Communication

### Invoice Delivery
- **Email**: Direct email delivery with payment links
- **Portal**: Access through client portal
- **Print**: Physical mail option
- **SMS**: Text message notifications

### Payment Reminders
- Automated reminder campaigns
- Personalized follow-up messages
- Escalation procedures for overdue accounts
- Collection agency referrals

## Integration Capabilities

### Accounting Software
- **QuickBooks**: Direct sync for financial records
- **Xero**: Cloud-based accounting integration
- **Excel**: Export options for spreadsheet users
- **Custom APIs**: Third-party software connections

### Project Management
- Link to associated opportunities
- Time tracking integration
- Expense tracking connection
- Milestone-based billing

## Best Practices

- **Send Promptly**: Invoice immediately after work completion
- **Be Clear**: Use detailed line item descriptions
- **Follow Up**: Implement systematic follow-up procedures
- **Offer Convenience**: Multiple payment options
- **Track Everything**: Monitor payment patterns and trends

## Troubleshooting

### Common Issues
- **Delivery Problems**: Ensure email addresses are correct
- **Payment Processing**: Verify payment processor configurations
- **Tax Calculations**: Check tax settings and regulations
- **Integration Errors**: Confirm connection settings
- **Broken "Official PDF" Link in Email**: If storage is not fully configured and a placeholder URL is present, the email suppresses the "Official PDF" link to avoid sending a broken URL.

## Support

For invoice-related questions, visit our [FAQ](./faq.md) or contact support at [support@clientwave.app](mailto:support@clientwave.app).
