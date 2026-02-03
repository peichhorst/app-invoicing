import psl from 'psl';

type HunterResult = {
  email?: string | null;
  phone?: string | null;
  confidence?: number;
  type?: string;
  organization?: string;
  domain?: string;
  source?: string;
};

function toRootDomain(inputUrlOrHost?: string | null) {
  if (!inputUrlOrHost) return null;

  let host = inputUrlOrHost.trim();
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;

  try {
    const url = new URL(host);
    const hostname = url.hostname.replace(/^www\./i, '');
    const parsed = psl.parse(hostname);
    if (typeof parsed === 'object' && parsed.domain) return parsed.domain;
    return hostname;
  } catch {
    return null;
  }
}

async function hunterDomainFromCompany(company: string) {
  const url = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(
    company
  )}&api_key=${process.env.HUNTER_API_KEY}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return null;
  const json = await res.json();
  const domain = json?.data?.domain;
  return typeof domain === 'string' && domain.length ? domain : null;
}

async function hunterBestContactFromDomain(domain: string): Promise<HunterResult | null> {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
    domain
  )}&api_key=${process.env.HUNTER_API_KEY}`;

  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  if (!res.ok) {
    return { source: json?.errors?.[0]?.details ?? 'Hunter request failed' };
  }

  const emails = Array.isArray(json?.data?.emails) ? json.data.emails : [];
  const bestEmail = emails
    .slice()
    .sort((a: any, b: any) => (b?.confidence ?? 0) - (a?.confidence ?? 0))[0];

  return {
    email: bestEmail?.value ?? null,
    confidence: bestEmail?.confidence,
    type: bestEmail?.type,
    organization: json?.data?.organization,
    domain: json?.data?.domain,
    source: 'Hunter Domain Search',
  };
}

export async function enrichContact({
  website,
  companyName,
}: {
  website?: string | null;
  companyName?: string | null;
}): Promise<HunterResult & { domain?: string | null } | null> {
  if (!process.env.HUNTER_API_KEY) return null;

  let domain = toRootDomain(website);
  if (!domain && companyName) {
    domain = await hunterDomainFromCompany(companyName);
  }

  if (!domain) return null;

  const best = await hunterBestContactFromDomain(domain);
  if (!best) return null;
  return { ...best, domain };
}
