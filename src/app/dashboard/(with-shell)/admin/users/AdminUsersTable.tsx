'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteUserButton } from './DeleteUserButton';
import { ImpersonateUserButton } from './ImpersonateUserButton';
import { Link as LinkIcon } from 'lucide-react';

type Member = {
  id: string;
  name?: string | null;
  email: string;
  company?: { name?: string | null } | null;
  role: string;
  isConfirmed?: boolean | null;
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

  const selectableMembers = useMemo(() => members, [members]);

  // Drop any selections that no longer exist (after deletes/refresh)
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
    const selectedMembers = selectableMembers.filter((m) => selectedIds.has(m.id));
    const hasOwner = selectedMembers.some((m) => m.role === 'OWNER');
    const warning = hasOwner
      ? `Delete ${selectedIds.size} user(s)? Deleting an owner will also remove their entire company and members.`
      : `Delete ${selectedIds.size} user(s)? This cannot be undone.`;
    if (
      !confirm(warning)
    )
      return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const failed: { id: string; reason?: string }[] = [];
      for (const id of ids) {
        try {
          const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            // If the user was already removed (e.g., owner cascade), treat as success
            if (res.status === 404) {
              continue;
            }
            let reason: string | undefined;
            try {
              const body = await res.json();
              reason = body?.error || body?.message;
            } catch {
              reason = await res.text();
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

  return (
    <div className="space-y-3">
      <table className="w-full table-auto text-sm">
        <thead className="border-b border-zinc-200">
          <tr>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Company</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
            <th className="pb-3 pr-12 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
            <th className="pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
            <th className="pb-3 text-right pr-2">
              <div className="flex items-center justify-end gap-2">
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
          {members.map((member) => {
            const isOwner = member.role === 'OWNER';
            return (
              <tr key={member.id} className={`hover:bg-zinc-50 ${isOwner ? 'bg-amber-50/50' : ''}`}>
                <td className="py-4 pr-12">
                  <div className={`flex items-center gap-3 ${isOwner ? '' : 'pl-3'}`}>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold uppercase text-purple-600">
                      {getInitials(member.name, member.email)}
                    </span>
                    <span className="font-semibold text-zinc-900">{member.name ?? 'Unnamed'}</span>
                  </div>
                </td>
                <td className="py-4 pr-12 text-zinc-600">{member.email}</td>
                <td className="py-4 pr-12 text-sm text-zinc-600">
                  {member.role === 'OWNER' ? member.company?.name ?? '—' : '—'}
                </td>
                <td className="py-4 pr-12">
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    {isOwner ? '' : member.role}
                  </span>
                </td>
                <td className="py-4 pr-12 text-sm">
                  {isOwner
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        Owner
                      </span>
                    : member.isConfirmed
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Confirmed
                      </span>
                    : <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        Pending
                      </span>}
                </td>
                <td className="py-4 pr-6 text-sm text-gray-600">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateMagicLink(member.id)}
                        disabled={generatingFor === member.id}
                        className="inline-flex items-center justify-center rounded-lg border border-purple-200 bg-white p-2 text-purple-600 shadow-sm transition hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
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
                </td>
                <td className="py-3 text-right pr-2">
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
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm text-zinc-500">
                No members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
