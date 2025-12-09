// src/lib/shortcodes.ts
import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';
import crypto from 'crypto';

type Client = Prisma.TransactionClient | typeof prisma;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export async function generateUniqueShortCode(client: Client, length = 8, maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomCode(length);
    const exists = await client.invoice.count({ where: { shortCode: code } });
    if (exists === 0) {
      return code;
    }
  }
  // Fallback to longer code if collisions happen repeatedly
  return randomCode(length + 2);
}
