const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const PART_TYPES = ['year', 'month', 'day', 'hour', 'minute', 'weekday'] as const;

const pad2 = (value: string | number) => String(value).padStart(2, '0');

export const DEFAULT_BUSINESS_TIME_ZONE = 'America/Los_Angeles';

export type DateParts = {
  dateKey: string;
  dayOfWeek: number;
  minutes: number;
};

export function getDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type === 'literal') return acc;
    if (PART_TYPES.includes(part.type as typeof PART_TYPES[number])) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  const dateKey = `${parts.year}-${pad2(parts.month ?? '01')}-${pad2(parts.day ?? '01')}`;
  const dayOfWeek = WEEKDAY_INDEX[parts.weekday ?? 'Sunday'];
  const hour = Number(parts.hour ?? '0');
  const minute = Number(parts.minute ?? '0');
  const minutes = hour * 60 + minute;

  return { dateKey, dayOfWeek, minutes };
}
