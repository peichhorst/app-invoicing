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
        body: JSON.stringify({ email, name, positionId: positionId || null }),
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
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Add &amp; Invite Company Member</h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Name
            <input
              name="inviteeName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-purple-400"
              placeholder="Jane Doe"
            />
          </label>
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-purple-400"
              placeholder="invitee@mail.com"
            />
          </label>
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Position
            <select
              value={positionId}
              onChange={(event) => setPositionId(event.target.value)}
              disabled={loadingPositions}
              className="mt-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-purple-400 cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingPositions ? 'Loading positions...' : positions.length ? 'Select position' : 'No positions yet'}
              </option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
            {positionsError && (
              <span className="mt-1 text-[11px] uppercase tracking-[0.25em] text-rose-500">
                {positionsError}
              </span>
            )}
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!hydrated || !email || loading}
              className="inline-flex items-center justify-center rounded-2xl border border-purple-500 bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Save'}
            </button>
          </div>
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
