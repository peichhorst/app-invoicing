# Decisions

## 2026-02-26 - Add persistent execution tracker files
- Decision: Introduce `docs/TODO.md`, `docs/DECISIONS.md`, `docs/QA-CHECKLIST.md`, and enforce updates via `AGENTS.md`.
- Why: Session continuity was inconsistent after window/session changes.
- Impact:
  - Better handoff reliability between sessions.
  - Clear source of truth for priorities, QA state, and rationale.
- Follow-up:
  - Keep entries short and date-stamped.
  - Update these files at the end of builder tasks.

## 2026-03-04 - Refund policy excludes Stripe processing fees
- Decision: Enforce service-only refunds in invoice refund API/UI; processing fees are non-refundable.
- Why: Checkout now supports fee pass-through and refunds must preserve fee policy consistency.
- Impact:
  - Refund modal displays the non-refundable fee policy.
  - API caps refundable amount at service paid (`min(invoice.amountPaid, invoice.total) - amountRefunded`).
  - Prevents fee-inclusive fallback captures from inflating refundable balances.

## 2026-03-04 - Invoice client becomes immutable after creation
- Decision: Prevent editing an invoice's `clientId` after initial creation.
- Why: Existing edit API already treated client as immutable, but the UI still allowed changes that silently did not persist.
- Impact:
  - Edit form now locks client selection and shows helper copy explaining why.
  - API now returns a 400 error if a tampered update attempts client reassignment.
  - Removes mismatch between visible form state and saved invoice data.

## 2026-03-06 - Normalize active unpaid invoice status to `OPEN`
- Decision: Use `OPEN` as the canonical active unpaid invoice status across create/send/resend/proposal-complete flows.
- Why: `UNPAID` and `OPEN` were both used for the same business meaning, causing filter and UI inconsistencies.
- Impact:
  - Invoice write paths now set `OPEN` (not `UNPAID`) for active unpaid.
  - Legacy `UNPAID` is still read-compatible during transition.
  - Added DB migration to convert historical `UNPAID` rows to `OPEN`.
  - Invoice list/filter/export now include `OPEN` in unpaid/sent buckets.

## 2026-03-06 - Protect payment/reporting history by voiding invoice deletes
- Decision: Restrict hard-delete to draft invoices with no payments; otherwise transition invoice to `VOID`.
- Why: Hard-deleting sent/paid invoices cascades payment row deletion and corrupts reporting/audit history.
- Impact:
  - Non-draft or payment-linked invoices are now preserved with `VOID` status.
  - Draft-only cleanup remains available via hard delete for non-billed work.
  - UI delete confirmation now explains delete vs void behavior.
