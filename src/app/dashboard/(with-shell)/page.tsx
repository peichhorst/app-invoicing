import { RealisticSun } from '@/components/RealisticSun';
import { RealisticMoon } from '@/components/RealisticMoon';
import LeadsClientsSummary from './LeadsClientsSummary';
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardCalendar } from './DashboardCalendar';
import { AppointmentsSection } from '@/components/AppointmentsSection';
import { getCurrentUser } from '@/lib/auth';
import { describePlan, ensureTrialState } from '@/lib/plan';
import { WelcomeConfetti } from './WelcomeConfetti';
import { Logo } from '@/components/Logo';
import { LiveDateTime } from '@/components/LiveDateTime';
import { UnreadMessagesSection } from '@/components/UnreadMessagesSection';
import { QuickActions } from '@/components/QuickActions';
import { InstallPromptButton } from '@/app/InstallPromptButton';
import { SwitchBackButton } from '@/components/SwitchBackButton';
import EchoThreadSearch from '@/components/EchoThreadSearch';
import type { RevenueDebugData } from '@/types/revenue';
import {
  Users,
  FileText,
  Repeat,
  BarChart2,
  PieChart,
  Wrench,
  FileSignature,
  Files,
  Settings,
  Bell,
  Calendar,
  UserPlus,
  User,
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
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Schedule', href: '/dashboard/scheduling', icon: Calendar },
  { label: 'Leads', href: '/dashboard/leads', icon: UserPlus },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  {
    label: 'Proposals',
    href: '/dashboard/proposals',
    icon: FileText,
  },
  {
    label: 'Contracts',
    href: '/dashboard/contracts',
    icon: FileSignature,
  },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Recurring Payments', href: '/dashboard/recurring', icon: Repeat },
  // Reporting and Compliance will be conditionally added below
  { label: 'Messaging', href: '/dashboard/messaging', icon: Bell },
  { label: 'Team', href: '/dashboard/team', icon: Users },
  { label: 'Resources', href: '/dashboard/resources', icon: Files },
];

const ownerItems: { label: string; href: string; icon: any }[] = [];
const superAdminItems = [{ label: 'Users', href: '/dashboard/admin/users', icon: Users }];

export default async function Page() {
  const user = await getCurrentUser();
  const hydratedUser = user ? await ensureTrialState(user) : null;
  // Format day, date, and time for display above greeting
  let dateTimeString = '';
  try {
    const now = new Date();
    let options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    if (hydratedUser?.timezone) {
      dateTimeString = now.toLocaleString('en-US', { ...options, timeZone: hydratedUser.timezone });
    } else {
      dateTimeString = now.toLocaleString('en-US', options);
    }
  } catch {}
  const plan = hydratedUser ? describePlan(hydratedUser) : null;
  const stripeCheckError = (user as StripeCheckedUser | null)?.stripeSubscriptionCheckError;
  const nameOrEmail = hydratedUser?.name ?? hydratedUser?.email ?? 'Your account';
  // Determine greeting based on time of day (user's timezone if available)
  let greeting = 'Welcome';
  let greetingIcon = <RealisticSun variant="afternoon" size={64} />;
  let greetingTime = 'afternoon';
  try {
    const now = new Date();
    let hour = now.getHours();
    if (hydratedUser?.timezone) {
      const localeTime = now.toLocaleString('en-US', { timeZone: hydratedUser.timezone });
      hour = new Date(localeTime).getHours();
    }
    let sunVariant: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (hour >= 5 && hour < 12) {
      sunVariant = 'morning';
      greetingIcon = <RealisticSun variant="morning" size={64} />;
      greetingTime = 'morning';
    } else if (hour >= 12 && hour < 18) {
      sunVariant = 'afternoon';
      greetingIcon = <RealisticSun variant="afternoon" size={64} />;
      greetingTime = 'afternoon';
    } else {
      sunVariant = 'evening';
      greetingIcon = <RealisticMoon size={80} />;
      greetingTime = 'evening';
    }
  } catch {}
  const companyLabel = hydratedUser?.company?.name ?? hydratedUser?.companyName ?? 'Personal account';
  const companyLogoUrl = hydratedUser?.company?.logoUrl?.trim() ? hydratedUser.company.logoUrl : null;
  const companyIconUrl = hydratedUser?.company?.iconUrl?.trim() ? hydratedUser.company.iconUrl : null;
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
  const showPlan = hydratedUser?.role === 'ADMIN' || hydratedUser?.role === 'OWNER' || hydratedUser?.role === 'SUPERADMIN';
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
  const userAvatar = hydratedUser?.logoDataUrl;

  // Fetch bookings for calendar
  let bookings: any[] = [];
  let totalRevenueDebug: RevenueDebugData | null = null;
  if (hydratedUser?.id) {
    const prisma = (await import('@/lib/prisma')).default;
    bookings = await prisma.booking.findMany({
      where: { userId: hydratedUser.id },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
        notes: true,
        status: true,
        createdAt: true,
      },
    });
  }
  if (hydratedUser?.company?.id) {
    const prisma = (await import('@/lib/prisma')).default;
    const companyFilter = {
      status: 'PAID' as const,
      OR: [
        { client: { companyId: hydratedUser.company.id } },
        { user: { companyId: hydratedUser.company.id } },
      ],
    };
    const paidInvoices = await prisma.invoice.findMany({
      where: companyFilter,
      orderBy: [
        { paidAt: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        createdAt: true,
        paidAt: true,
        status: true,
        total: true,
      },
    });
    let sinceDate: Date | null = null;
    for (const invoice of paidInvoices) {
      if (invoice.paidAt) {
        sinceDate = invoice.paidAt;
        break;
      }
    }
    if (!sinceDate && paidInvoices.length > 0) {
      sinceDate = paidInvoices[0].createdAt;
    }
    const total = paidInvoices.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
    totalRevenueDebug = {
      total,
      sinceDate,
      invoices: paidInvoices,
    };
  }

  // Combine all items into one array for the grid
  const isOwnerOrAdmin = hydratedUser?.role === 'OWNER' || hydratedUser?.role === 'ADMIN' || hydratedUser?.role === 'SUPERADMIN';
  // Add Reporting and Compliance only for superadmin, admin, or owner
  let filteredNavItems = [...navItems];
  if (isOwnerOrAdmin) {
    filteredNavItems.push(
      { label: 'Reporting', href: '/dashboard/reporting', icon: BarChart2 },
      { label: 'Compliance', href: '/dashboard/compliance', icon: PieChart }
    );
  }
  // Filter Team button for non-admin/owner/superadmin roles
  filteredNavItems = filteredNavItems.filter(
    (item) => item.label !== 'Team' || isOwnerOrAdmin
  );
  const allItems = [
    ...filteredNavItems,
    ...(isOwnerOrAdmin ? ownerItems : []),
    ...(hydratedUser?.role === 'SUPERADMIN' ? superAdminItems : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
        {stripeCheckError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-semibold">Payment check issue:</span> {stripeCheckError}
          </div>
        )}

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-brand-primary-600">
            <WelcomeConfetti />
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
              <div className="flex flex-row items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center" style={{ minWidth: 48, minHeight: 48 }}>
                  {greetingIcon}
                </div>
                <div className="flex flex-col justify-center">
                  <LiveDateTime timezone={hydratedUser?.timezone} />
                  <h1 className="text-3xl font-semibold text-brand-primary-700">
                    {`Good ${greetingTime}, `}
                    <span className="font-semibold text-brand-primary-700">{hydratedUser?.name?.split(' ')[0] ?? 'User'}</span>!
                  </h1>
                </div>
              </div>
              {/* Settings button and plan info on the top right */}
              <div className="flex items-center justify-end gap-6">
                {showPlan && (
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Plan</p>
                    <p className="text-sm font-semibold text-zinc-900">{planLabel}</p>
                    <p className="text-xs text-zinc-700">{planStatus}</p>
                  </div>
                )}
                <Link href="/dashboard/settings" className="inline-flex items-center justify-center rounded-full p-2 text-brand-primary-700 hover:bg-brand-primary-50 focus:outline-none focus:ring-2 focus:ring-brand-primary-600">
                  <Settings size={28} />
                  <span className="sr-only">Settings</span>
                </Link>
              </div>
              {/* Company info removed from here; will be placed below in the info grid */}
            </div>
              <div className="bg-zinc-50 px-6 py-5 sm:px-8">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-primary-600 bg-white/80 px-4 py-3 shadow-sm text-center">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt="Company logo"
                      className="h-16 w-full max-w-[200px] object-contain"
                    />
                  ) : companyIconUrl ? (
                    <img src={companyIconUrl} alt="Company icon" className="h-12 w-12 object-contain" />
                  ) : (
                    <div
                      className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 text-center text-sm font-semibold flex items-center justify-center"
                      style={{
                        background: hydratedUser?.company?.primaryColor || 'var(--color-brand-primary-700)',
                        color: 'var(--color-brand-contrast)',
                      }}
                    >
                      {companyLabel
                        .split(' ')
                        .filter(Boolean)
                        .map((word) => word[0]?.toUpperCase() ?? '')
                        .join('')}
                    </div>
                  )}
                  {!companyLogoUrl && (
                    <span className="text-sm font-semibold text-brand-primary-700">{companyLabel}</span>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-brand-primary-600 bg-white/80 px-4 py-3 shadow-sm text-center">
                  <div
                    className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 text-center text-sm font-semibold flex items-center justify-center"
                    style={{
                      background: hydratedUser?.company?.primaryColor || 'var(--color-brand-primary-700)',
                      color: 'var(--color-brand-contrast)',
                    }}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col gap-0">
                    <span className="text-sm font-semibold text-zinc-900 text-center">{hydratedUser?.name ?? hydratedUser?.email ?? 'Your account'}</span>
                    {displayPosition && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700 text-center">
                        {displayPosition}
                      </span>
                    )}
                  </div>
                </div>
                  <div className="w-full flex flex-col h-full min-h-[120px] p-0 m-0">
                    <UnreadMessagesSection />
                </div>
                  <div className="w-full flex flex-col h-full min-h-[120px] p-0 m-0">
                    <QuickActions />
                  </div>
              </div>
              {/* Unread Messages and Revenue grid */}
            </div>
            {/* Unread Messages Section below welcome/info grid */}
            {/* Unread Messages Section above business summary */}
          </div>
          </div>


          {/* Unread Messages Section above business summary */}
          {/* Leads & Clients Summary Section */}
          <LeadsClientsSummary companyId={hydratedUser?.company?.id} totalRevenueDebug={totalRevenueDebug} />


          {/* Appointments Section added below hero */}
          <AppointmentsSection bookings={bookings} timezone={hydratedUser?.timezone ?? 'UTC'} />

          <EchoThreadSearch />

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:hidden">
                {allItems.map((item) => {
                  const Icon = item.icon;
                  if (!item.href || item.href === "") return null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group m-[1px] flex flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm text-[var(--color-brand-logo-text)] transition-all hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] hover:shadow-lg hover:border-brand-primary-700"
                    >
                      <Icon
                        size={56}
                        className="text-[var(--color-brand-logo-text)] transition-colors group-hover:text-[var(--color-brand-contrast)]"
                      />
                      <span className="text-base font-semibold text-[var(--color-brand-logo-text)] transition-colors group-hover:text-[var(--color-brand-contrast)]">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <InstallPromptButton className="transition duration-300" />
                  <SwitchBackButton className="transition duration-300" />
                </div>
              </div>
        </div>
  );
}
