'use client';

const joinClasses = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');

type UserCompanyHeaderProps = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  companyName?: string | null;
  variant?: 'sidebar' | 'dropdown';
  className?: string;
};

const buildDisplayName = (firstName?: string | null, lastName?: string | null, name?: string | null, email?: string | null) => {
  const composed = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  if (name?.trim()) return name.trim();
  if (email) {
    const [localPart] = email.split('@');
    if (localPart?.trim()) return localPart.trim();
  }
  return 'You';
};

const badgeClasses = (roleLabel: string) =>
  joinClasses(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.3em]',
    roleLabel === 'OWNER'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-50 text-slate-700',
  );

export default function UserCompanyHeader({
  firstName,
  lastName,
  name,
  email,
  role,
  companyName,
  variant = 'sidebar',
  className,
}: UserCompanyHeaderProps) {
  const displayName = buildDisplayName(firstName, lastName, name, email);
  const roleLabel = (role ?? 'USER').toUpperCase();
  const companyLabel = companyName?.trim() || 'Personal Account';

  const containerClass = joinClasses('flex flex-col gap-1 text-left', className);

  if (variant === 'dropdown') {
    return (
      <div className={containerClass}>
        <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
        <p className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-500">
          <span className={badgeClasses(roleLabel)}>{roleLabel}</span>
          <span className="truncate">@ {companyLabel}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <p className="text-lg font-semibold text-zinc-900">{companyLabel}</p>
      <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
      <span className={badgeClasses(roleLabel)}>{roleLabel}</span>
    </div>
  );
}
