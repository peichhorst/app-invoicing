export const formatCurrency = (value: number, currency?: string) => {
  const normalizedCurrency = (currency ?? 'USD').toUpperCase();
  const amount = value / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
};

export const statusClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  ARCHIVED: 'bg-zinc-100 text-zinc-700',
  DRAFT: 'bg-gray-100 text-gray-800',
};
