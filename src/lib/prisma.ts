import { PrismaClient } from '@prisma/client';

declare global {
  // Allow global `prisma` in development to prevent multiple instances
  var prisma: PrismaClient | undefined;
}

const buildDatasourceUrl = () => {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  if (rawUrl.includes('pgbouncer=true') || rawUrl.includes('statement_cache_size=')) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('pgbouncer', 'true');
    parsed.searchParams.set('statement_cache_size', '0');
    return parsed.toString();
  } catch {
    const joiner = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${joiner}pgbouncer=true&statement_cache_size=0`;
  }
};

const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    // Disable prepared statements to avoid conflicts with pooled connections.
    datasourceUrl: buildDatasourceUrl(),
  });
};

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
