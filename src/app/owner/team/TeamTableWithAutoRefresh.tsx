'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteUserButton } from '@/app/dashboard/admin/users/DeleteUserButton';
import Link from 'next/link';
import { Pencil, Link as LinkIcon } from 'lucide-react';

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

export function TeamTableWithAutoRefresh({ members }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Map<string, { link: string; expiresAt: string }>>(new Map());
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Refresh on focus + interval
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

  const filteredMembers = useMemo(() => sortedMembers.filter((m) => m.role !== 'OWNER'), [sortedMembers]);

  const selectableMembers = useMemo(() => filteredMembers, [filteredMembers]);

  const formatPosition = (member: Member) => {
    // If user has a custom position, use that
    if (member.positionCustom?.name) {
      return member.positionCustom.name;
    }
    
    // Otherwise, format the enum position
    if (!member.position) return '—';
    const pretty = member.position
      .toLowerCase()
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    return pretty;
  };

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
    if (!confirm(`Remove ${selectedIds.size} user(s) from your workspace? This cannot be undone.`)) return;
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
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Team Members</div>
      </div>
      <table className="w-full table-auto text-sm">
        <thead className="border-b border-zinc-200">
          <tr>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Position</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
            <th className="pb-3 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</span>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={selectedIds.size > 0 && selectedIds.size === selectableMembers.length}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedIds.size > 0 && selectedIds.size < selectableMembers.length;
                    }
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={!selectedIds.size || isDeleting}
                  title="Delete selected"
                  className="rounded border border-rose-200 bg-white p-1.5 text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filteredMembers.map((member) => {
            const isOwner = member.role === 'OWNER';
            const positionName = formatPosition(member);
            const isExec = positionName.toLowerCase().includes('executive') || positionName.toLowerCase().includes('director');
            return (
              <tr
                key={member.id}
                className="transition hover:bg-zinc-50"
              >
                <td className="py-4 pr-12">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold uppercase text-purple-600">
                      {getInitials(member.name, member.email)}
                    </span>
                    <span className="font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</span>
                  </div>
                </td>
                <td className="py-4 pr-12 text-zinc-600">{member.email}</td>
                <td className="py-4 pr-12">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    {member.role}
                  </span>
                </td>
                <td className="py-4 pr-12 text-sm">
                  {isExec ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                      <span aria-hidden>👑</span>
                      {formatPosition(member)}
                    </span>
                  ) : (
                    <span className="text-zinc-700">{formatPosition(member)}</span>
                  )}
                </td>
                <td className="py-4 pr-12 text-sm">
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
                <td className="py-4 text-right">
                  {isOwner ? null : (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => generateMagicLink(member.id)}
                          disabled={generatingFor === member.id}
                          className="inline-flex items-center justify-center rounded-lg border border-purple-200 bg-white p-2 text-purple-600 shadow-sm transition hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                          title="Generate magic login link"
                        >
                          <LinkIcon size={16} />
                        </button>
                        <Link
                          href={`/owner/team/${member.id}`}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
                          title="Edit user"
                        >
                          <Pencil size={16} />
                        </Link>
                        <DeleteUserButton userId={member.id} userName={member.name ?? member.email} />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${member.name ?? member.email}`}
                          checked={selectedIds.has(member.id)}
                          onChange={(e) => toggleOne(member.id, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="w-[28px]" aria-hidden="true"></div>
                      </div>
                      {generatedLinks.has(member.id) && (
                        <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs">
                          <input
                            type="text"
                            readOnly
                            value={generatedLinks.get(member.id)!.link}
                            className="w-64 rounded border border-purple-200 bg-white px-2 py-1 text-xs"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            onClick={() => copyToClipboard(generatedLinks.get(member.id)!.link)}
                            className="rounded bg-purple-600 px-2 py-1 text-white hover:bg-purple-700"
                          >
                            Copy
                          </button>
                          <span className="text-purple-600">
                            Expires: {new Date(generatedLinks.get(member.id)!.expiresAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                No team members yet. Invite someone using the form above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
