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
