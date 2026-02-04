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
