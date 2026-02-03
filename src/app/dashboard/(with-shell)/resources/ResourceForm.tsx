'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Position = { id: string; name: string };

type Props = {
  canManage: boolean;
};

function normalizeUrl(u: string): string {
  const trimmed = u.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function ResourceForm({ canManage }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [allPositions, setAllPositions] = useState<boolean>(false);
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      setLoadingPositions(true);
      try {
        const res = await fetch('/api/positions');
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as Position[];
        setPositions(data);
        setPositionsError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to load positions';
        setPositionsError(msg);
      } finally {
        setLoadingPositions(false);
      }
    };
    fetchPositions();
  }, []);

  const canSubmit = Boolean(canManage && title.trim() && url.trim() && !saving);
  
  // Keep selectedPositions synced when toggling "all" or when positions load
  useEffect(() => {
    if (allPositions) {
      setSelectedPositions(new Set(positions.map((p) => p.id)));
    }
  }, [allPositions, positions]);

  const togglePosition = (positionId: string) => {
    if (allPositions) return; // ignore individual toggles when all selected
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(positionId)) next.delete(positionId);
      else next.add(positionId);
      return next;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/cloudinary/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Upload failed');
      }
      const data = await res.json();
      if (data?.secureUrl) {
        setUrl(data.secureUrl);
        setMessage('File uploaded. URL filled automatically.');
      } else {
        throw new Error('Upload response missing secureUrl');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (!allPositions && selectedPositions.size === 0) {
        throw new Error('Select at least one position or choose "Include all positions"');
      }
      const payload = {
        title: title.trim(),
        url: normalizeUrl(url),
        description: description.trim() || null,
        // When "all positions" is checked, send empty array to indicate visible to all
        visibleToPositions: allPositions ? [] : Array.from(selectedPositions),
        requiresAcknowledgment,
      };
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = 'Unable to create resource';
        try {
          const body = await res.json();
          msg = (body?.error || body?.details || msg) as string;
        } catch {
          const txt = await res.text();
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      setMessage('Resource added.');
      setTitle('');
      setUrl('');
      setDescription('');
      setAllPositions(false);
      setSelectedPositions(new Set());
      setRequiresAcknowledgment(false);
      router.refresh();
      if (requiresAcknowledgment) {
        void fetch('/api/compliance/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: payload.title }),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create resource';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Resources</p>
          <h2 className="text-lg font-semibold text-zinc-900">Add a resource</h2>
          <p className="text-sm text-zinc-500">Owners and admins can add links and files for the team.</p>
        </div>
        {!canManage && (
          <span className="rounded-full bg-brand-primary-50 px-3 py-1 text-xs font-semibold text-brand-primary-700">Owners/Admins only</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2025 Benefits Guide"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={!canManage}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Upload a file</label>
          <div className="flex flex-col w-full">
            <label className="mt-2 inline-flex items-center justify-center rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 cursor-pointer w-full">
              {uploading ? 'Uploading…' : 'Choose file'}
              <input
                type="file"
                accept=".pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,application/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={!canManage || uploading}
                ref={fileInputRef}
              />
            </label>
          </div>
          {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-semibold text-zinc-800">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/file.pdf"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={!canManage}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional short note"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          disabled={!canManage}
          rows={3}
        />
      </div>

  

      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-800">Visible to positions</p>
        {positionsError && <p className="text-xs text-rose-600">{positionsError}</p>}
        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={allPositions}
            onChange={(e) => setAllPositions(e.target.checked)}
            disabled={!canManage || loadingPositions}
            className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
          />
          Include all positions
        </label>
        <div className={`grid gap-2 sm:grid-cols-2 md:grid-cols-3 ${allPositions ? 'opacity-60' : ''}`}>
          {loadingPositions ? (
            <p className="text-sm text-zinc-500">Loading positions...</p>
          ) : positions.length === 0 ? (
            <p className="text-sm text-zinc-500">No positions found. Add them in Owner &gt; Team.</p>
          ) : (
            positions.map((pos) => (
              <label key={pos.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPositions.has(pos.id)}
                  onChange={() => togglePosition(pos.id)}
                  disabled={!canManage || allPositions}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                />
                <span className="text-zinc-800">{pos.name}</span>
              </label>
            ))
        )}
      </div>
    </div>

    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <input
          type="checkbox"
          checked={requiresAcknowledgment}
          onChange={(event) => setRequiresAcknowledgment(event.target.checked)}
          disabled={!canManage}
          className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
        />
        <span>Require team acknowledgment</span>
      </label>
      {requiresAcknowledgment && (
        <p className="text-xs text-zinc-500">
          Team members will be prompted to acknowledge this document when it becomes available.
        </p>
      )}
    </div>

    <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {saving ? 'Saving...' : 'Add resource'}
        </button>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </form>
  );
}
