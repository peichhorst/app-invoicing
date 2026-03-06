import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const safeUser = {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      planTier: user.planTier ?? null,
      companyId: user.companyId ?? user.company?.id ?? null,
      phone: user.phone ?? null,
      city: user.city ?? null,
      stripeAccountId: user.stripeAccountId ?? null,
      stripePublishableKey: user.stripePublishableKey ?? null,
      venmoHandle: user.venmoHandle ?? null,
      zelleHandle: user.zelleHandle ?? null,
      mailToAddressEnabled: user.mailToAddressEnabled ?? null,
      mailToAddressTo: user.mailToAddressTo ?? null,
      company: user.company
        ? {
            id: user.company.id,
            name: user.company.name ?? null,
            website: user.company.website ?? null,
            logoUrl: user.company.logoUrl ?? null,
            email: user.company.email ?? null,
            phone: user.company.phone ?? null,
            addressLine1: user.company.addressLine1 ?? null,
            addressLine2: user.company.addressLine2 ?? null,
            city: user.company.city ?? null,
            state: user.company.state ?? null,
            postalCode: user.company.postalCode ?? null,
            country: user.company.country ?? null,
            stripeAccountId: user.company.stripeAccountId ?? null,
            stripePublishableKey: user.company.stripePublishableKey ?? null,
            stripePaymentMethodCard: user.company.stripePaymentMethodCard ?? null,
            stripePaymentMethodAch: user.company.stripePaymentMethodAch ?? null,
            venmoHandle: user.company.venmoHandle ?? null,
            zelleHandle: user.company.zelleHandle ?? null,
            mailToAddressEnabled: user.company.mailToAddressEnabled ?? null,
            mailToAddressTo: user.company.mailToAddressTo ?? null,
            industry: user.company.industry ?? null,
            iconUrl: user.company.iconUrl ?? null,
            slogan: user.company.slogan ?? null,
            primaryColor: user.company.primaryColor ?? null,
            useHeaderLogo: Boolean(user.company.useHeaderLogo),
          }
        : null,
    };

    // Keep top-level keys for backward compatibility and also provide `user` envelope.
    return NextResponse.json({
      ...safeUser,
      user: safeUser,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
