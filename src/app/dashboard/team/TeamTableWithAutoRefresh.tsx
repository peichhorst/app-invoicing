'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteUserButton } from '@/app/dashboard/admin/users/DeleteUserButton';
import Link from 'next/link';
import { Pencil, Link as LinkIcon } from 'lucide-react';
import { ImpersonateUserButton } from '@/app/dashboard/(with-shell)/admin/users/ImpersonateUserButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Member = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  isConfirmed?: boolean | null;
  position?: string | null;
  positionId?: string | null;
  positionCustom?: {
    name: string;
  } | null;
};

type Props = {
  members: Member[];
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

const formatPosition = (member: Member) => {
  if (member.positionCustom?.name) {
    return member.positionCustom.name;
  }
  if (member.position) {
    return member.position
      .toLowerCase()
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }
  return member.role === 'OWNER' ? 'Owner' : '—';
};

export function TeamTableWithAutoRefresh({ members }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Map<string, { link: string; expiresAt: string }>>(new Map());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  useEffect(() => {
    const refresh = () => router.refresh();
    const interval = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [router]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const nameA = (a.name || a.email || '').toLowerCase();
      const nameB = (b.name || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  const ownerMember = useMemo(() => sortedMembers.find((m) => m.role === 'OWNER') ?? null, [sortedMembers]);
  const filteredMembers = useMemo(() => sortedMembers.filter((m) => m.role !== 'OWNER'), [sortedMembers]);
  const displayMembers = useMemo(() => (ownerMember ? [ownerMember, ...filteredMembers] : filteredMembers), [
    ownerMember,
    filteredMembers,
  ]);
  const selectableMembers = useMemo(() => filteredMembers, [filteredMembers]);

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
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          return res.ok;
        }),
      );
      if (results.every(Boolean)) {
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert('Some users could not be removed.');
      }
    } catch {
      alert('Failed to remove users.');
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

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="mb-0 text-xs uppercase tracking-[0.2em] text-zinc-500">Team Members</div>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden px-4 pb-4">
        {displayMembers.map((member) => {
          const isOwner = member.role === 'OWNER';
          const positionName = formatPosition(member);
          const isExec = positionName.toLowerCase().includes('executive') || positionName.toLowerCase().includes('director');

          return (
            <div key={member.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-700 text-sm font-semibold uppercase text-white">
                    {getInitials(member.name, member.email)}
                  </span>
                  <div className="flex flex-col">
                    <p className="font-semibold text-gray-900">{member.name ?? 'Unnamed'}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">{member.email}</p>
                      {isOwner && (
                        <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">
                          Account Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase text-zinc-600">
                  {member.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Position</p>
                  <p className={isExec ? 'font-semibold text-amber-700' : 'text-gray-700'}>
                    {isExec && '👑 '}
                    {positionName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p>
                    {isOwner ? null : member.isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        Pending
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isOwner && (
                  <>
                    <button
                      onClick={() => generateMagicLink(member.id)}
                      disabled={generatingFor === member.id}
                      className="inline-flex items-center justify-center rounded border border-brand-primary-200 bg-white px-3 py-1.5 text-brand-primary-600 hover:bg-brand-primary-50 disabled:opacity-50"
                    >
                      <LinkIcon size={18} />
                    </button>
                    <ImpersonateUserButton userId={member.id} userName={member.name ?? member.email} />
                  </>
                )}
                <Link
                  href={isOwner ? "/dashboard/settings" : `/dashboard/team/${member.id}`}
                  className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                  aria-label="Edit member"
                >
                  <Pencil size={14} />
                  <span className="sr-only">Edit</span>
                </Link>
                {!isOwner && (
                  <DeleteUserButton userId={member.id} userName={member.name ?? member.email} />
                )}
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
                      Copy Link
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
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
            {displayMembers.map((member) => {
              const isOwner = member.role === 'OWNER';
              const positionName = formatPosition(member);
              const isExec = positionName.toLowerCase().includes('executive') || positionName.toLowerCase().includes('director');

              return (
                <tr key={member.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-700 text-xs font-semibold uppercase text-white">
                        {getInitials(member.name, member.email)}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</span>
                        {isOwner && (
                          <span className="mt-1 inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">
                            Account Owner
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">{member.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isExec ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                        <span aria-hidden>👑</span>
                        {positionName}
                      </span>
                    ) : (
                      <span className="text-zinc-700">{positionName}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isOwner ? null : member.isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isOwner ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href="/dashboard/settings"
                          className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                          title="Edit user"
                        >
                          <Pencil size={16} />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => generateMagicLink(member.id)}
                          disabled={generatingFor === member.id}
                          className="inline-flex items-center justify-center rounded border border-brand-primary-200 bg-white px-3 py-1.5 text-brand-primary-600 hover:bg-brand-primary-50 disabled:opacity-50"
                          title="Generate magic login link"
                        >
                          <LinkIcon size={20} />
                        </button>
                        <ImpersonateUserButton userId={member.id} userName={member.name ?? member.email} />
                        <Link
                          href={`/dashboard/team/${member.id}`}
                          className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                          title="Edit user"
                        >
                          <Pencil size={16} />
                          <span className="sr-only">Edit</span>
                        </Link>
                        <DeleteUserButton userId={member.id} userName={member.name ?? member.email} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {displayMembers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                  No team members yet. Invite someone using the form above.
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Magic link display (shared for both views) */}
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
      <ConfirmationModal
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Remove team members?"
        message={`Remove ${selectedIds.size} user(s) from your workspace? This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
      />
    </>
  );
}
