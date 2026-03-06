const DAY_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeToLocalDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const ymd = value.toISOString().slice(0, 10);
    return new Date(`${ymd}T12:00:00`);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (DAY_ONLY_RE.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const ymd = parsed.toISOString().slice(0, 10);
  return new Date(`${ymd}T12:00:00`);
}

function startOfDay(date: Date) {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local;
}

export function isPastDueDateByDay(
  dueDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!dueDate) return false;
  const dueLocalDate = normalizeToLocalDate(dueDate);
  if (!dueLocalDate) return false;
  return startOfDay(referenceDate).getTime() > startOfDay(dueLocalDate).getTime();
}
