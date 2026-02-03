import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Globe } from 'lucide-react';
import LeadEnrichButton from '@/components/LeadEnrichButton';
import { formatSourceLabel } from '@/lib/format-source';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      client: true,
      assignedTo: true,
    },
  });

  if (!lead || lead.companyId !== user.companyId) {
    notFound();
  }
  const fallbackApplyLinkMatch = lead.notes?.match(/https?:\/\/[^\s'"]+/i);
  const fallbackApplyLink = fallbackApplyLinkMatch ? fallbackApplyLinkMatch[0] : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              {lead.companyName || lead.name || 'Unnamed Lead'}
            </h1>
            {(lead.companyName && lead.name) && (
              <p className="mt-1 text-lg text-zinc-600">{lead.name}</p>
            )}
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                lead.status === 'qualified'
                  ? 'bg-emerald-100 text-emerald-800'
                  : lead.status === 'contacted'
                    ? 'bg-blue-100 text-blue-800'
                    : lead.status === 'proposal_sent'
                      ? 'bg-purple-100 text-purple-800'
                      : lead.status === 'lost'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {lead.status}
            </span>
          </div>
          {lead.client && (
            <div className="rounded-lg bg-emerald-50 px-4 py-2">
              <p className="text-sm font-medium text-emerald-800">
                Converted to Client
              </p>
              <Link
                href={`/dashboard/clients`}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View Client →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">Contact Information</h2>
        <div className="mt-4 space-y-3">
          {lead.email && (
            <div className="flex items-center gap-3 text-zinc-600">
              <Mail className="h-5 w-5" />
              <a href={`mailto:${lead.email}`} className="hover:text-brand-primary-600">
                {lead.email}
              </a>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-3 text-zinc-600">
              <Phone className="h-5 w-5" />
              <a href={`tel:${lead.phone}`} className="hover:text-brand-primary-600">
                {lead.phone}
              </a>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-3 text-zinc-600">
              <Globe className="h-5 w-5" />
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-primary-600"
              >
                {lead.website}
              </a>
            </div>
          )}
        </div>
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <LeadEnrichButton
            leadId={lead.id}
            companyName={lead.companyName ?? undefined}
            website={fallbackApplyLink}
          />
        </div>
      </div>

      {/* Lead Details */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">Lead Details</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {lead.source && (
            <div>
              <p className="text-sm font-medium text-zinc-500">Source</p>
              <p className="mt-1 text-zinc-900">{formatSourceLabel(lead.source)}</p>
            </div>
          )}
          {lead.assignedTo && (
            <div>
              <p className="text-sm font-medium text-zinc-500">Assigned To</p>
              <p className="mt-1 text-zinc-900">{lead.assignedTo.name}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-zinc-500">Created</p>
            <p className="mt-1 text-zinc-900">
              {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Last Updated</p>
            <p className="mt-1 text-zinc-900">
              {new Date(lead.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Notes</h2>
          {fallbackApplyLink && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand-primary-600">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
                Apply Link
              </span>
              <a
                href={fallbackApplyLink}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                {fallbackApplyLink}
              </a>
            </div>
          )}
          <p className="mt-4 whitespace-pre-wrap text-zinc-600">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}
