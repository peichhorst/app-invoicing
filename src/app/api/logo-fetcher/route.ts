import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
const USER_AGENT = 'LogoFetcher-Bot/1.0 (+https://yourapp.com)';
const AXIOS_TIMEOUT_MS = 5000;
const httpClient = axios.create({
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeout: AXIOS_TIMEOUT_MS,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 400,
});

type LogoFetcherSuccess = {
  success: true;
  logoUrl: string;
  source: string;
};

type LogoFetcherFailure = {
  success: false;
  source: 'fallback';
  message: string;
};

type LogoFetcherResponse = LogoFetcherSuccess | LogoFetcherFailure;

type WordPressSettingsResult = {
  logoUrl?: string;
  siteName?: string;
};

async function fetchWordPressLogo(base: URL): Promise<WordPressSettingsResult> {
  try {
    const settingsUrl = new URL('/wp-json/wp/v2/settings', base).toString();
    const settings = (await httpClient.get(settingsUrl)).data;
    const siteName = typeof settings?.name === 'string' ? settings.name.trim() : undefined;

    const logoId = Number(settings?.site_logo);
    if (!Number.isNaN(logoId)) {
      const mediaUrl = new URL(`/wp-json/wp/v2/media/${logoId}`, base).toString();
      const media = (await httpClient.get(mediaUrl, { headers: { Accept: 'application/json' } })).data;
      const sourceUrl =
        media?.source_url ||
        media?.guid?.rendered ||
        (typeof media?.media_details?.sizes?.full?.source_url === 'string'
          ? media.media_details.sizes.full.source_url
          : undefined);
      if (sourceUrl) {
        const resolvedLogoUrl = resolveAbsoluteUrl(base, sourceUrl);
        if (resolvedLogoUrl) {
          return { logoUrl: resolvedLogoUrl, siteName };
        }
      }
    }

    return { siteName };
  } catch {
    return {};
  }
}

const IMAGE_ATTRS = ['src', 'data-src', 'data-logo', 'data-lazy-src'];

const logoCache = new Map<string, { logoUrl: string; source: string; fetchedAt: number }>();

function getCachedLogo(domain: string) {
  const cached = logoCache.get(domain);
  if (cached && Date.now() - cached.fetchedAt < 30 * 24 * 60 * 60 * 1000) {
    return cached;
  }
  return null;
}

function resolveAbsoluteUrl(base: URL, candidate: string) {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}

function extractImageFromCheerio(element: cheerio.Cheerio<AnyNode>, base: URL) {
  for (const attr of IMAGE_ATTRS) {
    const value = element.attr(attr);
    if (typeof value === 'string' && value.trim()) {
      const resolved = resolveAbsoluteUrl(base, value);
      if (resolved) return resolved;
    }
  }
  const srcset = element.attr('srcset');
  if (srcset) {
    const candidate = srcset.split(',')[0]?.split(' ')[0];
    if (candidate) {
      const resolved = resolveAbsoluteUrl(base, candidate);
      if (resolved) return resolved;
    }
  }
  return null;
}

async function scrapeHomepage(base: URL, siteName?: string): Promise<LogoFetcherSuccess | null> {
  try {
    const page = await httpClient.get(base.toString(), { responseType: 'text' });
    const $ = cheerio.load(page.data);

    const searchOrder: Array<{ selector: string; source: LogoFetcherSuccess['source'] }> = [
      { selector: 'img.et_pb_site_logo', source: 'divi-header' },
      { selector: 'img.logo', source: 'divi-header' },
      { selector: 'img.logo_container img', source: 'divi-header' },
      { selector: 'header img[src*="logo"]', source: 'html-scrape' },
    ];

    for (const entry of searchOrder) {
      const element = $(entry.selector).first();
      if (element.length === 0) continue;
      const logoUrl = extractImageFromCheerio(element, base);
      if (logoUrl) {
        return { success: true, logoUrl, source: entry.source };
      }
    }

    if (siteName) {
      const normalizedName = siteName.toLowerCase();
      const match = $(`img[alt*="${normalizedName}"]`).first();
      if (match.length) {
        const logoUrl = extractImageFromCheerio(match, base);
        if (logoUrl) {
          return { success: true, logoUrl, source: 'html-scrape' };
        }
      }
    }

    const altMatches = $('img[alt]')
      .filter((_, el) => {
        const alt = $(el).attr('alt')?.toLowerCase() ?? '';
        return alt.includes(siteName?.toLowerCase() ?? '') || alt.includes(base.hostname.toLowerCase());
      })
      .first();
    if (altMatches.length) {
      const logoUrl = extractImageFromCheerio(altMatches, base);
      if (logoUrl) return { success: true, logoUrl, source: 'html-scrape' };
    }

    const backgroundCandidates = $('[style*="background"]').get();
    for (const node of backgroundCandidates) {
      const style = $(node).attr('style') ?? '';
      const matches = Array.from(style.matchAll(/url\(([^)]+)\)/gi));
      for (const match of matches) {
        const candidate = match[1].replace(/["']/g, '');
        if (!candidate.toLowerCase().includes('logo')) continue;
        const logoUrl = resolveAbsoluteUrl(base, candidate);
        if (logoUrl) {
          return { success: true, logoUrl, source: 'html-scrape' };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: { url?: string };
  try {
    payload = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json<LogoFetcherResponse>({ success: false, source: 'fallback', message: 'Invalid JSON payload.' });
  }

  const rawUrl = payload?.url?.trim();
  if (!rawUrl) {
    return NextResponse.json<LogoFetcherResponse>({
      success: false,
      source: 'fallback',
      message: 'Website URL is required.',
    });
  }

  let normalizedUrl: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    normalizedUrl = new URL(withProtocol);
  } catch {
    return NextResponse.json<LogoFetcherResponse>({
      success: false,
      source: 'fallback',
      message: 'Unable to parse the website URL.',
    });
  }

  const domain = normalizedUrl.hostname;
  const cached = getCachedLogo(domain);
  if (cached) {
    return NextResponse.json<LogoFetcherResponse>({
      success: true,
      logoUrl: cached.logoUrl,
      source: `${cached.source} (cached)` as LogoFetcherSuccess['source'],
    });
  }

  const wpResult = await fetchWordPressLogo(normalizedUrl);
  if (wpResult.logoUrl) {
    logoCache.set(domain, {
      logoUrl: wpResult.logoUrl,
      source: 'wp-rest-api',
      fetchedAt: Date.now(),
    });
    return NextResponse.json<LogoFetcherResponse>({
      success: true,
      logoUrl: wpResult.logoUrl,
      source: 'wp-rest-api',
    });
  }

  const scraped = await scrapeHomepage(normalizedUrl, wpResult.siteName);
  if (scraped) {
    logoCache.set(domain, {
      logoUrl: scraped.logoUrl,
      source: scraped.source,
      fetchedAt: Date.now(),
    });
    return NextResponse.json<LogoFetcherResponse>(scraped);
  }

  return NextResponse.json<LogoFetcherResponse>({
    success: false,
    source: 'fallback',
    message: 'Unable to find a logo on that site automatically.',
  });
}
