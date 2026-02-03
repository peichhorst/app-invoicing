const POLYMARKET_API = 'https://gamma-api.polymarket.com';
export type PolymarketOdds = {
  id: string;
  question: string;
  slug?: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  liquidity?: number;
  updatedAt: string;
  tags: string[];
  source: 'live' | 'sample';
};

// Your sample data (unchanged – good fallback)
const sampleOdds: PolymarketOdds[] = [
  {
    id: 'sample-1',
    question: 'Will the U.S. enter a recession in 2025?',
    yesPrice: 0.38,
    noPrice: 0.62,
    updatedAt: new Date().toISOString(),
    tags: ['economy'],
    source: 'sample',
  },
  {
    id: 'sample-2',
    question: 'Will the Fed raise rates at least once in the next 90 days?',
    yesPrice: 0.45,
    noPrice: 0.55,
    updatedAt: new Date().toISOString(),
    tags: ['finance'],
    source: 'sample',
  },
  {
    id: 'sample-3',
    question: 'Will consumer confidence break 100 by the end of the year?',
    yesPrice: 0.21,
    noPrice: 0.79,
    updatedAt: new Date().toISOString(),
    tags: ['economy'],
    source: 'sample',
  },
];

/**
 * Normalizes any price-like value to a number between 0 and 1
 */
const normalizePrice = (value: unknown): number => {
  if (value == null) return NaN;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : NaN;
};

/**
 * Main function – fetches real Polymarket economy/recession-related markets
 */
export async function getPolymarketOdds(): Promise<PolymarketOdds[]> {
  // Start with no params to get all active markets
  const url = new URL(`${POLYMARKET_API}/markets`);
  url.searchParams.set('limit', '100'); // Get more for filtering
  url.searchParams.set('offset', '0');  // Pagination start

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        // No auth needed for public Gamma API
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`Polymarket API error: ${res.status} - ${errorText}`);
      return sampleOdds;
    }

    const data = await res.json();

    // Handle response shapes: direct array or {data: [...]}
    let markets = Array.isArray(data) ? data : data?.data || [];

    if (markets.length === 0) {
      console.warn('No markets returned from API');
      return sampleOdds;
    }

    // Filter for binary (yes/no) markets relevant to economy
    const normalized: PolymarketOdds[] = markets
      .filter((m: any) => {
        // Binary markets typically have 2 outcomes/tokens
        const numOutcomes = (m.outcomes?.length || m.tokens?.length || 0);
        if (numOutcomes !== 2) return false;

        const question = (m.question || m.title || '').toLowerCase().trim();

        // Broader economy/recession focus
        const relevantKeywords = [
          'recession', 'gdp', 'unemployment', 'inflation', 'fed', 'interest rate',
          'consumer confidence', 'economy', 'rates', 'cpi', 'ppi'
        ];
        const isRelevant = relevantKeywords.some(kw => question.includes(kw)) ||
          (m.tags || []).some((t: string) => 
            ['economy', 'finance', 'macro', 'business'].includes(t.toLowerCase())
          );

        // Must be open/active
        const isOpen = m.active !== false && m.state !== 'closed' && m.resolved === false;

        return isRelevant && isOpen;
      })
      .sort((a: any, b: any) => (b.volume24hrs || b.volume || 0) - (a.volume24hrs || a.volume || 0)) // Highest volume first
      .slice(0, 6) // Top 6
      .map((m: any): PolymarketOdds => {
        // Extract prices: outcome_prices is array of strings like ["0.38", "0.62"]
        const outcomePrices: string[] = Array.isArray(m.outcome_prices) ? m.outcome_prices : [];
        let yesPrice = normalizePrice(outcomePrices[0]);
        let noPrice = normalizePrice(outcomePrices[1]);

        // Fallbacks: tokens[].price, yes_price, etc.
        if (Number.isNaN(yesPrice) && m.tokens?.[0]?.price) yesPrice = normalizePrice(m.tokens[0].price);
        if (Number.isNaN(noPrice) && m.tokens?.[1]?.price) noPrice = normalizePrice(m.tokens[1].price);
        if (Number.isNaN(yesPrice) && m.yes_price) yesPrice = normalizePrice(m.yes_price);
        if (Number.isNaN(noPrice) && m.no_price) noPrice = normalizePrice(m.no_price);

        // Ensure they sum ~1
        if (Number.isFinite(yesPrice) && Number.isNaN(noPrice)) {
          noPrice = Math.max(0, Math.min(1, 1 - yesPrice));
        } else if (Number.isFinite(noPrice) && Number.isNaN(yesPrice)) {
          yesPrice = Math.max(0, Math.min(1, 1 - noPrice));
        }

        // Defaults
        yesPrice = Number.isFinite(yesPrice) ? yesPrice : 0.5;
        noPrice = Number.isFinite(noPrice) ? noPrice : 0.5;

        return {
          id: m.id || m.condition_id || m.market_id || String(Math.random()),
          slug: m.slug || m.market_slug,
          question: m.question || m.title || 'Unknown Market',
          yesPrice,
          noPrice,
          volume: Number(m.volume24hrs || m.volume || 0),
          liquidity: Number(m.liquidity || 0),
          updatedAt: m.updated_at || m.updatedAt || m.end_date || new Date().toISOString(),
          tags: Array.isArray(m.tags) ? m.tags.map((t: any) => String(t)) : [],
          source: 'live',
        };
      });

    if (normalized.length === 0) {
      console.warn('No relevant economy markets found, falling back to samples');
      return sampleOdds;
    }

    return normalized;
  } catch (err) {
    console.error('Polymarket fetch error:', err);
    return sampleOdds;
  }
}