"use client";

import Link from 'next/link';
import {
  UserPlus,
  Users,
  FileText,
  FileSignature,
  Repeat,
  User,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Lead', href: '/dashboard/leads/new', icon: UserPlus },
  { label: 'Client', href: '/dashboard/clients/new', icon: Users },
  { label: 'Proposal', href: '/dashboard/proposals/new', icon: FileText },
  { label: 'Contract', href: '/dashboard/contracts/new', icon: FileSignature },
  { label: 'Invoice', href: '/dashboard/invoices/new', icon: FileText },
  { label: 'Recurring Payment', href: '/dashboard/recurring/new', icon: Repeat },
  { label: 'Team Member', href: '/dashboard/team/new', icon: User },
];

export function QuickActions() {
  const openOpportunitySearch = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('dashboard-open-echo-thread-search'));
  };

  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-zinc-200 bg-white/90 px-3 py-3 shadow-sm">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-brand-primary-700 text-center mb-2">Quick actions</p>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={openOpportunitySearch}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-brand-primary-600 hover:text-brand-primary-700"
        >
          <UserPlus className="h-4 w-4 text-zinc-400" />
          Opportunity Search
        </button>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-brand-primary-600 hover:text-brand-primary-700"
          >
            <action.icon className="h-3 w-3 text-zinc-400" />
            New {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
