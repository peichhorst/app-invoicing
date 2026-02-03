import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getFirstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default async function PortalRedirectPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const clientId = getFirstParam(params.clientId);
  const impersonate = getFirstParam(params.impersonate);

  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) redirect('/dashboard');

  if (impersonate !== '1' || !clientId) redirect('/dashboard');

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, companyId: true, portalUser: { select: { portalToken: true } } },
  });

  if (!client) redirect('/dashboard');

  if (user.role === 'OWNER' && client.companyId !== user.companyId) {
    redirect('/dashboard');
  }

  let portalToken = client.portalUser?.portalToken;
  if (!portalToken) {
    portalToken = crypto.randomUUID().replace(/-/g, '');
    await prisma.clientPortalUser.create({
      data: { clientId: client.id, portalToken },
    });
  }

  redirect(`/client/${encodeURIComponent(portalToken)}`);
}
