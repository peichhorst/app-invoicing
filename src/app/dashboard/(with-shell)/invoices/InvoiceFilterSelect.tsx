"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

type FilterOption = { key: string; label: string };

type InvoiceFilterSelectProps = {
  options: FilterOption[];
  current: string;
};

export default function InvoiceFilterSelect({ options, current }: InvoiceFilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = e.target.value;
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (newFilter === 'all') {
        params.delete('filter');
      } else {
        params.set('filter', newFilter);
      }
      
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      
      router.push(newUrl);
    });
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="filter" className="text-xs uppercase tracking-[0.2em] text-gray-500">
        Filter
      </label>
      <select
        id="filter"
        name="filter"
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}