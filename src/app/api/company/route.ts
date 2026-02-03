import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { normalizeStateValue as normalizeStateValueFromLib } from '@/lib/states';

type CompanyPayload = {
  name?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  userName?: string | null;
  userPositionName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  stripeAccountId?: string | null;
  stripePublishableKey?: string | null;
  venmoHandle?: string | null;
  zelleHandle?: string | null;
  mailToAddressEnabled?: boolean | null;
  mailToAddressTo?: string | null;
  trackdriveLeadToken?: string | null;
  trackdriveLeadEnabled?: boolean | null;
  completeOnboarding?: boolean;
  primaryColor?: string | null;
  useHeaderLogo?: boolean | null;
  isWhiteLabelEligible?: boolean | null;
  industry?: string | null;
  stripeWebhookSecret?: string | null;
};

const sanitizeWebsite = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const sanitizeText = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const companyId = user.companyId;
  if (!companyId) {
    return NextResponse.json({ company: null });
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  return NextResponse.json({ company });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only owners, admins, or superadmins may update the company name' }, { status: 403 });
  }
  let companyId = user.companyId;
  if (!companyId) {
    // leave until we know body
  }

  let body: CompanyPayload;
  try {
    body = (await request.json()) as CompanyPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  let name = body.name?.trim() || user.companyName?.trim();
  if (!companyId) {
    if (!name) {
      return NextResponse.json({ error: 'Company name is required to create your workspace' }, { status: 400 });
    }
    const createdCompany = await prisma.company.create({
      data: {
        name,
        ownerId: user.id,
      },
    });
    companyId = createdCompany.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: createdCompany.id },
    });
  }
  if (!companyId) {
    return NextResponse.json({ error: 'Owner does not belong to a company' }, { status: 404 });
  }


  const existing = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const sanitizedStripeAccountId = body.stripeAccountId === undefined ? undefined : sanitizeText(body.stripeAccountId);
  const wantsWebhookSecretUpdate = body.stripeWebhookSecret !== undefined;
  const sanitizedStripeWebhookSecret = wantsWebhookSecretUpdate ? sanitizeText(body.stripeWebhookSecret) : undefined;
  const accountIdForWebhookSecret =
    body.stripeAccountId !== undefined ? (sanitizedStripeAccountId ?? null) : existing.stripeAccountId ?? null;

  if (wantsWebhookSecretUpdate) {
    if (!accountIdForWebhookSecret) {
      return NextResponse.json(
        { error: 'Add or keep a Stripe account ID before saving the webhook signing secret.' },
        { status: 400 },
      );
    }
    if (!sanitizedStripeWebhookSecret) {
      return NextResponse.json(
        { error: 'Webhook signing secret cannot be empty. Paste the secret starting with whsec_ from Stripe.' },
        { status: 400 },
      );
    }
  }

  const normalizedName = name ?? existing.name;
  if (!normalizedName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }
  const data: Prisma.CompanyUpdateInput = {
    name: normalizedName.trim(),
  };

  // Now it's safe to access body
  if (body.primaryColor !== undefined) {
    // DB column is non-nullable, so use empty string to represent "cleared"
    if (body.primaryColor === null) {
      data.primaryColor = '';
    } else {
      const sanitized = sanitizeText(body.primaryColor);
      if (sanitized !== null) {
        data.primaryColor = sanitized;
      }
    }
  }

  const canUpdateWebsite = user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  if (!canUpdateWebsite && body.websiteUrl !== undefined) {
    return NextResponse.json(
      { error: 'Only owners, admins, or superadmins may update the website' },
      { status: 403 },
    );
  }

  if (canUpdateWebsite && body.websiteUrl !== undefined) {
    data.website = sanitizeWebsite(body.websiteUrl);
  }
  if (body.logoUrl !== undefined) {
    data.logoUrl = sanitizeWebsite(body.logoUrl);
  }
  if (body.phone !== undefined) {
    data.phone = sanitizeText(body.phone);
  }
  if (body.email !== undefined) {
    data.email = sanitizeText(body.email);
  }
  if (body.addressLine1 !== undefined) {
    data.addressLine1 = sanitizeText(body.addressLine1);
  }
  if (body.addressLine2 !== undefined) {
    data.addressLine2 = sanitizeText(body.addressLine2);
  }
  if (body.city !== undefined) {
    data.city = sanitizeText(body.city);
  }
  if (body.state !== undefined) {
    const stateValue = body.state === null ? undefined : body.state;
    data.state = normalizeStateValueFromLib(stateValue) || null;
  }
  if (body.postalCode !== undefined) {
    data.postalCode = sanitizeText(body.postalCode);
  }
  if (body.country !== undefined) {
    data.country = sanitizeText(body.country) ?? 'USA';
  }
  if (body.stripeAccountId !== undefined) {
    data.stripeAccountId = sanitizedStripeAccountId;
    if (!sanitizedStripeAccountId) {
      data.stripeAccountType = null;
      data.stripeWebhookMode = null;
      data.stripeWebhookStatus = null;
      data.stripeWebhookLastError = null;
    }
  }
  if (body.stripePublishableKey !== undefined) {
    data.stripePublishableKey = sanitizeText(body.stripePublishableKey);
  }
  if (body.venmoHandle !== undefined) {
    data.venmoHandle = sanitizeText(body.venmoHandle);
  }
  if (body.zelleHandle !== undefined) {
    data.zelleHandle = sanitizeText(body.zelleHandle);
  }
  if (body.mailToAddressEnabled !== undefined) {
    data.mailToAddressEnabled = Boolean(body.mailToAddressEnabled);
  }
  if (body.mailToAddressTo !== undefined) {
    data.mailToAddressTo = sanitizeText(body.mailToAddressTo);
  }
  if (body.trackdriveLeadToken !== undefined) {
    data.trackdriveLeadToken = sanitizeText(body.trackdriveLeadToken);
  }
  if (body.trackdriveLeadEnabled !== undefined) {
    data.trackdriveLeadEnabled = Boolean(body.trackdriveLeadEnabled);
  }
  if (body.useHeaderLogo !== undefined) {
    data.useHeaderLogo = Boolean(body.useHeaderLogo);
  }
  if (body.isWhiteLabelEligible !== undefined) {
    data.isWhiteLabelEligible = Boolean(body.isWhiteLabelEligible);
  }
  if (body.industry !== undefined) {
    data.industry = sanitizeText(body.industry);
  }
  if (body.completeOnboarding) {
    data.isOnboarded = true;
  }

  if (wantsWebhookSecretUpdate) {
    data.stripeWebhookMode = 'manual';
    data.stripeWebhookStatus = 'pending';
    data.stripeWebhookLastError = null;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id: companyId },
        data,
      });

      if (wantsWebhookSecretUpdate && accountIdForWebhookSecret && sanitizedStripeWebhookSecret) {
        await tx.stripeWebhookEndpoint.upsert({
          where: { accountId: accountIdForWebhookSecret },
          create: {
            accountId: accountIdForWebhookSecret,
            signingSecret: sanitizedStripeWebhookSecret,
          },
          update: {
            signingSecret: sanitizedStripeWebhookSecret,
          },
        });
      }

      const userName = body.userName === undefined ? undefined : sanitizeText(body.userName);
      if (userName) {
        await tx.user.update({
          where: { id: user.id },
          data: { name: userName },
        });
      }

      const userPositionName = sanitizeText(body.userPositionName) ?? 'Owner';
      if (userPositionName) {
        const lastPosition = await tx.position.findFirst({
          where: { companyId },
          orderBy: { order: 'desc' },
        });
        const nextOrder = (lastPosition?.order ?? 0) + 1;
        const position = await tx.position.upsert({
          where: { companyId_name: { companyId, name: userPositionName } },
          create: {
            companyId,
            name: userPositionName,
            order: nextOrder,
            isCustom: true,
          },
          update: {},
        });
        await tx.user.update({
          where: { id: user.id },
          data: {
            positionId: position.id,
            position: null,
          },
        });
      }

      return company;
    });
    return NextResponse.json({ company: updated });
  } catch (error) {
    // Print full error details for debugging
    console.error('API /api/company error:', error);
    let details = {};
    if (error && typeof error === 'object') {
      details = {
        ...(error as any),
        stack: (error as any).stack,
        code: (error as any).code,
      };
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error), details }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only superadmins may create companies' }, { status: 403 });
  }

  type CreatePayload = {
    name?: string | null;
    websiteUrl?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  try {
    const created = await prisma.company.create({
      data: {
        name,
        website: body.websiteUrl?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
      },
    });
    return NextResponse.json({ company: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create company' },
      { status: 500 },
    );
  }
}
