### Backfill Payments

Run `node scripts/backfill-payments.mjs` (or `npx ts-node scripts/backfill-payments.ts` if you prefer TypeScript) to seed manual successful payments for every invoice already marked `PAID` but lacking associated Payment records. This keeps the new Payments-based reporting accurate before automated Stripe payments are added.
