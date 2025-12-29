export const daysOfWeek = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export const normalizeSlug = (value?: string | null) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildBookingLink = (slug?: string | null) => {
  if (!slug) return null;
  const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  const relative = `/book/${normalizedSlug}`;
  const host = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : '';
  return host ? `${host}${relative}` : relative;
};
