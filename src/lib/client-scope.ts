import type { Role } from '@prisma/client';

type UserLike = {
  id: string;
  role: Role;
  companyId: string | null;
  company?: { id: string } | null;
};

/**
 * Build a Prisma where clause for client visibility based on role.
 * Owners/Admins see all company clients. Users see only those assigned to them.
 */
export function clientVisibilityWhere(user: UserLike) {
  const companyId = user.companyId ?? user.company?.id ?? null;
  if (!companyId) {
    throw new Error('User is missing company association.');
  }

  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return { companyId };
  }

  return { companyId, assignedToId: user.id };
}
