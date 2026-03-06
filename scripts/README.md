### Backfill Payments

Run `node scripts/backfill-payments.mjs` (or `npx ts-node scripts/backfill-payments.ts` if you prefer TypeScript) to seed manual successful payments for every invoice already marked `PAID` but lacking associated Payment records. This keeps the new Payments-based reporting accurate before automated Stripe payments are added.

### Safe Migration Runner

Run `npm run migrate:safe` to deploy migrations with direct DB preference and clearer failure diagnostics.

What it does:
- Loads `.env.local` then `.env`
- Tries migration URLs in this order:
  1. `DIRECT_URL` from env
  2. Supabase session pooler URL derived from `DATABASE_URL` (port `5432`)
  3. Direct Supabase host derived from pooler project ref
- Runs `prisma migrate deploy` against each candidate until one works
- If deploy fails, prints whether it looks like a network/pooler issue and outputs critical SQL fallback commands

One-time legacy bootstrap (for old SQLite-style migration history on PostgreSQL):
- Run `MIGRATE_SAFE_AUTO_RESOLVE=1 npm run migrate:safe`
- This marks existing migrations as applied via Prisma `migrate resolve` and re-runs deploy
