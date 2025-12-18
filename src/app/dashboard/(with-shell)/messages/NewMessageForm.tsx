'use client';

import { useEffect, useState } from 'react';
import type { Role } from '@prisma/client';

type Position = { id: string; name: string };
type Member = { id: string; name?: string | null; email: string; role: Role };

const roleOptions: Role[] = ['OWNER', 'ADMIN', 'USER'];

export function NewMessageForm({ userRole }: { userRole: Role }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [toAll, setToAll] = useState(true);
  const [roles, setRoles] = useState<Set<Role>>(new Set());
  const [positions, setPositions] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [positionsList, setPositionsList] = useState<Position[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [posRes, membersRes] = await Promise.all([fetch('/api/positions'), fetch('/api/members')]);
        if (posRes.ok) {
          setPositionsList(await posRes.json());
        }
        if (membersRes.ok) {
          setMembers(await membersRes.json());
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const handleFileUpload = async () => {
    if (!file) return null;
    setFileUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/cloudinary/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFileUrl(data.secureUrl);
      return data.secureUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setFileUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    let uploadedUrl = fileUrl;
    if (file && !fileUrl) {
      uploadedUrl = await handleFileUpload();
      if (!uploadedUrl) {
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          fileUrl: uploadedUrl,
          toAll,
          toRoles: Array.from(roles),
          toPositions: Array.from(positions),
          toUserIds: Array.from(users),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to send');
      }
      
      const data = await res.json();
      const messageId = data.message?.id;
      
      // Broadcast message event
      try {
        const channel = new BroadcastChannel('clientwave-events');
        channel.postMessage({
          type: 'message-received',
          payload: {
            messageId,
            fromId: data.message?.fromId,
            fromName: data.message?.from?.name || data.message?.from?.email,
            text: text.substring(0, 100),
          },
        });
        channel.close();
      } catch {
        // ignore broadcast issues
      }
      
      setMessage('Message sent.');
      setText('');
      setFile(null);
      setFileUrl(null);
      setToAll(true);
      setRoles(new Set());
      setPositions(new Set());
      setUsers(new Set());
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const toggleSet = <T,>(value: T, setFn: React.Dispatch<React.SetStateAction<Set<T>>>) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">New message</p>
          <p className="text-sm text-zinc-600">Send to your team with optional targeting.</p>
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          placeholder="Write your update..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Attachment (optional)</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        {fileUploading && <p className="text-xs text-zinc-500">Uploading...</p>}
        {fileUrl && <p className="text-xs text-emerald-700">Uploaded</p>}
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-800">Recipients</span>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={toAll}
              onChange={(e) => setToAll(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            All team members
          </label>
        </div>
        {!toAll && (
          <div className="space-y-3">
            {/* Roles - Only for OWNER/ADMIN */}
            {(userRole === 'OWNER' || userRole === 'ADMIN') && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={roles.has(role)}
                        onChange={() => toggleSet(role, setRoles)}
                        className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* Positions - Available to all users */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Positions</p>
              {positionsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {positionsList.map((pos) => (
                    <label key={pos.id} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={positions.has(pos.id)}
                        onChange={() => toggleSet(pos.id, setPositions)}
                        className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      {pos.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No positions available</p>
              )}
            </div>
            {/* Specific people - Available to all users */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Specific people</p>
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <label key={m.id} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="checkbox"
                        checked={users.has(m.id)}
                        onChange={() => toggleSet(m.id, setUsers)}
                        className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      {m.name || m.email} <span className="text-xs text-zinc-500">({m.role})</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No team members available</p>
              )}
            </div>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg text-emerald-800">
          <p className="text-sm font-semibold">Message sent</p>
          <p className="text-xs">Your recipients will be notified.</p>
        </div>
      )}
    </form>
  );
}
