// src/app/dashboard/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';

const isValidUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export default async function Dashboard() {
  const user = await getCurrentUser();
  const showLogo = isValidUrl(user?.logoDataUrl);
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Quick links to manage invoices and clients.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Manage Invoices</h2>
              <Link
                href="/dashboard/invoices"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
              >
                View All Invoices
              </Link>
            </div>
            <p className="mt-2 text-sm text-gray-600">See, send, and download your invoices.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/invoices/new"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
              >
                Create New Invoice
              </Link>
            </div>
            </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Manage Clients</h2>
              <Link
                href="/dashboard/clients"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
              >
                View All Clients
              </Link>
            </div>
            <p className="mt-2 text-sm text-gray-600">Manage your client records and contact details.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/clients/new"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
              >
                Add New Client
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
