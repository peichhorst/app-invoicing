import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDatabaseRuntimeConfig, maskDatabaseUrl } from '@/lib/database-config';

export async function GET() {
  const config = getDatabaseRuntimeConfig(process.env);
  const checkedAt = new Date().toISOString();

  if (!config.ok || !config.resolvedUrl) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt,
        source: config.source,
        resolvedUrl: maskDatabaseUrl(config.resolvedUrl),
        errors: config.errors,
        warnings: config.warnings,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        ok: true,
        checkedAt,
        source: config.source,
        resolvedUrl: maskDatabaseUrl(config.resolvedUrl),
        warnings: config.warnings,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
      {
        ok: false,
        checkedAt,
        source: config.source,
        resolvedUrl: maskDatabaseUrl(config.resolvedUrl),
        errors: ['Database connectivity check failed.'],
        warnings: config.warnings,
        detail: message,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
