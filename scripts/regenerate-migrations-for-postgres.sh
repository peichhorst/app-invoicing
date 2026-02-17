#!/bin/bash
# Script to regenerate Prisma migrations for PostgreSQL

set -e

echo "🔍 Checking current migration status..."
npx prisma migrate status || true

echo ""
echo "⚠️  WARNING: This will reset your migration history!"
echo "   - Local dev database will be reset"
echo "   - Production database should be backed up first"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📦 Backing up current migrations..."
mv prisma/migrations prisma/migrations.backup-$(date +%Y%m%d-%H%M%S) || true

echo ""
echo "🗑️  Resetting local dev database..."
npx prisma migrate reset --force --skip-seed || true

echo ""
echo "🚀 Creating fresh PostgreSQL migration..."
npx prisma migrate dev --name init_postgresql

echo ""
echo "✅ Done! New migrations created."
echo ""
echo "📋 Next steps:"
echo "1. Review the new migration SQL in prisma/migrations/"
echo "2. Deploy to production: npx prisma migrate deploy"
echo "   OR use: npx prisma db push (if migration system is broken)"
