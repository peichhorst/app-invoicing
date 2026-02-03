import { getCurrentUser } from '@/lib/auth';

export const ADMIN_ROLES = new Set(['ADMIN', 'OWNER', 'SUPERADMIN']);
type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

type ProductSlugClient = {
  product: {
    findFirst: (args: {
      where: {
        slug: string;
        NOT?: { id: string };
      };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

export async function generateUniqueProductSlug(
  prisma: ProductSlugClient,
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

export async function requireAdminUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) {
    return null;
  }
  return user;
}
