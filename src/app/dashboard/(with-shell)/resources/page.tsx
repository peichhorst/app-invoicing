import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ResourceForm } from './ResourceForm';
import { FileText, FileImage, File as FileIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const companyId = user.companyId ?? null;
  const canManage = user.role === 'OWNER' || user.role === 'ADMIN';
  let resources: any[] = [];
  if (companyId) {
    const client: any = prisma as any;
    if (client.resource?.findMany) {
      resources = await client.resource.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Fallback to query the new Resource table directly while client is outdated
      resources = await client.$queryRawUnsafe(
        'SELECT id, "companyId", title, url, "createdAt" FROM "Resource" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
        companyId,
      );
    }
  }

  const normalizeUrl = (u: string): string => {
    if (!u) return '#';
    const trimmed = u.trim();
    // Allow same-origin absolute paths
    if (trimmed.startsWith('/')) return trimmed;
    // Keep common schemes
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    // Prepend https by default for bare domains
    return `https://${trimmed}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Resources</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Resources</h1>
          <p className="text-sm text-zinc-600">Links and files shared with your team.</p>
        </div>

        {canManage && <ResourceForm canManage={canManage} />}

        {resources.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No resources yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full table-auto text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">File / Preview</th>
                  <th className="px-4 py-3 text-left">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {resources.map((r: any) => {
                  const href = normalizeUrl(r.url);
                  const isPdf = href.toLowerCase().endsWith('.pdf');
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(href);
                  const isVideo = /\.(mp4|webm|mov)$/i.test(href);
                  
                  return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{r.title}</td>
                    <td className="px-4 py-3">
                      {href && href.trim() ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-700 hover:text-purple-900">
                          {isImage ? (
                            <div className="flex items-center gap-2">
                              <Image src={href} alt={r.title} width={40} height={40} className="rounded object-cover" />
                              <FileImage className="h-4 w-4" />
                            </div>
                          ) : isPdf ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              <span className="text-xs">PDF</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-5 w-5" />
                              <span className="text-xs">View</span>
                            </div>
                          )}
                        </a>
                      ) : (
                        <span className="text-zinc-400">No file</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs text-zinc-500">More actions (add/edit) coming soon.</div>
      </div>
    </div>
  );
}
