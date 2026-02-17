"use client";
import { useEffect, useState } from "react";
import { Mail } from 'lucide-react';

export function UnreadMessagesSection() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/messages/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setCount(data.messageCount ?? 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  return (
    <div className="py-10 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm px-2 py-1 flex flex-col items-center justify-center text-center w-full h-full min-h-[120px]">
      <Mail className="mb-1 h-8 w-8 text-brand-primary-600" />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Unread Messages</p>
      <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{count}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Messages in your inbox</p>
    </div>
  );
}
