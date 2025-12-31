export const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export const normalizeSlug = (value?: string | null) => {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const buildVariantSlug = (slug?: string | null, variant?: string | null) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;
  const normalizedVariant = normalizeSlug(variant);
  if (!normalizedVariant) return normalizedSlug;
  return `${normalizedSlug}-${normalizedVariant}`;
};

export const buildBookingLink = (slug?: string | null, variant?: string | null) => {
  const normalizedSlug = buildVariantSlug(slug, variant);
  if (!normalizedSlug) return null;
  const relative = `/book/${normalizedSlug}`;
  const host = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : '';
  return host ? `${host}${relative}` : relative;
};
