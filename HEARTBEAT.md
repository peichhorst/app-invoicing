# HEARTBEAT.md — Periodic Checks

# If this file is empty (or contains only comments),
# do NOT perform heartbeat checks.
# Simply reply: HEARTBEAT_OK

# Add short, explicit tasks below to enable heartbeats.
# Keep this list small to limit noise and token usage.

# Rules:
# - Heartbeats are lightweight checks, not deep work
# - Do not infer tasks that are not written here
# - Do not repeat work already done recently
# - Do not act externally without confirmation
# - Surface only new, relevant information

# Example tasks (commented out):
# - Check email for urgent messages
# - Look ahead 24h in calendar for conflicts
# - Check for mentions or replies
# - Weather check if travel or outdoor plans exist

# Output rules:
# - If nothing requires attention → reply HEARTBEAT_OK
# - If something matters → summarize briefly and stop

## Heartbeat Tasks
- Track Node.js build runs: whenever a build command (for example `pnpm build` or `npm run build`) succeeds, append an entry to the Build Run Log. If a build fails, record the failure here and note status `DEGRADED`.

## Build Run Log
- 2026-02-03 | setup | pending | Initialized log format.
- 2026-02-03 | npm run build | DEGRADED | Next.js type check failed: PrismaWrapper missing prisma.product in src/app/api/admin/products/[id]/route.ts.
- 2026-02-03 | npm run build | DEGRADED | Next.js type check failed: SubscriptionService status 'OPEN' not assignable to InvoiceStatus.
- 2026-02-03 | npm run build | OK | Build succeeded after aligning InvoiceStatus enum and Decimal conversions.
- 2026-02-04 | pnpm run build | DEGRADED | Build timed out after 124s.
