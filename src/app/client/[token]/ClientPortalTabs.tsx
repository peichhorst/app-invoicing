'use client';

import { useState } from 'react';
import { Home, FileText, FileSignature, CreditCard, Download, LogOut } from 'lucide-react';

type Tab = 'dashboard' | 'invoices' | 'proposals' | 'payments' | 'documents';

const mainNav = [
  { id: 'dashboard' as Tab, label: 'Dashboard', icon: Home },
  { id: 'invoices' as Tab, label: 'Invoices', icon: FileText },
  { id: 'proposals' as Tab, label: 'Proposals', icon: FileSignature },
  { id: 'payments' as Tab, label: 'Payments', icon: CreditCard },
  { id: 'documents' as Tab, label: 'Documents', icon: Download },
];

interface ClientPortalTabsProps {
  companyName: string;
  companyInitials: string;
  companyLogo?: string | null;
  clientName: string;
  clientInitials: string;
  children: Record<Tab, React.ReactNode>;
}

export function ClientPortalTabs({
  companyName,
  companyInitials,
  companyLogo,
  clientName,
  clientInitials,
  children,
}: ClientPortalTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogo}
              alt={`${companyName} logo`}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-lg font-semibold text-zinc-700">
              {companyInitials}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-zinc-900">{companyName}</p>
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Client portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-semibold text-brand-primary-700">
            {clientInitials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900">{clientName}</p>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">Client</p>
          </div>
          <form action="/api/auth/logout" method="post" className="ml-4">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </form>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow">
        {mainNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === item.id
                ? 'bg-brand-primary-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main>
        {children[activeTab]}
      </main>
    </div>
  );
}
