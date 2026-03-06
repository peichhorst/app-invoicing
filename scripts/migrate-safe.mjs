#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv();

const stripQuotes = (value) => {
  if (!value) return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const maskUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
};

const deriveDirectUrlFromPooler = (databaseUrl) => {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.hostname.endsWith('.pooler.supabase.com')) {
      return null;
    }
    const username = decodeURIComponent(parsed.username || '');
    const projectRef = username.startsWith('postgres.')
      ? username.slice('postgres.'.length)
      : null;
    if (!projectRef) return null;

    const direct = new URL(databaseUrl);
    direct.hostname = `db.${projectRef}.supabase.co`;
    direct.port = '5432';
    direct.searchParams.delete('pgbouncer');
    direct.searchParams.delete('connection_limit');
    direct.searchParams.delete('pool_timeout');
    direct.searchParams.delete('statement_cache_size');
    return direct.toString();
  } catch {
    return null;
  }
};

const deriveSessionPoolerUrl = (databaseUrl) => {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.hostname.endsWith('.pooler.supabase.com')) {
      return null;
    }
    const session = new URL(databaseUrl);
    session.port = '5432';
    session.searchParams.delete('pgbouncer');
    session.searchParams.delete('connection_limit');
    session.searchParams.delete('pool_timeout');
    session.searchParams.delete('statement_cache_size');
    return session.toString();
  } catch {
    return null;
  }
};

const run = (cmd, args, env) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env,
      shell: false,
    });

    let output = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });

const runResolveAllMigrations = async (env) => {
  const entries = await readdir('prisma/migrations', { withFileTypes: true });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'migration_lock.toml')
    .map((entry) => entry.name)
    .sort();

  console.log('\n[Migration Safe] Resolving legacy migration history as applied...');
  for (const migrationName of migrationNames) {
    const result = await run(
      'npx',
      ['prisma', 'migrate', 'resolve', '--applied', migrationName],
      env,
    );
    const alreadyApplied =
      result.output.includes('already recorded as applied') ||
      result.output.includes('already applied') ||
      result.output.includes('P3008');
    if (result.code !== 0 && !alreadyApplied) {
      console.error(`[Migration Safe] Failed to resolve migration: ${migrationName}`);
      return { ok: false };
    }
  }
  return { ok: true };
};

const directFromEnv = stripQuotes(process.env.DIRECT_URL);
const databaseFromEnv = stripQuotes(process.env.DATABASE_URL);
const sessionPooler = deriveSessionPoolerUrl(databaseFromEnv);
const derivedDirect = directFromEnv ? null : deriveDirectUrlFromPooler(databaseFromEnv);
const candidates = Array.from(
  new Set([directFromEnv, sessionPooler, derivedDirect].filter(Boolean)),
);

if (candidates.length === 0) {
  console.error('\n[Migration Safe] No DIRECT_URL found and unable to derive one.');
  console.error('[Migration Safe] Set DIRECT_URL to a reachable direct postgres host (port 5432).');
  process.exit(1);
}

let deploy = null;
let usedUrl = null;

for (const candidate of candidates) {
  usedUrl = candidate;
  console.log(`\n[Migration Safe] Trying migration URL: ${maskUrl(candidate)}`);
  if (candidate === sessionPooler) {
    console.log('[Migration Safe] Strategy: Supabase session pooler fallback (port 5432).');
  } else if (candidate === derivedDirect) {
    console.log('[Migration Safe] Strategy: direct host derived from pooler ref.');
  } else {
    console.log('[Migration Safe] Strategy: DIRECT_URL from environment.');
  }

  const prismaEnv = {
    ...process.env,
    DIRECT_URL: candidate,
    DATABASE_URL: candidate,
  };

  deploy = await run('npx', ['prisma', 'migrate', 'deploy'], prismaEnv);
  if (deploy.code === 0) {
    console.log('\n[Migration Safe] Migration deploy completed.');
    process.exit(0);
  }
}

const output = deploy?.output ?? '';
const networkError =
  output.includes('P1001') ||
  output.includes('ENETUNREACH') ||
  output.includes('ECONNREFUSED') ||
  output.includes('timed out') ||
  output.includes('ETIMEDOUT') ||
  output.includes('EAI_AGAIN');

const poolerPreparedStatementError =
  output.includes('prepared statement "s0" already exists') ||
  output.includes('prepared statement') && output.includes('already exists');
const legacyInvalidInitMigration =
  output.includes('P3018') &&
  output.includes('20260202031339_init') &&
  output.toLowerCase().includes('type "datetime" does not exist');
const failedMigrationMatch = output.match(/The `([^`]+)` migration started[\s\S]*failed/);
const failedMigrationName = failedMigrationMatch?.[1] ?? null;
const failedMigrationBlocked = output.includes('P3009') && !!failedMigrationName;

if ((legacyInvalidInitMigration || failedMigrationBlocked) && process.env.MIGRATE_SAFE_AUTO_RESOLVE === '1') {
  console.error(
    '\n[Migration Safe] Detected legacy SQLite-style init migration on a populated PostgreSQL database.',
  );
  if (failedMigrationBlocked && failedMigrationName) {
    console.error(`[Migration Safe] Clearing failed migration state: ${failedMigrationName}`);
    const rolledBack = await run(
      'npx',
      ['prisma', 'migrate', 'resolve', '--rolled-back', failedMigrationName],
      {
        ...process.env,
        DIRECT_URL: usedUrl,
        DATABASE_URL: usedUrl,
      },
    );
    if (rolledBack.code !== 0) {
      console.error('[Migration Safe] Failed to mark failed migration as rolled back.');
    }
  }
  const resolveResult = await runResolveAllMigrations({
    ...process.env,
    DIRECT_URL: usedUrl,
    DATABASE_URL: usedUrl,
  });
  if (resolveResult.ok) {
    console.error('[Migration Safe] Legacy migrations marked as applied. Re-running deploy...');
    const redeploy = await run(
      'npx',
      ['prisma', 'migrate', 'deploy'],
      {
        ...process.env,
        DIRECT_URL: usedUrl,
        DATABASE_URL: usedUrl,
      },
    );
    if (redeploy.code === 0) {
      console.log('\n[Migration Safe] Migration deploy completed after legacy resolve.');
      process.exit(0);
    }
    console.error('[Migration Safe] Re-run deploy still failed after resolve.');
  }
}

console.error('\n[Migration Safe] migrate deploy failed.');
if (usedUrl) {
  console.error(`[Migration Safe] Last attempted URL: ${maskUrl(usedUrl)}`);
}

if (networkError) {
  console.error(
    '[Migration Safe] Network reachability issue to direct DB. Run from a network/environment that can reach port 5432.',
  );
}

if (poolerPreparedStatementError) {
  console.error(
    '[Migration Safe] Looks like a pooled connection was used. Migrations must run against DIRECT_URL (non-pooler).',
  );
}

console.error('\n[Migration Safe] Critical SQL fallbacks (run in Supabase SQL editor if blocked):');
console.error('ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "senderRole" TEXT;');
console.error('DO $$');
console.error('BEGIN');
console.error("  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'features' AND udt_name = '_text') THEN");
console.error("    EXECUTE 'ALTER TABLE \"Product\" ALTER COLUMN \"features\" TYPE TEXT USING array_to_string(\"features\", '','')';");
console.error('  END IF;');
console.error("  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'tags' AND udt_name = '_text') THEN");
console.error("    EXECUTE 'ALTER TABLE \"Product\" ALTER COLUMN \"tags\" TYPE TEXT USING array_to_string(\"tags\", '','')';");
console.error('  END IF;');
console.error('END $$;');
console.error('\n[Migration Safe] Optional one-time legacy bootstrap (no manual SQL):');
console.error('MIGRATE_SAFE_AUTO_RESOLVE=1 npm run migrate:safe');
process.exit(deploy?.code ?? 1);
