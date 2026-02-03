// This file is intended for client-side usage only
"use client";
import useSWR from 'swr';

type UseReportingSummaryProps = {
  year?: number;
  month?: number;
  status?: string;
  period?: string;
  includeCompany?: boolean;
};

export function useReportingSummary({ year, month, status = 'ALL', period = 'monthly', includeCompany = true }: UseReportingSummaryProps = {}) {
  const params = new URLSearchParams({
    year: String(year ?? new Date().getFullYear()),
    month: String(month ?? new Date().getMonth() + 1),
    status,
    period,
    includeCompany: includeCompany ? '1' : '0',
  });
  const { data, error, isLoading, mutate } = useSWR(
    `/api/reporting/summary?${params.toString()}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch reporting summary');
      return res.json();
    },
    { refreshInterval: 4000 }
  );
  return { data, error, isLoading, mutate };
}
