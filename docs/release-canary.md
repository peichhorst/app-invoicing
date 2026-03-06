# Canary Release Runbook

Use this runbook for production deploys while you have a small user base and no dedicated staging environment.

## Goals
- Minimize payment-risk regressions.
- Catch auth/invoice/checkout issues quickly.
- Keep rollback steps clear and executable.

## Pre-Deploy Checklist
- Confirm migrations are committed and reviewed.
- Back up production database before deploy/migration.
- Confirm env vars are present for auth, Stripe, email, and base URL.
- Confirm webhook secrets and Stripe account connection are valid.
- Confirm latest critical tests pass:
  - Unit/integration tests (`pnpm test`)
  - E2E smoke (`pnpm test:e2e`) when E2E credentials are configured

## Deploy Sequence
1. Apply database migrations.
2. Deploy application code.
3. Run immediate smoke checks (below) as admin user.
4. Release to canary users first (you + 1-2 trusted users).
5. Watch metrics/logs for 30-60 minutes before broad rollout.

## Immediate Smoke Checks
1. Auth
- Login works.
- Registration flow works (if open).
- No raw JSON/sensitive auth errors shown to users.

2. Invoices
- Create invoice.
- Save and send invoice.
- Invoice list status is correct (`Unpaid`, `Paid`, `Overdue`, etc.).

3. Payments
- Pay one invoice online.
- Verify invoice status updates to paid.
- Verify payment appears in reporting/payment activity.

4. Refunds
- Issue a refund (or partial refund) on a paid Stripe invoice.
- Verify status and refunded amount fields update correctly.

5. Scheduling
- Booking settings save.
- Appointment action buttons work (`RS`, cancel, delete).

## Monitoring Window (Canary)
- Duration: first 30-60 minutes after deploy.
- Watch for:
  - 401/403 auth spikes
  - 500 errors on invoice/payment routes
  - Stripe webhook signature or delivery failures
  - DB migration errors/timeouts

## Rollback Rules
- Roll back immediately if:
  - login is broken for normal users
  - invoice create/send fails broadly
  - payment success does not reconcile invoice state
  - webhook verification failures are sustained

## Rollback Steps
1. Revert app deployment to previous known-good version.
2. If migration was destructive, restore from backup or apply planned rollback SQL.
3. Re-run auth + invoice + payment smoke checks.
4. Post incident note in `docs/DECISIONS.md` and update `docs/QA-CHECKLIST.md`.

## Post-Deploy Sign-Off Template
- Date:
- Version/Commit:
- Migrations Applied:
- Canary Users:
- Smoke Result: Pass / Fail
- Issues Found:
- Rollback Needed: Yes / No
- Notes:
