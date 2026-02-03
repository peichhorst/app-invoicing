"use client";
import { useEffect, useState } from "react";

export function TotalRevenueDebug({ companyId }: { companyId: string }) {
  const [debug, setDebug] = useState<any>(null);
  useEffect(() => {
    if (!companyId) return;
    let active = true;
    const fetchDebug = async () => {
      try {
        const res = await fetch(`/api/dashboard/total-revenue?companyId=${companyId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setDebug(data);
      } catch {}
    };
    fetchDebug();
    const interval = setInterval(fetchDebug, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [companyId]);
  if (!debug) return null;
  return (
    <pre style={{ fontSize: 10, background: '#f3f3f3', color: '#333', padding: 8, borderRadius: 4, marginTop: 8, maxWidth: 400, overflowX: 'auto' }}>
      {JSON.stringify(debug, null, 2)}
    </pre>
  );
}