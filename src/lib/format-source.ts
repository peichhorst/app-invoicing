const sourceLabelOverrides: Record<string, string> = {
  manually_entered: 'Manually Entered',
  'manually entered': 'Manually Entered',
  booking_form: 'Booking Form',
  'booking form': 'Booking Form',
  referral_program: 'Referral Program',
  'echothread aggregate': 'EchoThread Aggregate',
  'jsearch job': 'JSearch Job',
  'theirstack job': 'TheirStack Job',
  'reddit post': 'Reddit Post',
};

export function formatSourceLabel(value?: string | null, fallback = 'Unknown') {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  const lower = normalized.toLowerCase();
  if (sourceLabelOverrides[lower]) return sourceLabelOverrides[lower];

  const words = normalized
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase()) return word;
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    });

  return words.join(' ') || fallback;
}
