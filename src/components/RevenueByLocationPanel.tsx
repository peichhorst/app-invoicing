'use client';

import { ToolsSnapshot } from '@/lib/toolsSnapshot';

type City = {
  city: string;
  state: string;
  lon: number;
  lat: number;
  population: number;
  marketTier?: 'major' | 'large' | 'mid' | 'small';
};

type CityWithRevenue = City & {
  revenue: number;
  radius: number;
};

type SnapshotWithAdditionalCities = ToolsSnapshot & {
  additionalCities?: Array<{
    city?: string;
    state?: string;
    population?: number;
    lat?: number;
    lon?: number;
    latitude?: number;
    longitude?: number;
    marketTier?: City['marketTier'];
  }>;
};

const OTHER_CITIES_REVENUE = 8_500;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// Deterministic pseudo-random noise keeps server/client renders in sync.
const stableNoise = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
};

const estimateRevenue = (
  population: number,
  salesTaxRate: number,
  tier?: string,
  seed = 'default',
) => {
  const base = tier === 'major' ? 3.2 : tier === 'large' ? 2.8 : tier === 'mid' ? 2.4 : 1.9;
  const taxMultiplier = 1 + salesTaxRate * 2.5;
  const noise = 0.9 + stableNoise(seed) * 0.2;
  return Math.round(population * base * taxMultiplier * noise);
};

const getRadius = (revenue: number) => Math.max(12, Math.min(38, 8 + revenue / 900));

const parseRate = (value?: string | number | null): number => {
  if (!value) return 0.06;
  if (typeof value === 'number') return value > 1 ? value / 100 : value;
  const num = parseFloat(String(value).replace('%', ''));
  return Number.isNaN(num) ? 0.06 : num > 1 ? num / 100 : num;
};

const pickNumber = (...vals: Array<number | null | undefined>) =>
  vals.find(v => typeof v === 'number' && !Number.isNaN(v)) as number | undefined;

type Props = { snapshot: ToolsSnapshot | null };

export default function RevenueByLocationPanel({ snapshot }: Props) {
  const s = snapshot as SnapshotWithAdditionalCities | null;

  const salesTaxRate = parseRate(s?.salesTax?.total_rate ?? s?.salesTax?.state_rate ?? 0.07);

  // Build city list from snapshot
  const cities: City[] = [];

  const name = s?.city?.name ?? s?.search?.city;
  const state = s?.city?.state ?? s?.search?.state;

  // ToolsSnapshot.search is likely { city, state, zip } (no population/lon/lat)
  // ToolsSnapshot.city (per your TS error) has population + latitude/longitude
  const population = pickNumber(s?.city?.population, (s?.search as any)?.population) ?? 1_000_000;

  const lon =
    pickNumber(s?.city?.longitude, (s?.city as any)?.lon, (s?.search as any)?.lon) ?? -98.5;

  const lat =
    pickNumber(s?.city?.latitude, (s?.city as any)?.lat, (s?.search as any)?.lat) ?? 39.8;

  if (name && state) {
    cities.push({
      city: name,
      state,
      lon,
      lat,
      population,
      marketTier: population > 2_500_000 ? 'major' : population > 1_000_000 ? 'large' : 'mid',
    });
  }

  // Optional: support multiple cities if present
  if (s?.additionalCities?.length) {
    cities.push(
      ...s.additionalCities.map((c) => ({
        city: c.city ?? 'Unknown',
        state: c.state ?? '??',
        lon: pickNumber(c.lon, c.longitude) ?? -98.5,
        lat: pickNumber(c.lat, c.latitude) ?? 39.8,
        population: c.population ?? 500_000,
        marketTier: c.marketTier,
      }))
    );
  }

  const citiesWithRevenue: CityWithRevenue[] = cities.map((c) => {
    const seed = `${c.city}-${c.state}-${c.population}-${c.lon}-${c.lat}`;
    const revenue = estimateRevenue(c.population, salesTaxRate, c.marketTier, seed);
    return { ...c, revenue, radius: getRadius(revenue) };
  });

  const highlight = citiesWithRevenue[0];
  const totalRevenue = citiesWithRevenue.reduce((sum, c) => sum + c.revenue, 0) + OTHER_CITIES_REVENUE;

  // If no city, show minimal state
  if (!highlight) {
    return (
      <section className="rounded-3xl border border-zinc-100 bg-gradient-to-br from-brand-primary-600/10 to-white p-6 shadow-lg">
        <p className="text-sm text-zinc-500">Select a city to see revenue breakdown</p>
      </section>
    );
  }

  // Smart zoom: if only one city → zoom in, otherwise show continental US
  const isSingleCity = citiesWithRevenue.length === 1;
  const centerLon = highlight.lon;
  const centerLat = highlight.lat;

  // Dynamic projection that zooms when only one city exists
  const project = (lon: number, lat: number) => {
    if (isSingleCity) {
      // Zoomed-in view centered on the city
      const scale = 3800;
      const offsetX = 275;
      const offsetY = 150;
      return {
        x: offsetX + (lon - centerLon) * scale,
        y: offsetY + (centerLat - lat) * scale * 1.4, // adjust for latitude distortion
      };
    }

    // Original continental US view
    return {
      x: ((lon + 125) / 60) * 500 * 0.96 + 25,
      y: ((49 - lat) / 22) * 260 * 0.92 + 20,
    };
  };

  return (
    <section className="rounded-3xl border border-zinc-100 bg-gradient-to-br from-brand-primary-600/10 to-white p-6 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-zinc-400">
            Revenue by Location
          </p>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {currencyFormatter.format(totalRevenue)}{' '}
            <span className="text-sm font-normal text-zinc-500">this year</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Highlighting{' '}
            <strong>
              {highlight.city}, {highlight.state}
            </strong>{' '}
            · {currencyFormatter.format(highlight.revenue)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:gap-12">
        {/* Full-width Map */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-brand-accent-50 to-brand-primary-50 shadow-2xl">
          <svg
            viewBox={isSingleCity ? '0 0 550 350' : '0 0 550 300'}
            className="h-auto w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Soft US outline (fades when zoomed in) */}
            {!isSingleCity && (
              <path
                d="M30,30 Q510,25 520,150 Q510,280 30,260 Q20,140 30,30 Z M90,80 Q170,60 230,90 Q300,70 360,110 Q430,130 480,160"
                fill="url(#grad)"
                stroke="#e2e8f0"
                strokeWidth="2"
                opacity="0.6"
              />
            )}

            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="100%" stopColor="#e0e7ff" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* City Bubbles */}
            {citiesWithRevenue.map((loc) => {
              const { x, y } = project(loc.lon, loc.lat);
              const isHighlight = loc === highlight;

              return (
                <g key={`${loc.city}-${loc.state}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={loc.radius * (isSingleCity ? 1.6 : 1)}
                    fill={isHighlight ? '#22c55e' : '#6366f1'}
                    fillOpacity={isHighlight ? 0.95 : 0.75}
                    stroke="white"
                    strokeWidth={isHighlight ? 5 : 3}
                    filter="url(#glow)"
                    className="cursor-pointer transition-all duration-500 hover:scale-125"
                  />
                  {isHighlight && (
                    <>
                      <text
                        x={x}
                        y={y - loc.radius * (isSingleCity ? 2.2 : 1.8)}
                        textAnchor="middle"
                        className="pointer-events-none fill-zinc-800 text-lg font-bold"
                      >
                        {loc.city}, {loc.state}
                      </text>
                      <text
                        x={x}
                        y={y - loc.radius * (isSingleCity ? 1.2 : 1)}
                        textAnchor="middle"
                        className="pointer-events-none fill-green-700 text-sm font-semibold"
                      >
                        {currencyFormatter.format(loc.revenue)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Compact list below */}
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {citiesWithRevenue.map((loc) => (
            <div
              key={`${loc.city}-${loc.state}`}
              className={`flex items-center justify-between rounded-2xl px-6 py-4 shadow-md transition-all ${
                loc === highlight
                  ? 'border-2 border-green-500 bg-green-50'
                  : 'border border-zinc-200 bg-white hover:shadow-lg'
              }`}
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  {loc.city}, {loc.state}
                </p>
                <p className="text-xl font-bold text-zinc-900">
                  {currencyFormatter.format(loc.revenue)}
                </p>
              </div>
              <span className="text-lg font-bold text-brand-primary-700">
                {Math.round((loc.revenue / totalRevenue) * 100)}%
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-6 py-4 text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">Other cities</p>
            <p className="text-xl font-bold">{currencyFormatter.format(OTHER_CITIES_REVENUE)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
