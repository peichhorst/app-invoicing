# MEMORY.md

## Preferences
- Call the user "Boss".
- Use a casual tone and cover any role that makes sense.

## Process
- Follow the startup sequence in `AGENTS.md` (SOUL/USER/daily memory; MEMORY.md only in main sessions).
- After successful tasks, add a one-sentence update to `MEMORY.md` (per `SOUL.md`).

## Durable Project Notes
- Prisma datasource URLs are configured to disable prepared statements for pgBouncer compatibility.
- Message recipient lists are stored as JSON-encoded strings with parse/serialize helpers.

## Latest Update
2026-03-06: Added a basic `/dashboard/readiness` page with doc-driven progress visuals (completion heatmap, module risk, QA coverage, readiness score, priority burndown), plus a new `Readiness` sidebar nav item for OWNER/ADMIN/SUPERADMIN.
2026-03-06: Updated invoice delete lifecycle to preserve accounting history: hard-delete only for `DRAFT` invoices with no payments; all others are marked `VOID` via API and UI messaging now clarifies delete-vs-void behavior.
2026-03-06: Reintroduced [THE TESTER] section in AGENTS.md with required evidence and test-data guardrails, and moved minimum smoke suite into docs/QA-CHECKLIST.md.
2026-03-06: Ran production smoke validation with a new audit account (register/login/auth-me) and confirmed client + invoice creation via API; invoice created successfully in `OPEN` status for audit trail.
2026-03-06: Fixed regular New Invoice recurring persistence by mapping `recurringEnabled` form state to API payload fields (`recurring`, interval/day, nextOccurrence) for both create and edit submit paths.
2026-03-06: Added `docs/release-canary.md` with a production deploy runbook (pre-checks, canary rollout, smoke tests, rollback rules) and linked it from docs readme/quick-start/troubleshooting.
2026-03-06: Added Playwright E2E scaffolding (`playwright.config.ts`, `e2e/auth-create-invoice.spec.ts`, npm scripts, and gitignore outputs) for a login + create/send invoice smoke flow using E2E env credentials.
2026-03-06: Fixed Vercel build blocker by converting `src/app/book/[slug]/BookingFormClient.tsx` from CP1252 bytes to valid UTF-8 (no BOM); strict UTF-8 validation now passes.
2026-03-06: Expanded docs/TODO.md into a concrete 30-day week-by-week execution plan (Weeks 1-4 + exit criteria) tied to production readiness, launch ops, and revenue motion.
2026-03-06: Added an early-access notice banner to the login/register form clarifying stable core billing/client management and ongoing feature rollout.
2026-03-06: Normalized invoice status model to canonical `OPEN` for active unpaid (create/send/resend/proposal-complete/write paths), added `UNPAID` compatibility reads during transition, and added a DB migration to convert existing `UNPAID` rows to `OPEN`.
2026-03-06: Updated Appointment Schedule action controls in the shared table to use uppercase `RS`, added hover tooltips to action buttons, and styled permanent delete (trash) action in red for clearer destructive affordance.
2026-03-06: Finalized Scheduling page hierarchy (Booking Settings -> Google Calendar Sync -> Appointment Schedule) and normalized Scheduling subsection banners (Share & Embed, Meeting Types, Availability) to the same branded heading style as Appointment Schedule.
2026-02-04: Added NEXT_PUBLIC_DISABLE_POLLING gates to presence, chat, and invite polling so local reloads can be isolated.
2026-02-04: Scoped auth cookie domain to production only so localhost logins aren’t broken by the .clientwave.app domain.
2026-02-04: Made invoice numbers optional in InvoiceService and auto-generated them when missing to prevent invoice creation errors.
2026-02-04: Deleted BOOTSTRAP.md per workspace rules and pushed commit 2b6f76b with the auth cookie and chat/presence fixes.
2026-02-04: Added optional cookie domain support (defaulting to .clientwave.app when applicable) so auth cookies work across www/apex hosts.
2026-02-04: Adjusted Prisma pooler URL normalization to only force pgBouncer params for transaction pooler (port 6543) so session pooler connections remain clean.
2026-02-04: Normalized Supabase pooler URLs in the Prisma wrapper to auto-apply pgBouncer params and allowed superadmins to see support chat save error details.
2026-02-04: Reduced InviteConfirmListener polling frequency, paused polling when the tab is hidden, and removed debug logs to reduce constant rendering noise.
2026-02-04: Added a migration for Invoice pdfUrl, applied the column to Supabase via psql, and cleaned up the temporary SQL file.
2026-02-04: Switched local dev back to Postgres, restored the Prisma schema provider, updated .env.local to use the Supabase transaction pooler (pgbouncer/statement_cache_size=0), and regenerated the Prisma client.
2026-02-04: Enabled USE_MOCK_DB in .env.local and commented the SQLite URL to avoid Prisma schema validation errors with the Postgres-only schema.
2026-02-04: Switched local dev back to SQLite (file-based DATABASE_URL) and updated Prisma wrapper to use the mock client only when USE_MOCK_DB is enabled.
2026-02-03: Normalized core MD files to ASCII, filled missing USER.md fields, curated MEMORY.md, expanded SOUL.md with app-invoicing priorities, narrowed the JSDoc rule, wired chat to a doc-backed OpenAI agent with env config, added chat source links with a viewer endpoint, and deduped returned sources.
2026-02-03: Removed duplicate docs sidebars by simplifying docs overview and opportunities pages to rely on the shared layout.
2026-02-03: Replaced inline "->" markers with &rarr; entities in docs pages to fix JSX parse errors.
2026-02-03: Removed the duplicate docs header/breadcrumb from the docs layout to avoid stacked headers.
2026-02-03: Moved Docs and Chat links into the user dropdown menu above Logout in the header.
2026-02-03: Moved the Theme toggle under Chat in the dropdown and shifted the icon to the left.
2026-02-03: Renamed "Docs" to "Documentation" in the header dropdown and dashboard sidebar.
2026-02-03: Removed the chat page header title/subtitle block.
2026-02-03: Restored the chat page header title/subtitle block.
2026-02-03: Mapped known docs sources in chat to their /docs routes, with fallback to the source viewer.
2026-02-03: Removed docs/sdks.md from the chat knowledge base sources list.
2026-02-03: Added knowledge base cache invalidation for file list changes and fallback to README when no chunks match.
2026-02-03: Added query overrides/meta filtering for more precise sources, added a /docs/faq page, and labeled chat sources with friendly titles.
2026-02-03: Initialized git, committed, and force-pushed main to the GitHub repo.
2026-02-03: Fixed the reporting prisma import and adjusted clients/invoices route param typing for Next build.
2026-02-03: Switched clients/invoices route params to Promise-based typing to match existing Next route handler signatures.
2026-02-03: Exported named prisma and aligned docs source page searchParams typing with Next expectations.
2026-02-03: Normalized product list serialization/parsing to match string storage, updated product APIs/UI, and adjusted tag filtering.
2026-02-03: Added payment support to the Prisma wrapper and made product normalization parse string tag/feature lists.
2026-02-03: Fixed backfill-payments script to coerce Decimal totals to numbers for Prisma payment creation.
2026-02-03: Added a magicLink getter with mock fallback storage to PrismaWrapper to satisfy missing prisma.magicLink build errors.
2026-02-03: Renamed the PrismaWrapper internal client field to avoid accessor recursion and made magicLink a concrete delegate property for type-checking.
2026-02-03: Removed README sources from the chat knowledge base and source maps so chat answers no longer cite README files.
2026-02-03: Removed schema sources from the chat knowledge base so chat answers no longer cite schema files.
2026-02-03: Renamed uppercase docs files to kebab-case and updated docs index/readme/knowledge base references.
2026-02-03: Fixed SubscriptionService invoice status typing/Decimal conversions by aligning mock InvoiceStatus and using enum values, then got a clean Next.js build.
2026-02-03: Added PgBouncer query params to pooled DATABASE_URL settings and documented pooled vs direct URLs in env examples.
2026-02-03: Added a chat bar superadmin online indicator based on /api/me so the chat UI can show when a superadmin is logged in.
2026-02-03: Added a local-only superadmin reply input in the chat bar to echo superadmin messages into the chat stream.
2026-02-03: Wired support chat persistence via /api/chat/messages with polling-based updates, and excluded support chat messages from the internal messaging inbox/status checks.
2026-02-03: Moved the superadmin online badge to the right of the chat send button.
2026-02-03: Added a superadmin-only online users list for support chat, backed by a new /api/chat/online-users endpoint.
2026-02-03: Added user presence tracking (lastSeenAt), a /api/presence/ping endpoint, and superadmin online-user list driven by lastSeenAt with chat-side heartbeat pings.
2026-02-03: Removed the SQLite DATABASE_URL from .env so Prisma no longer defaults to file-based dev DB.
2026-02-03: Added superadmin presence lookup for chat so non-superadmins can see when a superadmin is online.
2026-02-03: Moved presence heartbeat to a global PresencePing component in the root layout so lastSeenAt updates on any authenticated page.
2026-02-03: Relaxed presence and online-user lookups to be global (no companyId filter) so superadmin online status and online user lists work across companies.
2026-02-03: Made the superadmin online user chips link to /chat?chatId=<userId> for quick replies.
2026-02-03: Throttled chat polling and added in-flight guards to reduce concurrent Prisma connections.
2026-02-03: Updated support chat message endpoints to avoid companyId gating and resolve companyId from the target user for superadmin chats.
2026-02-03: Added dev error details to support chat message POST responses to surface underlying save failures.
2026-02-03: Expanded dev error output for support chat message saves to include Prisma code/meta when POST fails.
2026-02-03: Prisma client now prefers DIRECT_URL in non-production to avoid pooler connection issues during local dev.
2026-02-03: Switched Prisma dev client back to prefer DATABASE_URL and increased pooler connection limits/timeouts in .env.local for stability.
2026-02-03: Reduced Supabase pooler connection_limit to 1 and forced statement_cache_size=0 to avoid protocol errors with PgBouncer.
2026-02-03: Added sslmode=require to Supabase pooler URLs in .env.local to stabilize PgBouncer connections.
2026-02-03: Switched local DATABASE_URL to Supabase session pooler (5432) with sslmode=require and higher connection_limit.
2026-02-05: Logged a docs gap that polling status/configuration is not documented.
2026-02-05: Logged a docs gap that invoice item creation errors (missing required name) are not documented.
2026-02-05: Mapped invoice API line items to include a name fallback and documented that line item names default to descriptions.
2026-02-05: Ran vitest for invoice submit tests (passed).
2026-02-05: Logged a docs gap for missing Contract.pdfUrl column errors in the contracts list.
2026-02-05: Logged a docs gap for whether a local database is expected/configured.
2026-02-05: Added a migration for Contract.pdfUrl, applied it via pooler, and documented PDF storage for contracts.
2026-02-05: Added database health check and migration checklist docs, plus troubleshooting guidance; vitest run failed in payments/refund webhook tests due to prisma mock and missing Stripe key.
2026-02-05: Ran `pnpm vitest run tests/invoice-submit.test.ts` in WSL (3 tests passed) after the PowerShell `pnpm test` attempt timed out due to watch mode.
2026-02-11: Disabled mock-data auth fallback by making Prisma fail-fast when DB is unavailable and documented the new registration troubleshooting flow.
2026-02-17: Clarified dashboard Opportunity Search source labeling to "Aggregated (EchoThread + TheirStack)" and updated no-results messaging/docs to match default industry/location fallback behavior.
2026-02-17: Fixed Opportunity Search "Save as Lead" mapping to store normalized website URLs and preserve summary/apply/result link context in lead notes.
2026-02-17: Updated Prisma runtime connection priority to prefer DIRECT_URL in non-production (fallback DATABASE_URL) and documented the environment-specific DB URL behavior to reduce registration timeout failures.
2026-02-17: Added a new Terms of Service page at /terms-of-service and linked it in the auth/OAuth footer next to Privacy Policy, with FAQ docs updated to list legal page routes.
2026-02-23: Updated invoice PDF payment methods to show Venmo (with QR) and Zelle only when configured, hide Pay online unless Stripe is configured, and show a call/email fallback when no payment methods are set; documented this behavior in docs/invoices.md.
2026-02-23: Fixed invoice email/PDF payment rendering to read mail-to-check, Venmo, Zelle, and Stripe settings from company fields (with user fallback), and updated InvoiceService user queries to include company so payment methods appear reliably in sent PDFs.
2026-02-23: Updated the invoice PDF payment section layout so the Pay Invoice link is on its own line and Check, Zelle, and Venmo render in a single three-column row, with docs/invoices.md updated accordingly.
2026-02-23: Added invoice editor live preview payment methods so create/edit invoice preview now shows Pay Invoice plus Check/Zelle/Venmo (with Venmo QR) using company-first payment settings fallback.
2026-02-23: Fixed invoice live preview payment methods by expanding /api/auth/me to include Stripe, Venmo, Zelle, and mail-to-check fields on both user and company payloads so configured methods no longer show as not set.
2026-02-23: Updated invoice editor /api/auth/me fetch to use cache:'no-store' so payment method changes in settings appear immediately in live invoice preview.
2026-02-23: Reordered invoice payment method display so Venmo appears first in PDF payment columns, live invoice preview columns, and invoice email payment options.
2026-02-23: Removed the 'Live preview' title label from the document preview header while keeping the preview guidance text and content unchanged.
2026-02-23: Fixed invoice live preview date shift by parsing issue/due/valid-until as local calendar dates instead of UTC date-only parsing, preventing previous-day display in US time zones.
2026-02-23: Removed the 'Title:' prefix from the document preview metadata so the preview shows only the title value.
2026-02-23: Added company logo rendering in document live preview header above company name by mapping preview company.logoUrl into DocumentHeader's logo prop.
2026-02-23: Fixed live preview logo rendering by using a direct img tag in DocumentHeader for company logos so external logo URLs display reliably above company name.
2026-02-23: Fixed missing preview logo data by adding company.logoUrl to /api/auth/me so invoice live preview can render the company logo from user company settings.
2026-02-23: Added free-plan preview branding so 'Powered by ClientWave' now appears directly under 'Thank you for your business!' in the live document preview footer.
2026-02-23: Moved invoice creator action buttons (Save Draft/Save & Send) below the form+preview area so controls now appear beneath the preview section.
2026-02-23: Switched invoice/recurring creator preview to render InvoicePDF inside PDFViewer so live preview matches the emailed PDF attachment component output.
2026-02-23: Aligned invoice email attachment PDF payment rendering with live preview rules by using company-first payment/contact fields (with user fallback), always showing the Venmo/Zelle/Check three-card row, and keeping Pay Invoice on its own line only when Stripe is configured.
2026-02-23: Reverted invoice creator preview back to inline DocumentPreview (removed PDFViewer-based preview) so the editor no longer triggers browser PDF download behavior.
2026-02-23: Added invoice number to invoice live preview header by passing existing invoiceNumber into DocumentPreview for edit mode invoices.
2026-02-23: Updated invoice live preview to always display an Invoice # line in invoice mode, using "Auto-assigned on save" for new unsaved invoices and real numbers for existing invoices.
2026-02-23: Fixed invoice preview header number rendering by passing DocumentPreview.documentNumber through to DocumentHeader instead of hardcoding undefined.
2026-02-23: Added shared invoice presentation utility (src/lib/invoice-presentation.ts) and wired DocumentEditor preview + InvoicePDF to use the same payment-method mapping/no-method fallback logic for closer preview/PDF parity.
2026-02-23: Suppressed "Official PDF" email links when pdfUrl is a mock placeholder (mock-cloudinary-url.com) or invalid, preventing broken permanent PDF links in invoice/proposal/contract emails.
2026-02-23: Reworked InvoicePDF visual layout to closely match live preview branding/structure (logo+company block, invoice metadata block, Bill To card, gray header table, totals section, payment cards, and thank-you footer with free-plan branding).
2026-02-23: Updated InvoicePDF to use company primary brand color (with named-color mapping fallback) for key accents so emailed PDF branding aligns with preview theme color.
2026-02-23: Added shared phone display formatter for invoice presentation and applied it to preview/email payment contact values and PDF client phone; also adjusted InvoicePDF typography sizes upward to better match preview scale.
2026-02-23: Removed "Auto-assigned on save" invoice number placeholder from preview/PDF; invoice number line now renders only when an actual invoice number exists.
2026-02-23: Hardened Stripe Connect flow by sanitizing OAuth returnUrl cookies/redirects to relative in-app paths and aligning OAuth token exchange/env resolution to prefer STRIPE_CONNECT_SECRET_KEY with STRIPE_SECRET_KEY fallback.
2026-02-23: Updated /api/payments/account-link so default connect mode uses Stripe Express account links (no Standard OAuth dependency), while advanced standard mode still uses OAuth callback; also auto-persists account IDs and attempts managed webhook registration for express accounts.
2026-02-23: Improved Stripe connect error UX by parsing JSON error payloads in CompanySettings and normalizing loss-responsibility platform-profile errors in /api/payments/account-link responses.
2026-02-23: Fixed resource creation/acknowledgment persistence by writing Resource text-backed fields as serialized arrays (visibleToRoles/visibleToPositions/acknowledgedBy), using companyId direct create, parsing visibleToPositions for UI, and replacing acknowledgedBy push with parse+append+stringify update.
2026-02-23: Added Stripe webhook retry endpoint (/api/payments/webhook-sync) and Business Settings action (Retry / Generate Webhook Secret) to re-attempt webhook creation/signing-secret persistence after connect onboarding.
2026-02-23: Updated Business Settings Stripe connected banner to display the currently linked Stripe account ID (acct_...) for quick verification.
2026-02-23: Added Stripe connected-account webhook restriction fallback: webhook endpoint creation permission errors now degrade to platform webhook/manual-pending handling, and webhook verification can fall back to platform secret when account-specific secret is absent in platform-managed mode.
2026-02-23: Simplified Stripe settings UI: when Stripe is connected, only Disconnect is shown; advanced Standard connect is now a distinct secondary button shown only before connection, and retry/generate webhook action was removed from this panel to reduce confusion.
2026-02-23: Gated Stripe manual Standard instructions behind an explicit Advanced options toggle in Company Settings; advanced panel now contains the Standard connect action plus optional manual steps and stays hidden during default flow.
2026-02-23: Fixed Google Calendar OAuth URL defaults by resolving app base URL from envs with production fallback to https://www.clientwave.app, eliminating localhost callback/webhook defaults in production.
2026-02-26: Added shared app URL resolver and replaced remaining localhost hard-fallbacks in billing checkout, invoice pay session links, invite confirm links, magic-login emails, booking public-link generation, lead-convert redirects, and logout fallback so production defaults to https://www.clientwave.app unless env base URL is configured.
2026-02-26: Temporarily hard-forced Google Calendar OAuth callback + webhook base URL to https://www.clientwave.app in src/lib/google-calendar.ts (removed env/local fallback) to stop localhost callback redirects during connect flow.
2026-02-26: Updated Google Calendar connected-state UI in settings: added explicit "Connected" label next to the green check icon and moved the Disconnect button directly underneath that status indicator.
2026-02-26: Matched Google Calendar connected badge styling to Stripe's emerald connected status treatment for consistent integrations UI.
2026-02-26: Renamed dashboard navigation label from "Schedule" to "Scheduling" and moved Public booking link + Embed booking scheduler into a dedicated top "Share & Embed" section on the Scheduling page.
2026-02-26: Added a copy button to the public booking link block in SchedulingForm so booking-link sharing matches embed-snippet copy behavior.
2026-02-26: Added Scheduling share/embed availability gate: top "Share & Embed" section now appears greyed/disabled with actions blocked until at least one active availability day is configured and saved.
2026-02-26: Removed the decorative Google icon from the Google Calendar Sync card header while keeping existing connected-state and action controls.
2026-02-26: Moved Scheduling "Share & Embed" back below the availability form, enabled it live when any day is selected (including unsaved picks), and added an availability-slots accordion summary in that section.
2026-02-26: Fixed auth-page Google fallback CTA double-outline appearance by removing the inner button border in AuthPageClient so only a single rounded border treatment is visible.
2026-02-26: Suppressed the dev DB health success banner in DevDbHealthBanner (no more "Dev DB check OK / Source: DATABASE_URL" display); banner now only appears for loading/failure states in development.
2026-02-26: Improved auth page readability/contrast in AuthPageClient by styling primary actions with brand background + white text, adding a clearer OR divider, making login/register mode pills use a strong selected state, and placing the form in a subtle bordered panel.
2026-02-26: Switched app entry flow to landing-first: `/` now renders a public landing page with CTA (dashboard if logged in, login if logged out), `/login` now hosts the current AuthPageClient form, and global AppHeader now renders for guests with a Login CTA instead of avatar/menu.
2026-02-26: Updated copy for new entry flow: landing CTA now reads "Login / Register" for guests, and guest header CTA label now reads "Dashboard" (links to /dashboard auth flow).
2026-02-26: Introduced shared button geometry classes (`btn-ui`, `btn-ui-primary`, `btn-ui-secondary`, `btn-ui-lg`) in globals.css and applied them to landing/auth/header CTAs for more uniform radius/padding; reduced overly round button corners and increased Dashboard header CTA padding.
2026-02-26: Removed the secondary "Create Account" CTA from the public landing page, leaving a single primary "Login / Register" action.
2026-02-26: Replaced the root-page first fold with a true landing hero section: bold high-contrast background, stronger value-prop copy, primary CTA, and a right-side dashboard-style mock panel for visual product context.
2026-02-26: Iterated landing hero styling away from yellow to a cooler blue tone and moved the former login-page marketing copy into the landing first fold; simplified AuthPageClient to auth-only content and set guest header "Dashboard" CTA to route to /login.
2026-02-26: Updated InvoicePDF header to render a green "Paid" status badge beside the Invoice title when invoice status is PAID, aligning paid-state visual treatment with invoice email body.
2026-02-26: DevDbHealthBanner now stays hidden while loading and only renders on failure in development (removed the transient "Dev DB check: running..." message).
2026-02-26: Fixed a visible seam between fixed header border and landing hero by slightly overlapping the root landing background container at the top edge (`-mt-px pt-px`) in src/app/page.tsx.
2026-02-26: Updated AppHeader visibility so the header always renders across routes, ensuring the logo is always visible in the top-left corner.
2026-02-26: Standardized AppHeader vertical alignment across auth/login and dashboard by setting a fixed inner header height (`h-[85px]`) to match the global main top offset (`pt-[85px]`).
2026-02-26: Added password visibility toggle (eye icon) to the reset-password new password field so users can show/hide input while resetting credentials.
2026-02-26: Updated AuthPageClient outer shell/background to match reset-password visual framing (same gradient backdrop direction and frosted card container style) for consistent auth-page look.
2026-02-26: Added post-Stripe-connect auto-scroll in both company/profile settings forms by attaching refs to the Stripe section and calling smooth `scrollIntoView` when `stripe-connected` message payload is received.
2026-02-26: Updated invoice creator live preview payment methods so the "Mail & Issue Check To" card now includes the same small "Preview" badge style used in Settings payment details.
2026-02-26: Improved password-reset browser password-manager detection by adding email hint in reset links plus reset-form autofill semantics (`username` + `new-password`) so supported browsers can offer updating stored credentials after reset.
2026-02-26: Updated AppHeader to always show the `Dashboard` button; it now routes to `/login` when logged out and `/dashboard` when authenticated.
2026-02-26: Corrected invoice preview badge placement by moving the "Preview" badge above the main invoice preview (not the check card), and renamed the payment card label from "Mail & Issue Check To" back to "Check".
2026-02-26: Removed the invoice preview helper sentence "This is how your invoice will appear to clients." from the preview header area.
2026-02-26: Fixed settings save flow for CompanySettings: saving changes in Settings no longer redirects to `/dashboard`; only onboarding uses the save callback to advance to the next onboarding step.
2026-02-26: Updated invoice live preview payment cards to hide unset methods; Venmo/Zelle/Check cards now render only when configured, while keeping the no-method fallback message when none are available.
2026-02-26: Updated the invoice live preview badge text from "Preview" to "Invoice Preview".
2026-02-26: Hardened Stripe webhook payment persistence: webhook route now validates against a fallback chain of known signing secrets (platform + stored account secrets), and `payment_intent.succeeded` can create a fallback `Payment` row from `invoiceId` metadata if no pre-existing payment row is found.
2026-02-26: Updated auth screens to match landing background: both `AuthPageClient` and `reset-password` now use the same light-blue page background (`#d8e6f2`) instead of the previous dark gradient.
2026-02-26: Removed the invoice "Unmark Paid" UI action by making `MarkInvoicePaidButton` mark-only and returning no action for already-paid invoices; refund remains the reversal path.
2026-02-26: Hid `Issue Refund` actions for unpaid invoices in invoice list/detail views; refund UI now only appears for `PAID` and `PARTIALLY_REFUNDED` statuses.
2026-02-26: Updated invoice list/table `Mark Paid` control (link variant) to render with button styling for clearer action affordance.
2026-02-26: Updated `RefundInvoiceButton` trigger to render as a button-style control (instead of text-link style) while keeping the same refund panel behavior.
2026-02-26: Normalized invoice action button typography: `Mark Paid` now renders in all-caps with consistent tracking, and `Issue refund` trigger was made slightly more compact to match action-row sizing.
2026-02-26: Matched `Issue refund` button colors to `Mark Paid` action styling (brand border/text/hover palette) for consistent invoice action buttons.
2026-02-26: Updated invoice list status badge styling so `UNPAID` now uses a light red badge (`bg-rose-100 text-rose-700`) instead of brand-blue styling.
2026-02-26: Expanded invoice list status badge mapping to explicitly show `Refunded` and `Partially Refunded` labels/colors (plus clearer labels/colors for `Partially Paid`, `Overdue`, `Open`, and `Draft`) in the status column.
2026-02-26: Fixed Stripe webhook build typing by making `listStripeWebhookSecrets()` explicitly return `Promise<string[]>` with a string guard, resolving `unknown` type flow into `pushSecret` in `/api/stripe/webhook`.
2026-02-26: Fixed public "Download Official PDF" links to ignore mock/invalid Cloudinary URLs in `src/app/p/[slug]/view/page.tsx`; when `pdfUrl` is unusable, UI now falls back to generated PDF routes instead of opening mock URLs.
2026-02-26: Updated refund form `Submit refund` button in `RefundInvoiceButton` from rose styling to brand primary (`bg-brand-primary-600` / hover `bg-brand-primary-700`) to match site branding.
2026-02-26: Converted invoice `Issue refund` interaction from inline expand panel to centered modal popout overlay in `RefundInvoiceButton`, matching the Add Client modal interaction pattern used in invoice editor.
2026-02-26: Aligned invoice preview and email/PDF payment presentation: both now use a compact `Pay Invoice` button treatment (instead of long raw URL text), PDF now hides unset Venmo/Zelle/Check cards to match preview logic, and check-card visibility filters out blank address lines.
2026-02-26: Updated invoice preview and PDF pay button label text to `Click Here to Pay Invoice Online` for consistent CTA copy.
2026-02-26: Updated `InvoicePDF` pagination behavior so unpaid invoices always place the Payment Methods section on page 2, with page 1 showing "View next page for payment methods." to prevent long item tables from splitting payment content awkwardly.
2026-02-26: Added checkout save-card copy context in `CheckoutForm`: invoice flows now show "Save card for future payments," while recurring/subscription flows show "Save card for automatic recurring payments."
2026-02-26: Updated landing hero on `/` by removing the top `ClientWave` badge above the headline while keeping the `30 Day Pro Trial` badge next to the primary CTA row.
2026-02-26: Updated landing hero feature-list copy on `/`: replaced `Installable PWA (works like native app)` with `Installable Web App` and standardized feature items to title-style capitalization.
2026-02-26: Updated landing hero feature section to a bulleted checklist with green checkmarks and expanded it to include additional core product features (CRM/leads, scheduler, multi-method payments, messaging/reporting/automations).
2026-02-26: Further expanded landing hero feature checklist with additional capabilities (AI assistant, Google Calendar sync, QuickBooks integration, branding controls, client portal links, CSV exports, reminders/receipts, and role-based team access), and widened the feature list container for readability.
2026-02-26: Replaced the landing-page right-side mock dashboard panel with a real screenshot asset from `public/` (`Screenshot 2026-02-25 at 22-21-11 ClientWave - Business Management Suite.png`) using Next `Image` in `src/app/page.tsx`.
2026-02-26: Updated landing layout per requested section swap: removed feature list from top hero section, and redesigned second (white) section to place the feature checklist first (left) with a new `Why ClientWave?` content block on the right.
2026-02-26: Expanded `/` into a full multi-section landing experience inspired by the reference screenshot, including: hero with real screenshot, `Why ClientWave` feature/value section, dark feature-band, audience/use-case grid, founder-story split section, strong CTA section, and a structured footer with product/company/resources links.
2026-02-26: Added persistent execution-tracker system: created `docs/TODO.md`, `docs/DECISIONS.md`, and `docs/QA-CHECKLIST.md`, and updated `AGENTS.md` with a mandatory end-of-task tracker update rule for session continuity.
2026-02-26: Added Stripe Webhook Health panel in Business Settings Stripe section with mode/status/error/account/endpoint visibility and a `Retry Webhook Sync` action wired to `/api/payments/webhook-sync`; threaded `stripeWebhookMode` through settings props.
2026-02-26: Updated global header behavior: `Dashboard` CTA now hides when authenticated and appears in the user dropdown; dropdown actions in `AppHeader` now use normalized shared button styles for consistent sizing/spacing/colors.
2026-02-26: Added client-context invoice creation flow: `New invoice` links on client detail page now pass `clientId` query param, and invoice create page preloads that client into the editor dropdown when `clientId` is present.
2026-02-26: Temporarily allowed editing paid invoices by removing `PAID` edit-link disabling in invoice list mobile/desktop views (`/dashboard/invoices` now always links to `/dashboard/invoices/new?edit=<id>`).
2026-02-26: Fixed paid-date display mismatch on invoice list: `InvoicePaidDateEditor` in `/dashboard/invoices` now initializes from `invoice.paidAt` (not `invoice.updatedAt`), matching reporting date logic.
2026-02-26: Consolidated invoice list status/payout display by removing separate `Paid Date` column; status now includes secondary text (`Paid on <date>` for paid, `Sent: <count>` or `Not Sent` for unpaid).
2026-02-26: Replaced dark gradient + animated-dot backgrounds on payment flows with light blue app background (`#d8e6f2`) in `/payment` and public `/p/[slug]/view`; updated invoice payment flow notices to light card styling.
2026-02-26: Restyled `CheckoutForm` to match auth page visual language (white card surfaces, neutral text, light input borders, branded primary submit button) and removed remaining translucent dark-theme checkout styling.
2026-02-26: Refactored `SubscriptionPaymentFlow` to combine the upgrade value messaging and secure checkout into one unified section with expanded feature highlights, dynamic price label, and light-theme debug panel.
2026-02-26: Updated invoice detail `PayNowButton` styling to brand token classes (`bg-brand-primary-*`) instead of hardcoded blue, so it follows workspace branding.
2026-03-03: Fixed Business Settings Stripe fee-responsibility persistence by hydrating `company.stripeFeeResponsibility` (and related Stripe status fields) in `getCurrentUser()` company select so saved `Client pays Stripe fees` state survives reload.
2026-03-03: Restored ACH checkout availability by showing Card/ACH selector tabs whenever multiple payment methods are available in `InvoicePaymentFlow` (removed env gating that could hide ACH selection).
2026-03-03: Forced invoice checkout config fetch to `cache: 'no-store'` so Card/ACH toggles in Business Settings apply immediately and do not appear stuck due to stale cached payment config.
2026-03-03: Updated checkout method behavior so Card/ACH tabs are explicit with ACH default selection, while non-pass-through checkouts keep all enabled methods available in Payment Element; method-specific intent locking remains for client-paid fee accuracy.
2026-03-03: Switched explicit checkout tab default back to Card (instead of ACH) in `InvoicePaymentFlow` while keeping both tabs visible when both methods are enabled.
2026-03-03: Updated checkout tab button labels from `Card` to `Credit Card` and from `Bank (ACH)` to `Bank Transfer (ACH)` for clearer payer-facing copy.
2026-03-04: Updated invoice Pay Online button styling in both PDF and email outputs to remove link underline and add top spacing above the CTA for cleaner payment-section layout.
2026-03-04: Added conditional processing-fee notice under Pay Invoice Online in both invoice email content and InvoicePDF when `Client pays Stripe fees` is enabled, showing Credit Card and ACH fee rules from configured fee settings.
2026-03-04: Added Venmo QR rendering to invoice email payment options when a Venmo handle is configured, using the same QR-service pattern as invoice presentation flows.
2026-03-04: Enforced service-only Stripe refunds (processing fees non-refundable) by capping refundable amount server-side, exposing refund policy/refundable service fields via invoice API, and showing policy copy in the refund modal.
2026-03-04: Updated checkout subtitle under `Secure Checkout` to a fixed message: `Pay securely by card or Bank Transfer.`
2026-03-04: Removed redundant unpaid send-counter line in desktop invoices table status cell; unpaid badge now remains the single sent-count indicator.
2026-03-04: Removed the sent-counter reset UI/API; `sentCount` remains lifetime history and next step is to split `Resend` vs `Send Reminder` actions for clearer intent.
2026-03-04: Implemented resend modal flow: single resend icon now prompts `Send as Original` vs `Send as Reminder`, and `/api/invoices/[id]/resend` now supports mode-aware POST/GET handling with company-aware owner/admin/superadmin authorization.
2026-03-04: Restyled the resend/email trigger to match invoice action icon sizing (`p-2`) with green border/background so it aligns visually with other action buttons.
2026-03-04: Unified settings form submit labels to 'Save' across Profile, Business Settings, and Scheduling (including onboarding), and made the Profile success message render green for 'Profile updated.'.
2026-03-04: Moved the Profile settings email field/edit toggle above Position/Title so contact identity fields appear before role selection.
2026-03-04: Fixed payment checkout config/intent seller Stripe credential resolution by falling back to company-level stripePublishableKey/stripeAccountId when user-level fields are empty, preventing false 'publishable key not configured' errors while Stripe shows connected in settings.
2026-03-04: Switched Stripe credential resolution to company-only (no user-field fallback) across payments config/create-intent, Stripe dashboard/account-link/webhook-sync flows, invoice pay/refund routes, recurring payment-method storage, and invoice email/preview payment-method rendering.
2026-03-04: Fixed invoice email body branding mismatch by using company-first displayCompanyName (company.name -> companyName -> user.name) for From line, footer, and invoice email subject to match PDF company naming.
2026-03-04: Fixed brand color hydration by adding company.primaryColor to auth session company select and /api/auth/me payload, so Settings theme color picker and dashboard/theme consumers persist correctly after reload.
2026-03-04: Added company primaryColor CSS-variable injection on public client portal and public invoice/proposal view pages so brand-primary classes render business color without relying on logged-in session theme hydration.
2026-03-04: Expanded client portal Dashboard tab from a sparse welcome block into actionable content with invoice KPIs (open/outstanding/overdue/paid), next-due card with Pay now CTA, and recent invoice activity; also wired tabs to reuse invoicesContent.
2026-03-04: Completed client-portal pass in /client/[token]: upgraded Dashboard with KPI/next-due/activity and added real quick-action CTA strips across Dashboard, Invoices, Proposals, Payments, and Documents tabs, replacing placeholder links with live invoice/payment/mail actions.
2026-03-04: Locked invoice client selection in edit mode and enforced API-side client immutability with a 400 response for reassignment attempts.
2026-03-04: Updated invoice email CTA to branded 'View Public Portal' button and added matching portal CTA on invoice PDF payment page when portal link is available.
2026-03-04: Changed overdue evaluation to day-based logic so invoices due today are not overdue until the next calendar day, and aligned reminders/client-portal overdue counts to the same rule.
2026-03-04: Added a global floating Download App button next to the floating Chat button across pages, matched visual style, and removed duplicate install buttons from auth and dashboard pages.
2026-03-04: Fixed email-change verification 404 by sending path-based links (/settings/email/verify/{token}) and added a legacy query-token redirect handler for old links.
2026-03-04: Hardened auth error UX/security by mapping login/register/google failures to friendly public messages in AuthPageClient and removing sensitive error detail leakage from login/google auth API responses.
2026-03-04: Updated user-menu guest CTA label in AppHeader from 'Dashboard' to 'Login / Register' (still routes to /login); authenticated users continue to see 'Dashboard'.
2026-03-04: Updated Google Calendar OAuth callback redirects to /dashboard/settings?tab=availability (success/cancel/error) so Settings opens directly on Availability after sync.
2026-03-04: Moved Google Calendar Disconnect button under the connected-status text in Settings Availability tab and kept the Connected badge on the right.
2026-03-04: Hid the public booking intro header block after confirmation by toggling a shared ooking-request-header element when BookingFormClient status becomes success.
2026-03-04: Set client-facing invoice/proposal email Reply-To to company email first (fallback user email) by adding resolveReplyToEmail in lib/email.ts and applying it to outbound sends.
2026-03-04: Hardened Scheduling appointments table by re-fetching admin bookings from API on mount and after cancel/delete/reschedule actions, with deterministic start-time ascending sort to avoid stale/missing row confusion.
2026-03-04: Replaced home dashboard AppointmentsSection with OwnerBookingsTableClient to match Scheduling actions (reschedule/cancel/delete) and reuse the same booking action column behavior.
2026-03-04: Added shared AppointmentScheduleTable export and switched both home dashboard and scheduling page to consume it, plus aligned heading text to 'Appointment Schedule'.
2026-03-04: Updated invoices action icons so resend/email button matches white branded icon style and delete action now uses Trash2 instead of X.
2026-03-04: Updated invoice checkout payment-method tab styling to remove the white seam between Credit Card and Bank Transfer buttons by making the segmented control center join flush.
2026-03-04: Updated invoice email CTAs so Access Client Portal appears in the payment CTA row (to the right of Pay Invoice Online when available), removed the old footer portal button, and kept Pay Invoice Online conditional on Stripe online payments.
2026-03-04: Updated invoice detail Pay action to support both workflows: added Copy Payment Link (to /payment?seller=...&invoice=...) for easy sharing and kept Stripe Checkout as an explicit Backup Pay button.
2026-03-04: Renamed invoice detail backup payment button text from amount-based copy to `View Payment Link` with loading text `Opening payment...`.
2026-03-04: Updated invoice email fee notice lead-in copy to `Online processing fees apply:` for clearer payer-facing wording.
2026-03-04: Prefer targeted verification for small copy/style-only changes; avoid full builds unless requested or when touching higher-risk logic/API/payment paths.
2026-03-04: Adjusted invoice PDF header branding: company name is now smaller bold black text (no brand color override), and logo container/image are forced left-aligned to reduce perceived indent.
2026-03-04: Standardized Appointment Schedule heading style in shared OwnerBookingsTableClient to match other dashboard section headers (small uppercase brand heading) on both Home and Scheduling pages.
2026-03-04: Updated sendInvoiceEmail recipient logic to remove default admin additional recipient; invoice emails now send to client only, while keeping the separate sender copy email behavior.
2026-03-04: Moved invoice email copy-notice banner ("Copy of the invoice that was sent to the client.") to the top of the email template above the header block.
2026-03-04: Removed left-offset spacing from invoice email payment CTA row by switching table border-spacing to 0 and applying right-only spacing between Pay Invoice Online and Access Client Portal buttons.
2026-03-04: Switched invoice sender-copy behavior from a second standalone copy email to BCC on the primary invoice send (client in To, sender in BCC when different) to guarantee layout parity and reduce duplicate sends.
2026-03-04: Standardized processing-fee copy across invoice email and PDF to multiline labeled format (Credit Card / Bank Transfer ACH), and trimmed trailing zeros in percentage formatting (e.g., 2.9%, 0.8%).
2026-03-04: Removed Bank Details block from public invoice view by no longer passing bankDetails into PaymentTermsFooter on /p/[slug]/view; mail-check info still appears only in the dedicated Payment Methods section.
2026-03-04: Invoice preview now suppresses Payment Terms in footer/meta (due date remains in header), always shows a Notes section with fallback text when empty, uses larger invoice-logo sizing in DocumentHeader, and InvoicePDF no longer prints "View next page for payment methods." on page 1.
2026-03-04: Further tightened InvoicePDF logo alignment by setting objectPosition to left-center and increasing logo render box size to reduce perceived left indent in emailed PDF attachments.
2026-03-04: Added top-priority TODO item to focus the next 90 days on distribution, retention, and pricing/positioning before adding more features.
2026-03-04: Updated single invoice detail page to remove the Messages section entirely and reordered cards so Notes renders above Payments.
2026-03-04: Updated shared AppointmentScheduleTable header to match dashboard branded section bars (full-width brand background with large white uppercase title), applying to both Home and Scheduling pages via OwnerBookingsTableClient reuse.
2026-03-04: Hardened SwitchBackButton visibility by introducing an explicit impersonation marker cookie set during admin impersonation and cleared on switch-back; button now requires both session_token_backup and impersonating_session=1 to render.
2026-03-04: Moved SwitchBackButton into the global floating action row (left of Chat), matched it to floating button styling, and removed the old dashboard-only Switch Back render.
2026-03-04: Updated onboarding step transitions so saving Profile/Business auto-scrolls to top when advancing to the next step in OnboardingWizard.
2026-03-04: Fixed CSV import guardrails by assigning imported leads to the current user (so they appear in My Leads) and rejecting lead-template uploads in client import with a clear redirect message.
2026-03-04: Eliminated sidebar permission-jump by removing client-side /api/me role fetch from DashboardSidebar and passing server-resolved role/profile into DashboardShell from dashboard/team/owner/recurring layouts.
2026-03-04: Updated booking confirmation slot label formatting to show timezone names once per context (viewer timezone always, host timezone only when different) and removed repeated GMT suffixes on start/end times.
2026-03-04: Switched Scheduling page embed snippet generation from slug-based `data-slug` to stable `data-user-id` via shared getEmbedSnippet(), aligning embed behavior with Settings/Onboarding.
2026-03-04: Reordered Scheduling page sections to surface setup first (Booking Settings/Share & Embed, Google Calendar Sync, then Appointment Schedule) and updated major scheduling section headers to the same branded banner style as Appointment Schedule.
