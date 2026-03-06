# Database Setup

This app reads runtime database connections from `DATABASE_URL` and `DIRECT_URL`. Keep the application, Prisma schema, and database migrations aligned to avoid runtime errors (for example, missing columns).

## Connection Sources

- **Runtime (all environments)**: `DATABASE_URL` first, then fallback to `DIRECT_URL`.
- **Migrations**: `DIRECT_URL` (direct Supabase connection) for reliable schema changes.

## Database Health Check

Use these quick checks when something feels out of sync.

Usage Example
```bash
# Confirm the app has runtime database URLs
printenv DIRECT_URL
printenv DATABASE_URL

# Safe migration runner (tries direct + session pooler + diagnostics + SQL fallback hints)
npm run migrate:safe

# App-level health probe (env + live SELECT 1)
curl -sS http://localhost:3000/api/health/db

# Validate connectivity
psql "$DATABASE_URL" -c "select now();"

# Verify a specific column exists (example: Contract.pdfUrl)
psql "$DATABASE_URL" -c "select column_name from information_schema.columns where table_name='Contract' and column_name='pdfUrl';"
```

If you are using a pooler URL that includes `pgbouncer` parameters, remove unsupported query params for `psql`. Keep only `sslmode` if required.

## Migration Checklist

1. Update `prisma/schema.prisma`.
2. Create a migration (`npx prisma migrate dev --name <change-name>`).
3. Apply migrations to the target environment (`npx prisma migrate deploy`).
4. Verify the schema in the database (use `information_schema.columns` checks).
5. Regenerate Prisma client if needed (`npx prisma generate`).

If a column exists in the Prisma schema but not in the database, the app will fail at runtime when Prisma queries that model.
