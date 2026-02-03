'use client';

import { useEffect, useState } from 'react';
type Position = { id: string; name: string };
type Member = { id: string; name?: string | null; email: string };

type NewMessageFormProps = {
  currentUserId: string;
  contextType?: 'CLIENT' | 'INVOICE' | 'PROPOSAL' | 'GENERAL';
  contextId?: string;
  placeholder?: string;
  replyAuthorId?: string | null;
  replyParticipantIds?: string[];
  forceReplyButtons?: boolean;
};

export function NewMessageForm({
  currentUserId,
  contextType,
  contextId,
  placeholder = 'Write your update...',
  replyAuthorId,
  replyParticipantIds = [],
  forceReplyButtons = false,
}: NewMessageFormProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [toAll, setToAll] = useState(false);
  const [internalNote, setInternalNote] = useState(false);
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

  const memberById = new Map(members.map((member) => [member.id, member]));
  const mentionForId = (id: string) => {
    const member = memberById.get(id);
    const label = member?.name?.trim() || member?.email?.trim();
    return label ? `@${label}` : null;
  };

  const replyIds = replyAuthorId ? [replyAuthorId] : [];
  const replyAllIds = Array.from(
    new Set(
      [...replyParticipantIds, ...(replyAuthorId ? [replyAuthorId] : [])].filter(
        (id) => id && id !== currentUserId,
      ),
    ),
  );

  const shouldShowReply = replyIds.length > 0;
  const shouldShowReplyAll = replyAllIds.length > 1;
  const showReplyButtons = forceReplyButtons || shouldShowReply || shouldShowReplyAll;

  const buildMentions = (ids: string[]) =>
    ids.map((id) => mentionForId(id) || `@user-${id.slice(0, 6)}`);

  const applyMentions = (ids: string[]) => {
    const mentions = buildMentions(ids);
    if (!mentions.length) return;
    setText((prev) => {
      const current = prev.trim();
      const existing = current.toLowerCase();
      const filtered = mentions.filter((mention) => !existing.includes(mention.toLowerCase()));
      if (!filtered.length) return prev;
      const prefix = filtered.join(' ');
      return current ? `${prefix} ${current}` : `${prefix} `;
    });
  };

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
      const isInternalOnly = internalNote;
      const payloadContextType = isInternalOnly ? 'INTERNAL_NOTE' : contextType;
      const recipientPositions = isInternalOnly ? [] : Array.from(positions);
      const recipientUsers = isInternalOnly ? [currentUserId] : Array.from(users);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          fileUrl: uploadedUrl,
          toAll: isInternalOnly ? false : toAll,
          toPositions: recipientPositions,
          toUserIds: recipientUsers,
          contextType: payloadContextType,
          contextId: isInternalOnly ? null : contextId,
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
      setToAll(false);
      setInternalNote(false);
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

  const selectableMembers = members.filter((member) => member.id !== currentUserId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">New message</p>
          <p className="text-sm text-zinc-600">Send to your team with optional targeting.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50 pb-4 pl-4 pr-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 pb-1">Send to:</span>
          <div className="flex flex-col items-start gap-2 text-sm font-semibold text-zinc-700">
          <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !toAll;
                  setToAll(next);
                  if (next) {
                    setInternalNote(false);
                  }
                }}
                className={`flex h-12 w-auto items-center justify-between gap-3 rounded-xl border px-4 text-sm font-semibold transition ${
                  toAll
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner'
                    : 'border-brand-primary-500 bg-white text-brand-primary-700 hover:border-emerald-500 hover:text-emerald-700'
                }`}
              >
                <span>Announcement (All Team Members)</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    toAll ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-brand-primary-500 bg-transparent text-transparent'
                  }`}
                >
                  ✓
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !internalNote;
                  setInternalNote(next);
                  if (next) {
                    setToAll(false);
                    setPositions(new Set());
                    setUsers(new Set());
                  }
                }}
                className={`flex h-12 w-auto items-center justify-between gap-3 rounded-xl border px-4 text-sm font-semibold transition ${
                  internalNote
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner'
                    : 'border-brand-primary-500 bg-white text-brand-primary-700 hover:border-emerald-500 hover:text-emerald-700'
                }`}
              >
                <span>Internal Note (Only you)</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    internalNote ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-brand-primary-500 bg-transparent text-transparent'
                  }`}
                >
                  ✓
                </span>
              </button>
            </div>
          </div>
        </div>
        {!toAll && !internalNote && (
          <div className="space-y-2">
            {/* Positions - Available to all users */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 pb-1">Positions</p>
              {positionsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {positionsList.map((pos) => {
                    const active = positions.has(pos.id);
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => toggleSet(pos.id, setPositions)}
                        className={`flex h-10 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-semibold transition ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner'
                            : 'border-brand-primary-500 bg-white text-brand-primary-700 hover:border-emerald-500 hover:text-emerald-700'
                        }`}
                      >
                        <span>{pos.name}</span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                            active
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-brand-primary-500 bg-transparent text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No positions available</p>
              )}
            </div>
            {/* Specific people - Available to all users */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 pb-1">Specific people</p>
              {selectableMembers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectableMembers.map((m) => {
                    const active = users.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleSet(m.id, setUsers)}
                        className={`flex h-10 items-center justify-between gap-3 rounded-xl border px-3 text-sm font-semibold transition ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner'
                            : 'border-brand-primary-500 bg-white text-brand-primary-700 hover:border-emerald-500 hover:text-emerald-700'
                        }`}
                      >
                        <span>{m.name || m.email}</span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                            active
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-brand-primary-500 bg-transparent text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No team members available</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">Message</label>
        {showReplyButtons && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyMentions(replyIds)}
              disabled={!replyIds.length}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                replyIds.length
                  ? 'border-zinc-200 bg-white text-zinc-600 hover:text-brand-primary-700'
                  : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400'
              }`}
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => applyMentions(replyAllIds)}
              disabled={!shouldShowReplyAll}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                shouldShowReplyAll
                  ? 'border-zinc-200 bg-white text-zinc-600 hover:text-brand-primary-700'
                  : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400'
              }`}
            >
              Reply All
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          placeholder={placeholder}
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

      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1 text-left">
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-full bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg text-emerald-800">
          <p className="text-sm font-semibold">Message sent</p>
          <p className="text-xs">Your recipients will be notified.</p>
        </div>
      )}
    </form>
  );
}
