'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteUserButton } from './DeleteUserButton';
import { ImpersonateUserButton } from './ImpersonateUserButton';
import { Link as LinkIcon } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Member = {
  id: string;
  name?: string | null;
  email: string;
  company?: { name?: string | null } | null;
  role: string;
  isConfirmed?: boolean | null;
  planTier?: string | null;
};

const getInitials = (name?: string | null, email?: string) => {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return (parts[0][0] ?? 'U').toUpperCase();
    }
    const initials = parts.map((part) => part[0]).join('').slice(0, 3);
    return (initials || 'U').toUpperCase();
  }
  const fallback = email?.trim()?.[0];
  return (fallback || 'U').toUpperCase();
};

export function AdminUsersTable({ members }: { members: Member[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Map<string, { link: string; expiresAt: string }>>(new Map());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const selectableMembers = useMemo(() => members, [members]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(selectableMembers.map((m) => m.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next;
    });
  }, [selectableMembers]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableMembers.map((m) => m.id)));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const failed: { id: string; reason?: string }[] = [];
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 404) continue;
        const text = await res.text();
        let reason: string | undefined = text;
        try {
          const json = JSON.parse(text);
          if (json) {
            reason = json?.error || json?.message || text;
          }
        } catch {
          // Leave reason as the raw text if JSON parsing fails
        }
        failed.push({ id, reason });
      }
        } catch (error) {
          failed.push({ id, reason: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      if (failed.length === 0) {
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert(
          `Some users could not be deleted (${failed.length}/${ids.length}).` +
            (failed[0]?.reason ? `\n\nFirst error: ${failed[0].reason}` : ''),
        );
        router.refresh();
      }
    } catch {
      alert('Failed to delete users.');
    } finally {
      setIsDeleting(false);
    }
  };

  const generateMagicLink = async (userId: string) => {
    setGeneratingFor(userId);
    try {
      const res = await fetch('/api/admin/generate-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        alert('Failed to generate magic link');
        return;
      }
      const data = await res.json();
      setGeneratedLinks((prev) => new Map(prev).set(userId, {
        link: data.magicLink,
        expiresAt: data.expiresAt,
      }));
    } catch (error) {
      console.error('Error generating magic link:', error);
      alert('Failed to generate magic link');
    } finally {
      setGeneratingFor(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Magic link copied to clipboard!');
  };

  const selectedMembers = selectableMembers.filter((m) => selectedIds.has(m.id));
  const hasOwner = selectedMembers.some((m) => m.role === 'OWNER');
  const bulkWarning = hasOwner
    ? `Delete ${selectedIds.size} user(s)? Deleting an owner will also remove their entire company and members.`
    : `Delete ${selectedIds.size} user(s)? This cannot be undone.`;

  const formatPlanTier = (tier?: string | null) => {
    if (!tier) return 'Unknown';
    const normalized = tier.toUpperCase();
    if (normalized === 'PRO') return 'Pro';
    if (normalized === 'PRO_TRIAL') return 'Pro Trial';
    if (normalized === 'FREE') return 'Free';
    return normalized;
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden p-4">
        {members.map((member) => {
          const isOwner = member.role === 'OWNER';

          return (
            <div key={member.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-700 text-sm font-semibold uppercase text-white">
                    {getInitials(member.name, member.email)}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{member.name ?? 'Unnamed'}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {member.company?.name && (
                      <p className="text-sm text-gray-500">{member.company.name}</p>
                    )}
                    <p className="text-sm text-gray-500">Plan: {formatPlanTier(member.planTier)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-600">
                    {member.role}
                  </span>
                  {isOwner && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Owner</p>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                <p>
                  Status:{' '}
                  {isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      Owner
                    </span>
                  ) : member.isConfirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                      Pending
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => generateMagicLink(member.id)}
                  disabled={generatingFor === member.id}
                  className="inline-flex items-center gap-1 rounded border border-brand-primary-200 bg-white px-3 py-1.5 text-sm text-brand-primary-600 hover:bg-brand-primary-50 disabled:opacity-50"
                >
                  <LinkIcon size={14} />
                  Magic Link
                </button>
                <ImpersonateUserButton userId={member.id} userName={member.name ?? member.email} />
                <DeleteUserButton
                  userId={member.id}
                  userName={member.name ?? member.email}
                  role={member.role}
                />
              </div>

              {generatedLinks.has(member.id) && (
                <div className="mt-3 rounded bg-brand-primary-50 p-3 text-xs">
                  <input
                    type="text"
                    readOnly
                    value={generatedLinks.get(member.id)!.link}
                    className="w-full rounded border border-brand-primary-200 bg-white px-2 py-1 font-mono text-xs"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() => copyToClipboard(generatedLinks.get(member.id)!.link)}
                      className="rounded bg-brand-primary-600 px-3 py-1 text-white hover:bg-brand-primary-700"
                    >
                      Copy
                    </button>
                    <span className="text-brand-primary-700">
                      Expires: {new Date(generatedLinks.get(member.id)!.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[820px]">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50">
              <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Select
              </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
            {members.map((member) => {
              const isOwner = member.role === 'OWNER';

              return (
                <tr key={member.id} className={`hover:bg-zinc-50 ${isOwner ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-700 text-xs font-semibold uppercase text-white">
                        {getInitials(member.name, member.email)}
                      </span>
                      <span className="font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">{member.email}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {member.role === 'OWNER' ? member.company?.name ?? '—' : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      {formatPlanTier(member.planTier)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        Owner
                      </span>
                    ) : member.isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateMagicLink(member.id)}
                        disabled={generatingFor === member.id}
                        className="rounded border border-brand-primary-200 bg-white p-1.5 text-brand-primary-600 hover:bg-brand-primary-50 disabled:opacity-50"
                        title="Generate magic login link"
                      >
                        <LinkIcon size={16} />
                      </button>
                      <ImpersonateUserButton userId={member.id} userName={member.name ?? member.email} />
                      <DeleteUserButton
                        userId={member.id}
                        userName={member.name ?? member.email}
                        role={member.role}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="checkbox"
                      aria-label={`Select ${member.name ?? member.email}`}
                      checked={selectedIds.has(member.id)}
                      onChange={(e) => toggleOne(member.id, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                    />
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-zinc-500">
                  No members yet.
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk actions bar (shared for both views) */}
      {selectedIds.size > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-zinc-700">
            {selectedIds.size} {selectedIds.size === 1 ? 'user' : 'users'} selected
          </p>
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={isDeleting}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete selected'}
          </button>
        </div>
      )}
      <ConfirmationModal
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete users?"
        message={bulkWarning}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Magic links section (shared) */}
      {generatedLinks.size > 0 && (
        <div className="border-t border-zinc-200 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Generated Magic Links</p>
          <div className="space-y-3">
            {Array.from(generatedLinks.entries()).map(([userId, { link, expiresAt }]) => {
              const member = members.find((m) => m.id === userId);
              return (
                <div key={userId} className="rounded-lg bg-brand-primary-50 p-3">
                  <p className="text-xs font-medium text-brand-primary-800 mb-1">
                    {member?.name || member?.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={link}
                      className="flex-1 min-w-0 rounded border border-brand-primary-200 bg-white px-3 py-1.5 text-xs font-mono"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => copyToClipboard(link)}
                      className="rounded bg-brand-primary-600 px-4 py-1.5 text-xs text-white hover:bg-brand-primary-700"
                    >
                      Copy
                    </button>
                    <span className="text-xs text-brand-primary-700">
                      Expires: {new Date(expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
