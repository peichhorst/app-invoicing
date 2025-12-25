'use client';

import React from 'react';
import type { ClientOption } from '@/app/dashboard/(with-shell)/invoices/new/actions';

type ClientSelectProps = {
  value: string;
  onChange: (value: string, client: ClientOption | null) => void;
  clients: ClientOption[];
  loading?: boolean;
  label?: string;
  required?: boolean;
};

export function ClientSelect({
  value,
  onChange,
  clients,
  loading = false,
  label = 'Client',
  required = false,
}: ClientSelectProps) {
  const getDisplayName = (client: ClientOption) => {
    const company = client.companyName?.trim();
    const contact = client.contactName?.trim();
    const email = client.email?.trim();
    if (company) {
      return company;
    }
    return contact || email || 'Unnamed client';
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          const found = clients.find((c) => c.id === next) || null;
          onChange(next, found);
        }}
        disabled={loading}
        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{loading ? 'Loading clients...' : 'Select a client'}</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {getDisplayName(client)}
          </option>
        ))}
      </select>
    </div>
  );
}
