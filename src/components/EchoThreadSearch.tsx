"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INDUSTRY_KEYWORDS, OTHER_INDUSTRY_VALUE } from '@/constants/industry';

type RedditPost = {
  id: string;
  title: string;
  selftext?: string;
  permalink: string;
  subreddit: string;
  author?: string;
  ups?: number;
  created_utc?: number;
};

type JobPosting = {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_website?: string;
  companyWebsite?: string;
  companyDomain?: string;
  job_description?: string;
  job_location?: string;
  job_city?: string;
  job_country?: string;
  job_employment_type?: string;
  job_employment_types?: string[];
  job_apply_link?: string;
  job_google_link?: string;
  company?: string;
  location?: string;
  description?: string;
  job_publisher?: string;
  url?: string;
  applyLink?: string;
  domain?: string;
  enrichment?: { domain?: string };
};

type SearchResult = {
  id: string;
  title: string;
  body: string;
  link: string;
  meta: string;
  sourceType: 'jobs' | 'reddit' | 'theirstack' | 'jobdetails';
  description?: string;
  company?: string;
  author?: string;
  applyUrl?: string;
  applyLink?: string;
  contactName?: string;
  uiKey?: string;
  domain?: string;
  companyDomain?: string;
  companyWebsite?: string;
};

type SourceState = {
  jobdetails: boolean;
  theirstack: boolean;
  jobs: boolean;
  reddit: boolean;
};

type SourceKey = keyof SourceState;

type DashboardSearchUser = {
  city?: string | null;
  company?: {
    city?: string | null;
    industry?: string | null;
  } | null;
};

const buildLocationClause = (city?: string | null) => {
  const trimmedCity = city?.trim();
  return trimmedCity ? `("${trimmedCity}" OR "near me")` : '';
};

const getIndustryKeywords = (industry?: string | null) => {
  const selectedIndustry = industry?.trim();
  const lookupKey =
    selectedIndustry && INDUSTRY_KEYWORDS[selectedIndustry] ? selectedIndustry : OTHER_INDUSTRY_VALUE;
  return INDUSTRY_KEYWORDS[lookupKey] ?? INDUSTRY_KEYWORDS[OTHER_INDUSTRY_VALUE] ?? [];
};

const buildIndustryQuery = (industry?: string | null, city?: string | null) => {
  const keywords = getIndustryKeywords(industry);
  const keywordClause = keywords.join(' OR ');
  const locationClause = buildLocationClause(city);
  return locationClause ? `(${keywordClause}) ${locationClause}` : `(${keywordClause})`;
};

const formatDate = (timestamp?: number) =>
  timestamp ? new Date(timestamp * 1000).toLocaleDateString() : 'Unknown date';

const formatNameFromEmail = (email?: string | null) => {
  if (!email) return '';
  const [local] = email.split('@');
  if (!local) return '';
  const segments = local.split(/[\._-]+/).filter(Boolean);
  if (!segments.length) return local;
  return segments
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
};

const extractDomainFromUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const normalized = value.includes('://') ? value : `https://${value}`;
    const url = new URL(normalized);
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return undefined;
  }
};

const DEFAULT_SOURCES: SourceState = {
  jobdetails: true,
  theirstack: false,
  jobs: false,
  reddit: false,
};

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'jobdetails', label: 'Aggregated' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'reddit', label: 'Reddit' },
];

export default function EchoThreadSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sources, setSources] = useState<SourceState>(DEFAULT_SOURCES);
  const [debugSourceLog, setDebugSourceLog] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedResultKeys, setSavedResultKeys] = useState<string[]>([]);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [currentUser, setCurrentUser] = useState<DashboardSearchUser | null>(null);
  const [savedLeadIds, setSavedLeadIds] = useState<Record<string, string>>({});
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('dashboard-search-saved-keys');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setSavedResultKeys(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSavedResultKeys([]);
      }
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('dashboard-open-echo-thread-search', handleOpen);
    return () => {
      window.removeEventListener('dashboard-open-echo-thread-search', handleOpen);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return;
        const payload = await response.json();
        if (!active || !payload?.user) return;
        const user = payload.user;
        setCurrentUser({
          city: user.city ?? null,
          company: {
            city: user.company?.city ?? null,
            industry: user.company?.industry ?? null,
          },
        });
      } catch (error) {
        console.error('Failed to fetch dashboard user', error);
      }
    };
    void fetchUser();
    return () => {
      active = false;
    };
  }, []);

  const currentUserCity = useMemo(() => {
    const city = currentUser?.company?.city ?? currentUser?.city;
    return city?.trim() ?? '';
  }, [currentUser]);

  const currentUserIndustry = useMemo(() => {
    return currentUser?.company?.industry?.trim() ?? '';
  }, [currentUser]);
  const locationClause = useMemo(() => buildLocationClause(currentUserCity || undefined), [currentUserCity]);
  const keywordButtons = useMemo(() => getIndustryKeywords(currentUserIndustry).slice(0, 5), [currentUserIndustry]);

  const persistSavedKeys = (keys: string[]) => {
    setSavedResultKeys(keys);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-search-saved-keys', JSON.stringify(keys));
    }
  };
  const getResultKey = useCallback(
    (result: SearchResult) => result.uiKey ?? `${result.sourceType}-${result.id}`,
    []
  );

  const handleSearch = useCallback(
    async (overrideQuery?: string, options?: { triggered?: boolean }) => {
      if (options?.triggered) setSearchTriggered(true);
      const baseQuery = overrideQuery ?? queryRef.current;
      const trimmedQuery = baseQuery?.trim() ?? '';
      const defaultIndustryQuery = buildIndustryQuery(currentUserIndustry, currentUserCity);
      const q = trimmedQuery || defaultIndustryQuery;
      if (!q.trim()) return;
      setSearchTriggered(true);
    setDebugSourceLog('');
    if (!sources.reddit && !sources.jobs && !sources.theirstack && !sources.jobdetails) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const normalized: SearchResult[] = [];

      if (sources.jobdetails) {
        setDebugSourceLog('Job Details: requesting data...');
        const jobDetailsUrl = `https://echothread-eta.vercel.app/api/job-details?q=${encodeURIComponent(q)}`;
        const jobDetailsRes = await fetch(jobDetailsUrl);
        if (!jobDetailsRes.ok) throw new Error('Failed to fetch Job Details');
        const jobDetailsData = await jobDetailsRes.json();
        const jobDetailsResults =
          Array.isArray(jobDetailsData?.results) || Array.isArray(jobDetailsData?.data)
            ? (jobDetailsData.results ?? jobDetailsData.data)
            : [];
        setDebugSourceLog(`Job Details: returned ${jobDetailsResults.length} records`);
        normalized.push(
          ...jobDetailsResults.map((job: any, idx: number) => {
            const applyUrl =
              job.applyLink ||
              job.job_apply_link ||
              job.job_google_link ||
              job.url ||
              job.job_id ||
              undefined;
            const link =
              applyUrl ||
              job.url ||
              job.job_apply_link ||
              job.job_google_link ||
              job.id ||
              job.job_id ||
              '#';
            const companyLabel =
              job.company || job.employer_name || job.job_publisher || 'Job Details';
            const locationLabel = job.location || job.job_location || job.job_city || 'Remote';
            const employmentType =
              job.job_employment_type ||
              (Array.isArray(job.job_employment_types) ? job.job_employment_types[0] : undefined) ||
              'Job Details';
            const metaParts = [
              companyLabel,
              locationLabel,
              employmentType !== 'Job Details' ? employmentType : null,
            ].filter(Boolean);
            const domainLabel =
              job.domain ||
              job.companyDomain ||
              job.enrichment?.domain ||
              extractDomainFromUrl(job.companyWebsite) ||
              extractDomainFromUrl(applyUrl) ||
              extractDomainFromUrl(job.url);

            return {
              id: job.id || job.job_id || `jobdetails-${idx}`,
              title: job.title || job.job_title || 'Job Details',
              body:
                (job.description || job.job_description)
                  ?.split('\n')
                  .slice(0, 5)
                  .join(' ') || 'No description provided.',
              link,
              meta: metaParts.join(' • '),
              sourceType: 'jobdetails' as const,
              description: job.description || job.job_description,
              company: companyLabel,
              applyUrl: applyUrl || undefined,
              domain: domainLabel ?? undefined,
              companyWebsite: job.companyWebsite || job.url || undefined,
              companyDomain: job.companyDomain ?? domainLabel ?? undefined,
              uiKey: `jobdetails-${job.id || job.job_id || idx}`,
            };
          })
        );
      }

      if (sources.theirstack) {
        const theirStackUrl = `https://echothread-eta.vercel.app/api/theirstack?q=${encodeURIComponent(q)}`;
        const theirStackRes = await fetch(theirStackUrl);
        if (!theirStackRes.ok) throw new Error('Failed to fetch TheirStack results');
        const theirStackData = await theirStackRes.json();
        const theirStackJobs = Array.isArray(theirStackData?.data) ? theirStackData.data : [];
        normalized.push(
          ...theirStackJobs.map((job: any, idx: number) => {
            const url = job.final_url || job.url || '#';
            const domainLabel = job.domain || extractDomainFromUrl(job.final_url) || extractDomainFromUrl(job.url);
            return {
              id: String(job.id),
              title: job.job_title,
              body: job.description?.split('\n').slice(0, 5).join(' ') || 'No description provided.',
              link: url,
              meta: `${job.company || 'TheirStack'} • ${job.location || job.short_location || 'Remote'} • ${
                job.seniority ? job.seniority.replace(/_/g, ' ') : 'Opportunity'
              }`,
              sourceType: 'theirstack' as const,
              description: job.description,
              company: job.company,
              applyUrl: url,
              domain: domainLabel ?? undefined,
              companyWebsite: job.website || job.final_url || job.url,
              companyDomain: job.domain || domainLabel,
              uiKey: `theirstack-${job.id}-${idx}`,
            };
          })
        );
      }

      if (sources.reddit) {
        const redditUrl = `https://echothread-eta.vercel.app/api/reddit-search?q=${encodeURIComponent(q)}`;
        const redditRes = await fetch(redditUrl);
        if (!redditRes.ok) throw new Error('Failed to fetch Reddit results');
        const redditData = await redditRes.json();
        const redditChildren: RedditPost[] =
          redditData?.data?.children?.map((child: any) => child.data) || [];
        normalized.push(
          ...redditChildren.map((post, idx) => {
            const redditLink = `https://reddit.com${post.permalink}`;
            return {
              id: post.id,
              title: post.title,
              body: post.selftext || 'No text preview available.',
              link: redditLink,
              meta: `r/${post.subreddit} • ${post.ups ?? 0} upvotes • ${formatDate(post.created_utc)}`,
              sourceType: 'reddit' as const,
              description: post.selftext,
              author: post.author,
              applyUrl: redditLink,
              domain: extractDomainFromUrl(redditLink),
              uiKey: `reddit-${post.id}-${idx}`,
            };
          })
        );
      }

      if (sources.jobs) {
        const jobUrl = `https://echothread-eta.vercel.app/api/jobs?q=${encodeURIComponent(q)}`;
        const jobRes = await fetch(jobUrl);
        if (!jobRes.ok) throw new Error('Failed to fetch job results');
        const jobData = await jobRes.json();
        const jobResults: JobPosting[] = Array.isArray(jobData?.data) ? jobData.data : [];
        normalized.push(
          ...jobResults.map((job, idx) => {
            const applyLink = job.job_apply_link || job.job_google_link || '#';
            const domainLabel =
              job.domain ||
              job.companyDomain ||
              extractDomainFromUrl(job.companyWebsite) ||
              extractDomainFromUrl(job.employer_website) ||
              extractDomainFromUrl(applyLink);
            return {
              id: job.job_id,
              title: job.job_title,
              body:
                job.job_description?.split('\n').slice(0, 5).join(' ') || 'No description provided.',
              link: applyLink,
              meta: `${job.employer_name} • ${job.job_location || job.job_city || 'Remote'} • ${
                job.job_employment_type || 'Job'
              }`,
              sourceType: 'jobs' as const,
              description: job.job_description,
              company: job.employer_name,
              applyUrl: applyLink,
              domain: domainLabel ?? undefined,
              companyWebsite: job.companyWebsite ?? job.employer_website ?? applyLink,
              companyDomain: job.companyDomain ?? domainLabel ?? undefined,
              uiKey: `jobs-${job.job_id}-${idx}`,
            };
          })
        );
      }

      setResults(normalized);
    } catch (err) {
      console.error('Error fetching search results', err);
      setDebugSourceLog(`Search error: ${(err as Error).message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, sources, currentUserCity, currentUserIndustry]);

  const handleKeywordButtonClick = useCallback(
    (keyword: string) => {
      const queryForKeyword = locationClause ? `(${keyword}) ${locationClause}` : `(${keyword})`;
      setQuery(queryForKeyword);
      void handleSearch(queryForKeyword, { triggered: true });
    },
    [handleSearch, locationClause]
  );

  const emptyStateCopy = useMemo(() => {
    if (
      !sources.theirstack &&
      !sources.reddit &&
      !sources.jobs &&
      !sources.jobdetails
    )
      return 'Select at least one source to search.';
    if (loading) return 'Searching for opportunities...';
    if (!query.trim()) return 'Enter a query to find posts!';
    return `No results found for "${query.trim()}". Try another term.`;
  }, [loading, query, sources]);

  const handleSaveLead = useCallback(
    async (result: SearchResult) => {
      if (!result || savingId) return;
      const resultKey = getResultKey(result);
      setSavingId(resultKey);
      const applyLink = result.applyUrl ?? result.applyLink ?? result.link;
      const notesParts = [
        result.title,
        result.company ? `Company: ${result.company}` : undefined,
        result.description ?? result.body,
        applyLink ? `Apply Link: ${applyLink}` : undefined,
      ];
      const normalizedDomain =
        result.companyDomain ||
        result.domain ||
        extractDomainFromUrl(result.companyWebsite) ||
        extractDomainFromUrl(applyLink) ||
        undefined;
      const companyMeta = normalizedDomain
        ? await (async () => {
            try {
              const metaRes = await fetch('/api/company-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: normalizedDomain }),
              });
              if (metaRes.ok) {
                return metaRes.json();
              }
            } catch (err) {
              console.error('Company meta error', err);
            }
            return null;
          })()
        : null;
      if (companyMeta?.phone) {
        notesParts.push(`Phone: ${companyMeta.phone}`);
      }
      if (companyMeta?.industry) {
        notesParts.push(`Industry: ${companyMeta.industry}`);
      }
      if (companyMeta?.facebook_url) {
        notesParts.push(`Facebook: ${companyMeta.facebook_url}`);
      }
      if (companyMeta?.linkedin_url) {
        notesParts.push(`LinkedIn: ${companyMeta.linkedin_url}`);
      }
      if (companyMeta?.email) {
        notesParts.push(`Company Email: ${companyMeta.email}`);
      }
      if (normalizedDomain) {
        notesParts.push(`Domain: ${normalizedDomain}`);
      }
      try {
        const enrichedContact = await (async () => {
          try {
            const payloadRes = await fetch('/api/enrich-lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyName: result.company || result.author || undefined,
                website: result.applyUrl || result.link || undefined,
              }),
            });
            if (payloadRes.ok) {
              const json = await payloadRes.json();
              return { email: json?.email ?? null };
            }
          } catch (err) {
            console.error('Enrichment error', err);
          }
          return null;
        })();

        const enrichedEmail = enrichedContact?.email ?? null;
        const metaEmail = companyMeta?.email ?? null;
        const candidateEmail = enrichedEmail || metaEmail;
        const companyPhone = companyMeta?.phone ?? undefined;

        const companyName = result.company || result.author || 'Lead';
        const contactName =
          (candidateEmail ? formatNameFromEmail(candidateEmail) : '') ||
          result.contactName ||
          result.author ||
          'Lead';

        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            contactName: contactName || undefined,
            email: candidateEmail,
            phone: companyPhone,
            website: normalizedDomain,
            notes: notesParts.filter(Boolean).join('\n'),
            source:
              result.sourceType === 'jobs'
                ? 'JSearch Job'
                : result.sourceType === 'jobdetails'
                ? 'EchoThread Aggregate'
                : result.sourceType === 'theirstack'
                ? 'TheirStack Job'
                : 'Reddit Post',
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          let payload;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch {
            payload = null;
          }
          throw new Error(payload?.error || text || 'Failed to save lead');
        }
        const lead = await res.json();
        const nextSavedKeys = Array.from(new Set([...savedResultKeys, resultKey]));
        persistSavedKeys(nextSavedKeys);
        setSavedLeadIds((prev) => ({
          ...prev,
          [resultKey]: lead.id,
        }));
      } catch (error) {
        console.error('Failed to save lead', error);
        window.alert('Unable to save lead at the moment.');
      } finally {
        setSavingId(null);
      }
  },
    [savingId, getResultKey, savedResultKeys]
  );

  const prevSourcesRef = useRef(sources);
  useEffect(() => {
    if (!isOpen || !queryRef.current?.trim() || !searchTriggered) return;
    const prevSources = prevSourcesRef.current;
    if (
      prevSources.reddit === sources.reddit &&
      prevSources.jobs === sources.jobs &&
      prevSources.theirstack === sources.theirstack &&
      prevSources.jobdetails === sources.jobdetails
    )
      return;
    prevSourcesRef.current = sources;
    handleSearch();
  }, [handleSearch, isOpen, sources]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Opportunity Search</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-800 transition"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-2">
              {debugSourceLog && (
                <p className="mt-2 text-xs text-rose-600">{debugSourceLog}</p>
              )}
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="pt-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Try:</span>
                {keywordButtons.map((keyword) => (
                  <button
                    type="button"
                    key={keyword}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                    onClick={() => handleKeywordButtonClick(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., remote node developer"
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-brand-primary-600 focus:outline-none focus:ring-2 focus:ring-brand-primary-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={() => void handleSearch()}
                  disabled={
                    loading ||
                    (!sources.theirstack && !sources.reddit && !sources.jobs && !sources.jobdetails)
                  }
                  className="rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Sources:</span>
                {SOURCE_OPTIONS.map((option) => (
                  <label key={option.key} className="inline-flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={sources[option.key]}
                      onChange={() => setSources((prev) => ({ ...prev, [option.key]: !prev[option.key] }))}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-2 focus:ring-brand-primary-400"
                    />
                    {option.label}
                  </label>
                ))}
              </div>

              <div className="mt-6 max-h-[50vh] overflow-y-auto pr-8">
              {results.length > 0 ? (
                <div className="space-y-6">
                    {results.map((item, index) => (
                    <div
                      key={`${item.sourceType}-${item.id}-${index}`}
                      className="border-b border-zinc-200 pb-4 last:border-none"
                    >
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-lg font-semibold text-brand-primary-600 hover:underline"
                        >
                          {item.title}
                       </a>
                    <p className="mt-1 text-xs text-zinc-700 px-01">{item.meta}</p>

                        <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{item.body}</p>
                        <div className="mt-3 flex justify-start">
                          {(() => {
                            const resultKey = getResultKey(item);
                            const isSaved = savedResultKeys.includes(resultKey);
                            const viewLeadId = savedLeadIds[resultKey];
                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleSaveLead(item)}
                                  disabled={savingId === resultKey || isSaved}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                    isSaved
                                      ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                                      : 'border-zinc-200 text-zinc-700 hover:border-brand-primary-300 hover:bg-brand-primary-50'
                                  }`}
                                >
                                  {savingId === resultKey
                                    ? 'Saving...'
                                    : isSaved
                                    ? 'Lead Saved'
                                    : 'Save as Lead'}
                                </button>
                                {isSaved && viewLeadId && (
                                  <Link
                                    href={`/dashboard/leads/${viewLeadId}`}
                                    className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-600"
                                  >
                                    View Lead
                                  </Link>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchTriggered ? (
                  <p className="py-8 text-center text-sm text-zinc-500">{emptyStateCopy}</p>
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-500 text-zinc-400">Enter a query and hit search to surface opportunities.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
