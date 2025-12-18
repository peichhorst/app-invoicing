// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { describePlan, ensureTrialState } from '@/lib/plan';
import { WelcomeConfetti } from './WelcomeConfetti';
import {
  Users,
  FileText,
  Repeat,
  BarChart2,
  Wrench,
  FileSignature,
  Files,
  Settings,
  Bell,
} from 'lucide-react';

type StripeCheckedUser = { stripeSubscriptionCheckError?: string };

const formatPlanDate = (value?: Date | string | null) => {
  if (!value) return 'soon';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const navItems = [
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Recurring', href: '/dashboard/recurring', icon: Repeat },
  {
    label: 'Proposals & Contracts',
    href: '/dashboard/proposals-contracts',
    icon: FileSignature,
  },
  { label: 'Reporting', href: '/dashboard/reporting', icon: BarChart2 },
  { label: 'Resources', href: '/dashboard/resources', icon: Files },
  { label: 'Messages', href: '/dashboard/messages', icon: Bell },
];

const adminItems = [{ label: 'Users', href: '/dashboard/admin/users', icon: Users }];
const ownerItems = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Team', href: '/owner/team', icon: Users },
];

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (user && user.role === 'OWNER' && user.company && !user.company.isOnboarded) {
    redirect('/dashboard/onboarding');
  }
  const hydratedUser = user ? await ensureTrialState(user) : null;
  const plan = hydratedUser ? describePlan(hydratedUser) : null;
  const stripeCheckError = (user as StripeCheckedUser | null)?.stripeSubscriptionCheckError;
  const nameOrEmail = hydratedUser?.name ?? hydratedUser?.email ?? 'Your account';
  const companyLabel = hydratedUser?.company?.name ?? hydratedUser?.companyName ?? 'Personal account';
  const planLabel = plan
    ? plan.planTier === 'PRO_TRIAL'
      ? 'Pro Trial'
      : plan.planTier === 'PRO'
      ? 'Pro'
      : 'Free'
    : 'Plan unknown';
  const planStatus = plan
    ? plan.isTrialActive
      ? `Pro trial until ${formatPlanDate(plan.trialEndsAt)}`
      : plan.effectiveTier === 'PRO'
      ? 'Pro tier'
      : 'Free tier'
    : 'Plan unknown';
  const positionCustomName = (hydratedUser as { positionCustom?: { name?: string | null } } | null)?.positionCustom
    ?.name;
  const showPlan = hydratedUser?.role === 'ADMIN' || hydratedUser?.role === 'OWNER';
  const positionLabel =
    positionCustomName ??
    (hydratedUser?.position ? hydratedUser.position.toLowerCase().replace(/_/g, ' ') : '');
  const displayPosition = positionLabel
    ? positionLabel.charAt(0).toUpperCase() + positionLabel.slice(1)
    : null;
  const initials = (nameOrEmail || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  const userLogo = hydratedUser?.company?.logoUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8">
        {stripeCheckError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-semibold">Payment check issue:</span> {stripeCheckError}
          </div>
        )}

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 shadow-xl">
            <WelcomeConfetti />
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-lg font-semibold text-white ring-1 ring-white/30">
                  {userLogo ? (
                    <img src={userLogo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="space-y-">
                  <h1 className="text-3xl font-semibold text-white">
                    Welcome, <span className="font-semibold text-white">{nameOrEmail}</span>!
                            </h1>
                 
                </div>
              </div>
              {displayPosition ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {displayPosition}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="bg-white/10 px-6 py-5 sm:px-8">
              <div className={`grid gap-4 ${showPlan ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-2'}`}>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">User</p>
                  <p className="text-sm font-semibold text-white">{nameOrEmail}</p>
                  <p className="text-xs text-white/80">{hydratedUser?.email ?? 'No email on file'}</p>
                </div>
                {showPlan && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">Plan</p>
                    <p className="text-sm font-semibold text-white">{planLabel}</p>
                    <p className="text-xs text-white/80">{planStatus}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Company</p>
                  <p className="text-sm font-semibold text-white">{companyLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:bg-purple-50 hover:shadow-lg hover:border-purple-200"
                    >
                      <Icon size={56} className="text-purple-600 transition-colors group-hover:text-purple-700" />
                      <span className="text-base font-semibold text-zinc-800">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {hydratedUser?.role === 'OWNER' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pt-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                  <p className="text-xs font-medium text-zinc-400">Owner settings</p>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {ownerItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:bg-purple-50 hover:shadow-lg hover:border-purple-200"
                      >
                        <Icon size={56} className="text-purple-600 transition-colors group-hover:text-purple-700" />
                        <span className="text-base font-semibold text-zinc-800">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {hydratedUser?.role === 'ADMIN' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pt-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                  <p className="text-xs font-medium text-zinc-400">Admin settings</p>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all hover:bg-purple-50 hover:shadow-lg hover:border-purple-200"
                      >
                        <Icon size={56} className="text-purple-600 transition-colors group-hover:text-purple-700" />
                        <span className="text-base font-semibold text-zinc-800">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
