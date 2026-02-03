"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import type { RevenueDebugData } from "@/types/revenue";

export function TotalRevenueSection({
  companyId,
  debug,
}: {
  companyId: string;
  debug?: RevenueDebugData | null;
}) {
  const [revenue, setRevenue] = useState<{ total: number; sinceDate: string | null }>({
    total: 0,
    sinceDate: null,
  });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRevenue = async () => {
      try {
        const res = await fetch(`/api/dashboard/total-revenue?companyId=${companyId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setRevenue({
            total: data.total ?? 0,
            sinceDate: data.sinceDate ?? null,
          });
        }
      } catch {}
    };
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [companyId]);

  const debugData = debug ?? null;
  const invoices = useMemo(() => debugData?.invoices.slice(0, 5) ?? [], [debugData]);
  const moreCount = Math.max((debugData?.invoices.length ?? 0) - invoices.length, 0);

  return (
    <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm px-4 py-5 w-full">
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <BarChart2 className="h-8 w-8 text-brand-primary-600" />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
          Total Revenue Since {revenue.sinceDate ? new Date(revenue.sinceDate).toLocaleDateString() : "N/A"}
        </p>
        <p className="text-3xl font-bold text-zinc-900">
          ${revenue.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      {debugData ? (
        <div className="mt-4 flex flex-col justify-between gap-2 border border-zinc-200 rounded-2xl p-3">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 flex items-center justify-between text-[0.75rem] font-semibold text-zinc-700"
          >
            <span>Invoices: {debugData.invoices.length}</span>
            <span className="text-brand-primary-600">{expanded ? "Hide" : "Show"}</span>
          </button>
          {expanded && (
            <div className="space-y-2 text-[0.65rem] font-mono text-zinc-600">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-2">
                  <span className="text-[0.6rem] text-zinc-500">{invoice.id.slice(0, 6)}</span>
                  <span>{invoice.status}</span>
                  <span>${invoice.total.toFixed(2)}</span>
                  <span className="text-[0.6rem] text-zinc-500">
                    {(invoice.paidAt ?? invoice.createdAt).toISOString().split("T")[0]}
                  </span>
                </div>
              ))}
              {moreCount > 0 && <p className="text-[0.65rem] text-zinc-500">...and {moreCount} more invoices</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 p-3 text-xs text-zinc-500">
          <p>No debug data yet</p>
        </div>
      )}
    </div>
  );
}
