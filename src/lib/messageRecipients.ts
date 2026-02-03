const normalizeList = (values: Array<string | null | undefined>) =>
  values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

export const serializeRecipientList = (values?: Array<string | null | undefined> | null) =>
  JSON.stringify(normalizeList(values ?? []));

export const parseRecipientList = (value?: string | string[] | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeList(value);
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return normalizeList(parsed);
  } catch {
    // fall through to comma parsing
  }
  return normalizeList(trimmed.split(','));
};

export const buildListContainsFilter = (value: string) => ({
  contains: JSON.stringify(value),
});
