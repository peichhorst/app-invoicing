// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create the pool with your DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,  // ← This is the v7 requirement for "client" engine
    log: process.env.NODE_ENV === 'development' ? ['query', 'info'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;