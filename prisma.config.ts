// prisma.config.ts
import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Load env files; allow .env.local to override .env defaults
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL!,
  },
});
