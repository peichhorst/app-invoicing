type DatabaseSource = 'DATABASE_URL' | 'DIRECT_URL' | null;

export type DatabaseRuntimeConfig = {
  ok: boolean;
  source: DatabaseSource;
  resolvedUrl: string | null;
  errors: string[];
  warnings: string[];
};

const ensureQueryParam = (url: string, key: string, value: string) => {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

export const normalizeDatabaseUrl = (url?: string) => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const isSupabasePooler = parsed.hostname.endsWith('.pooler.supabase.com');
    const usesTransactionPooler =
      parsed.port === '6543' || parsed.searchParams.get('pgbouncer') === 'true';
    if (isSupabasePooler && usesTransactionPooler) {
      let normalized = ensureQueryParam(url, 'pgbouncer', 'true');
      normalized = ensureQueryParam(normalized, 'statement_cache_size', '0');
      return normalized;
    }
  } catch {
    return url;
  }
  return url;
};

export const getDatabaseRuntimeConfig = (env: NodeJS.ProcessEnv): DatabaseRuntimeConfig => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedDatabaseUrl = normalizeDatabaseUrl(env.DATABASE_URL);
  const normalizedDirectUrl = normalizeDatabaseUrl(env.DIRECT_URL);

  const source: DatabaseSource = normalizedDatabaseUrl
    ? 'DATABASE_URL'
    : normalizedDirectUrl
      ? 'DIRECT_URL'
      : null;

  const resolvedUrl = normalizedDatabaseUrl || normalizedDirectUrl || null;

  if (!resolvedUrl) {
    errors.push('Both DATABASE_URL and DIRECT_URL are missing.');
  }

  if (!normalizedDatabaseUrl && normalizedDirectUrl) {
    warnings.push('DATABASE_URL is missing. Runtime is falling back to DIRECT_URL.');
  }

  return {
    ok: errors.length === 0,
    source,
    resolvedUrl,
    errors,
    warnings,
  };
};

export const maskDatabaseUrl = (url?: string | null) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
};
