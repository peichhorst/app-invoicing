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
