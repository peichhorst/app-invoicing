import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ isAdmin: false });
  }
  const role = user.role ?? 'NOT FOUND';
  const nameParts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
  const positionCustom = user.positionCustom
    ? { id: user.positionCustom.id, name: user.positionCustom.name }
    : null;
  return NextResponse.json({
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPERADMIN',
    planTier: user.planTier,
    role,
    position: user.position ?? null,
    positionCustom,
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    firstName,
    lastName,
    companyName: user.companyName ?? null,
    company: user.company
      ? {
          id: user.company.id,
          name: user.company.name,
          website: user.company.website ?? null,
          logoUrl: user.company.logoUrl ?? null,
          useHeaderLogo: user.company.useHeaderLogo ?? null,
          iconUrl: user.company.iconUrl ?? null,
          slogan: user.company.slogan ?? null,
          industry: user.company.industry ?? null,
          hasCustomDomain: user.company.hasCustomDomain ?? false,
          isWhiteLabelEligible: user.company.isWhiteLabelEligible ?? false,
        }
      : null,
  });
}
