// src/app/dashboard/proposals/ProposalFilterSelect.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_OPTIONS = ['All', 'DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'DECLINED'];

interface ProposalFilterSelectProps {
  current: string;
}

export default function ProposalFilterSelect({ current }: ProposalFilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'All') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    router.push(`/dashboard/proposals?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option === 'All' ? 'All' : option.charAt(0) + option.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}
