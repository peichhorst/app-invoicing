'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type InviteResponse = {
  user?: { id: string; name?: string | null; email: string };
  temporaryPassword?: string;
  error?: string;
};

type Position = {
  id: string;
  name: string;
  order: number;
  isCustom: boolean;
};

export default function InviteUserForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [positionId, setPositionId] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<InviteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [setAsAdmin, setSetAsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loadPositions = async () => {
    setLoadingPositions(true);
    try {
      const response = await fetch('/api/positions');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setPositionsError(data.error || 'Positions unavailable');
        return;
      }
      const data: Position[] = await response.json();
      setPositions(data);
      setPositionsError(null);
    } catch (err) {
      console.error('Error loading positions', err);
      setPositionsError('Unable to load positions');
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    loadPositions();

    const handlePositionsUpdated = () => loadPositions();
    if (typeof window !== 'undefined') {
      window.addEventListener('positions-updated', handlePositionsUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('positions-updated', handlePositionsUpdated);
      }
    };
  }, []);

  if (!hydrated) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          positionId: positionId || null,
          setAsAdministrator: setAsAdmin,
        }),
      });
      const data: InviteResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to invite user');
      }
      setSuccess(data);
      router.refresh();
      setEmail('');
      setName('');
      setPositionId('');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm opacity-100">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-zinc-900">Add &amp; Invite Company Member</h3>
        <p className="text-sm text-zinc-500">Invite a teammate with their company access and role.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 uppercase tracking-[0.3em]">
            Name
            <input
              name="inviteeName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 uppercase tracking-[0.3em]">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 uppercase tracking-[0.3em]">
            Position
            <select
              value={positionId}
              onChange={(event) => setPositionId(event.target.value)}
              disabled={loadingPositions}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20 cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="">{loadingPositions ? 'Loading positions...' : positions.length ? 'Select position' : 'No positions yet'}</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
            {positionsError && (
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500">
                {positionsError}
              </span>
            )}
          </label>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
            <input
              type="checkbox"
              checked={setAsAdmin}
              onChange={(event) => setSetAsAdmin(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
            />
            <span className="uppercase tracking-[0.3em]">Set as Administrator</span>
          </label>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-primary-700 opacity-100"
          >
            {loading ? 'Sending...' : '+ Add'}
          </button>
        </div>
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        )}
        {success?.temporaryPassword && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            <p>
              Invited {success.user?.email}. Temporary password: <span className="font-semibold">{success.temporaryPassword}</span>
            </p>
          </div>
        )}
      </form>
    </section>
  );
}
