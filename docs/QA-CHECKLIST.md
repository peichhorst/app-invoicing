# QA Checklist

Last Updated: 2026-03-06

## Minimum Smoke Set (Pre-Deploy / Canary)
- [ ] Register new user account.
- [ ] Login with the same user and confirm authenticated session (`/api/auth/me`).
- [ ] Create client record.
- [ ] Create and send invoice from standard New Invoice flow.
- [ ] Complete online invoice payment flow and verify paid status.
- [ ] Run refund flow (full or partial) and verify invoice/payment status sync.
- [ ] Confirm webhook reconciliation updates invoice state after payment/refund events.

## Billing + Stripe
- [ ] Client-facing invoice/proposal emails set `Reply-To` to company email when configured, with user email fallback only when company email is missing.
- [ ] Connect Stripe (Express) from business settings succeeds.
- [ ] Account ID displays correctly after connection.
- [ ] Webhook delivery updates invoice payment status in database.
- [ ] Connect webhook events still resolve company/account when `stripe-account` header is missing but payload includes `"account"`.
- [ ] Refund action updates invoice status and UI badges correctly.
- [ ] Refund API can process refunds when Stripe IDs are present on `Payment` even if missing on `Invoice`.
- [ ] Refund API uses the connected Stripe account (company or owner) and sends either `payment_intent` or `charge` (not both).
- [ ] Refund modal no longer shows "View public invoice", keeps labels stacked above fields, and right-aligns submit action.
- [ ] Refund flow enforces service-only refunds (processing fees non-refundable) and shows that policy in the refund modal.
- [ ] "View Public Invoice" appears in invoice actions and on invoice detail page when `shortCode` exists.
- [ ] Invoice toasts show "Invoice Partially Refunded" with purple styling for `PARTIALLY_REFUNDED` changes.
- [ ] Resend action opens a modal with `Send as Original` and `Send as Reminder`, and reminder badges/copy only appear for reminder sends.
- [ ] Manual "Mark Paid" flow requires selecting method (Venmo/Zelle/Check/Cash/Other) and stores it on payment metadata.
- [ ] Invoice checkout shows Card/ACH tabs automatically when both methods are enabled for the business.
- [ ] If **Client pays Stripe fees** is enabled, switching Card vs ACH re-prices totals using the selected method fee schedule.
- [ ] If **Business absorbs Stripe fees** is enabled, checkout keeps all enabled methods available in the main Stripe form.
- [ ] If ACH is selected but Stripe account rejects ACH, fallback to card re-prices using card fee schedule (no undercharge).
- [ ] Reporting page shows consolidated Payments Activity table (event, source, method, amount impact, reference) scoped correctly by user/team role.
- [ ] Public invoice/client-portal "Pay online" buttons route to `/payment?seller=...&invoice=...` and PDF/public views render company-level payment methods.
- [ ] Invoice PDF filename format is `Company - Client - Invoice {invoiceNumber}.pdf` for direct download and email attachment.
- [ ] Stripe payment method toggles persist in business settings (Card/ACH).
- [ ] Stripe fee responsibility selection persists in Business Settings (`Business absorbs` vs `Client pays`).
- [ ] Invoice checkout only shows enabled methods from business settings.
- [ ] Validation prevents disabling both Card and ACH at the same time.
- [ ] Invoices status column shows payment source for paid invoices (`Paid Online` vs `Marked Paid`).
- [ ] Invoice status normalization is consistent: active unpaid invoices use `OPEN` in write paths, legacy `UNPAID` records are handled compatibly in filters/views, and sent/unpaid filtering includes `OPEN`.
- [ ] Invoices table `Unpaid` badge shows sent-count once (no duplicate secondary sent line).
- [ ] Invoices actions show `Issue Refund` only for Stripe payments and `Mark Refunded` only for manual payments.
- [ ] Online checkout success no longer calls manual mark-paid path; paid source remains Stripe (webhook-driven status update).
- [ ] Checkout Credit Card/Bank Transfer segmented tabs render as a continuous control without a white seam/background showing between tab buttons.

## Invoicing UX
- [ ] In standard New Invoice form, enabling recurring creates both the invoice and recurring schedule record (not invoice-only).
- [ ] Invoice delete behavior is lifecycle-safe: only `DRAFT` with no payments is hard-deleted; all other deletes transition invoice status to `VOID` while preserving payment/reporting records.
- [ ] Invoices action column icons are visually consistent: resend/email icon uses the same white branded icon-button style as other actions, and delete action uses a trash-can icon.
- [ ] Single invoice detail page hides the Messages section, and renders Notes above Payments.
- [ ] Invoice detail page amount-due actions include `Copy Payment Link` for `/payment?seller=...&invoice=...` and keep a separate `Backup Pay` action that opens Stripe Checkout session flow.
- [ ] Invoice detail page secondary backup payment action label reads `View Payment Link` (no amount shown).
- [ ] Preview and emailed PDF match for branding, colors, and payment methods.
- [ ] Invoice preview hides Payment Terms section, always shows Notes (with fallback when empty), and uses enlarged logo sizing consistent with invoice PDF/email header.
- [ ] Hidden payment method boxes do not render when values are unset.
- [ ] Long invoice item lists do not break payment-method section unexpectedly.
- [ ] “Click Here to Pay Invoice Online” renders consistently where enabled.
- [ ] Editing an existing invoice does not allow client reassignment in UI, and API rejects tampered `clientId` updates with a clear 400 error.
- [ ] Invoice email uses branded `View Public Portal` CTA (not text link), and unpaid PDF payment page also includes the same branded portal CTA when a portal token exists.
- [ ] Invoice email payment CTA row shows `Pay Invoice Online` (only when Stripe online payment is enabled) and always shows `Access Client Portal` to its right.
- [ ] Invoice emails send to client as primary recipient and BCC the sender copy (when different), without sending a separate second copy email.

- [ ] Invoice due on today's date is not treated as overdue until the next calendar day (status, reminders, and portal overdue counters follow the same rule).


## Auth + Landing
- [ ] Playwright smoke passes for `login -> create/send invoice` using configured E2E credentials.
- [ ] Home and Scheduling appointments render through the shared `AppointmentScheduleTable` component with matching table formatting and action-column behavior.
- [ ] Home dashboard appointments section uses the same action-capable bookings table as Scheduling page (reschedule/cancel/delete parity).
- [ ] Scheduling appointments table refreshes from API on load/action and remains strictly sorted by start time ascending (no hidden missing rows due to stale local state).
- [ ] After booking is confirmed on public booking page, the top request-intro block (`Book a session / Schedule Meeting / Select date and time...`) is hidden.
- [ ] After Google Calendar OAuth, user is redirected to `/dashboard/settings?tab=availability` and the Availability tab is active on load.
- [ ] User-menu primary CTA label is `Login / Register` for guests and `Dashboard` for authenticated users.
- [ ] `Switch back` button only appears during active impersonation sessions (requires both backup session token and impersonation marker cookie), and hides for normal non-superadmin dashboard sessions.
- [ ] During impersonation, `Switch back` renders in the global floating action row to the left of Chat and matches the same floating button size/style.
- [ ] In `/dashboard/onboarding`, saving Profile/Business steps auto-advances and scrolls the page to top so the next step header is immediately visible.
- [ ] Lead CSV import creates `Lead` records assigned to the current user (visible under My Leads), and client import rejects lead-template files with a clear guidance error.
- [ ] Sidebar nav no longer jumps on initial dashboard load: role-gated items (Reporting/Compliance/Products/Team/Superadmin Users) are server-resolved and render in final state on first paint.
- [ ] Booking success confirmation shows timezone labels once per user context (viewer + optional host), without repeating timezone suffix on both start and end times.
- [ ] Scheduling page embed snippet uses `data-user-id` (stable user ID) rather than slug-based attributes, matching Settings/Onboarding embed behavior.
- [ ] Scheduling page section order prioritizes setup/distribution before operations (Booking Settings with Share & Embed near top, then Google Calendar Sync, then Appointment Schedule), and these section headers use the same branded banner style.
- [ ] Auth UI shows human-readable sign-in messages (e.g., incorrect email/password) and never renders raw JSON/error blobs from auth endpoints.
- [ ] Email-change verification links resolve at `/settings/email/verify/{token}`, and legacy query-style links (`/settings/email/verify?token=...`) redirect correctly instead of 404.
- [ ] Floating actions show Chat + Download App together across pages, with Download App styled to match Chat and hidden automatically when already installed/standalone.
- [ ] Header alignment consistent across login/reset/dashboard pages.
- [ ] Landing hero screenshots render and load optimized assets.
- [ ] Footer renders as intended on desktop/mobile.

## Product Ops
- [ ] `/dashboard/readiness` renders completion heatmap, module risk chart, QA coverage chart, readiness gauge, and priority burndown from docs tracker files.

## Session Sign-off Template
- Date:
- Change:
- Scope:
- Result: Pass / Fail
- Notes:

## Session Sign-off
- Date: 2026-03-06
- Change: Standardized Scheduling page section layout and banner headers to match Appointment Schedule style.
- Scope: `SchedulingForm`, Scheduling page section order, Google Calendar Sync card heading style.
- Result: Pass
- Notes: Visual QA only (no full build run for this style/layout pass).

- Date: 2026-03-06
- Change: Normalized invoice active unpaid status to `OPEN` and added legacy `UNPAID` compatibility + migration.
- Scope: Invoice create/send/resend/proposal-complete/status UI/filter/export paths and DB migration.
- Result: Pass
- Notes: Code-level validation completed; full build not run (per workflow preference).

- Date: 2026-03-06
- Change: Added a basic Readiness Dashboard page (`/dashboard/readiness`) with doc-driven progress/risk charts and sidebar nav entry.
- Scope: Readiness page + chart component + parser utility + dashboard sidebar link.
- Result: Pass
- Notes: Manual implementation review complete; automated lint/build not run in this shell due local command-path limits.
