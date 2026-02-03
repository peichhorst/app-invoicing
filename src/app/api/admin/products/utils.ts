import type { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@prisma/client';

export const ADMIN_ROLES = new Set(['ADMIN', 'OWNER', 'SUPERADMIN']);

export async function generateUniqueProductSlug(
  prisma: PrismaClient,
  baseSlug: string,
  excludeId?: string
) {
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

export async function requireAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    return null;
  }
  return user;
}
