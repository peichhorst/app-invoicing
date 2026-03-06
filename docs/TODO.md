# TODO

Last Updated: 2026-03-06

## 30-Day Execution Plan (Production Readiness + Launch)

### Week 1 (Days 1-7): Payment + Data Reliability
- [ ] Run and verify DB migrations in staging, then production (including invoice `UNPAID -> OPEN` normalization)  
  Owner: Eng | Status: Planned
- [ ] Execute webhook reliability pass: successful payment, partial refund, full refund, replay/retry behavior  
  Owner: Eng | Status: Planned
- [ ] Add webhook failure visibility (logs + alert channel + owner notification path)  
  Owner: Eng | Status: Planned
- [ ] Close QA checklist items for billing/status consistency  
  Owner: Eng | Status: Planned

### Week 2 (Days 8-14): Security + Release Gate QA
- [ ] Add/verify auth and payment endpoint rate-limiting and hardened public error responses  
  Owner: Eng | Status: Planned
- [ ] Validate cookie/session/security settings in production domain context  
  Owner: Eng | Status: Planned
- [ ] Run full `docs/QA-CHECKLIST.md` release-gate sweep and resolve blockers  
  Owner: Eng | Status: Planned
- [ ] Add high-value regression tests for critical flows (login, create/send/pay/refund invoice)  
  Owner: Eng | Status: Planned

### Week 3 (Days 15-21): UX Polish + Trust + Conversion
- [ ] Ensure invoice preview/email/PDF parity is fully stable across payment methods and branding  
  Owner: Eng | Status: Planned
- [ ] Add trust/proof blocks on landing (outcomes, payment trust, reliability cues)  
  Owner: Product/Design | Status: Planned
- [ ] Standardize cross-app button sizing/radius/padding tokens for visual consistency  
  Owner: Design/Frontend | Status: Planned
- [ ] Resolve any remaining dashboard/scheduling UI flicker or loading-jump issues  
  Owner: Frontend | Status: Planned

### Week 4 (Days 22-30): Launch Ops + Revenue Motion
- [ ] Stage rollout to limited cohort and monitor conversion + failure metrics daily  
  Owner: Founder/Product | Status: Planned
- [ ] Finalize support runbook (failed payments, refund disputes, OAuth issues, webhook outage)  
  Owner: Ops/Support | Status: Planned
- [ ] Lock pricing/positioning updates and publish clear ROI messaging for paid plans  
  Owner: Founder/Product | Status: Planned
- [ ] Ship 90-day growth operating cadence (acquisition, retention, pricing experiments)  
  Owner: Founder/Product | Status: Planned

### 30-Day Exit Criteria
- [ ] Billing reliability confirmed (payments/refunds/webhooks) with no P1 issues for 7 consecutive days  
  Owner: Eng | Status: Planned
- [ ] Full QA checklist pass with no unresolved release blockers  
  Owner: Eng | Status: Planned
- [ ] Launch funnel baseline tracked (signup -> first invoice -> first payment)  
  Owner: Product | Status: Planned
- [ ] Public launch decision made with go/no-go notes recorded  
  Owner: Founder | Status: Planned

## Now
- [x] Add an internal Readiness Dashboard page (`/dashboard/readiness`) that auto-computes progress from `docs/TODO.md` + `docs/QA-CHECKLIST.md` with basic visual charts  
  Owner: Eng | Status: Done
- [ ] Revenue Priority: Execute a 90-day growth plan focused on distribution (consistent customer acquisition), retention (low churn and clear ROI), and pricing/positioning (charge for value, not just access)  
  Owner: Founder/Product | Status: Planned
- [ ] Verify Stripe webhook reliability end-to-end (payment success, refund, DB status sync)  
  Owner: Eng | Status: Planned
- [ ] Ensure invoice preview and emailed PDF stay in parity for payment-method visibility and layout  
  Owner: Eng | Status: Planned

## Next
- [ ] Add trust/proof blocks to landing page (social proof, outcomes, security/payment trust cues)  
  Owner: Product/Design | Status: Backlog
- [ ] Standardize button sizing/radius/padding tokens across auth, dashboard, and billing flows  
  Owner: Design/Frontend | Status: Backlog

## Later
- [ ] Add optional Stripe-fee pass-through setting with compliance-safe labeling and auditability  
  Owner: Product/Eng | Status: Discovery
- [ ] Add “reissue invoice” lifecycle option for refunded flows (policy-dependent)  
  Owner: Product/Eng | Status: Discovery
