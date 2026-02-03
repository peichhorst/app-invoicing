'use client';

import { useState } from 'react';

type AssignableUser = { id: string; name: string | null; email: string | null };

type Props = {
  leadId: string;
  currentAssigneeId: string;
  options: AssignableUser[];
};

export function AssignLeadSelect({ leadId, currentAssigneeId, options }: Props) {
  const [value, setValue] = useState(currentAssigneeId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (next: string) => {
    if (next === value) return;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: next || null }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to update assignee');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reassign lead');
      setValue(currentAssigneeId ?? '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <select
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-200"
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        aria-label="Assign lead to user"
      >
        <option value="">Unassigned</option>
        {options.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email || user.id}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
