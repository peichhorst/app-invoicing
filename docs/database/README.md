# Database Setup

This app reads its runtime database connection from `DATABASE_URL`. Keep the application, Prisma schema, and database migrations aligned to avoid runtime errors (for example, missing columns).

## Connection Sources

- **Runtime**: `DATABASE_URL` (Supabase pooler URL with pgbouncer).
- **Migrations**: `DIRECT_URL` (direct Supabase connection) for reliable schema changes.

## Database Health Check

Use these quick checks when something feels out of sync.

Usage Example
```bash
# Confirm the app has a database URL at runtime
printenv DATABASE_URL

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
