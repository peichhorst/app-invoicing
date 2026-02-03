"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { LEAD_CSV_HEADERS } from '@/lib/lead-csv';

const SAMPLE_FILENAME = 'leads-template.csv';

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function LeadCsvTools() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    const headerLine = LEAD_CSV_HEADERS.map(escapeCsvValue).join(',');
    const blob = new Blob([`${headerLine}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = SAMPLE_FILENAME;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setError(null);
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || 'Import failed. Please retry.');
      } else {
        const imported = data?.imported ?? 0;
        const skipped = data?.skipped ?? 0;
        setStatus(
          `Imported ${imported} lead${imported === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`
        );
        if (imported) {
          window.location.reload();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import CSV.';
      setError(message);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-gray-200 bg-white p-4 mt-8">
      <p className="text-xs uppercase tracking-[0.3em] text-brand-primary-700">Import Leads</p>
      <div className="flex flex-wrap gap-3">
        <p className="text-xs text-gray-500">
          Download the template to see the required columns, add one row per lead (Name is required), then import to create records automatically.
          Use simple text values (no formulas) and keep the file as CSV.
          <br />
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
        >
          Download template
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={isImporting}
          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:border-brand-primary-200 disabled:bg-brand-primary-200 disabled:text-brand-primary-400"
        >
          {isImporting ? 'Importing…' : 'Import leads CSV'}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
      </div>
      {status && <p className="text-xs text-green-600">{status}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
