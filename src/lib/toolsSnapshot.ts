const API_BASE = 'https://api.api-ninjas.com/v1';

const CACHE_TTL_MS = 60 * 1000;
const snapshotCache = new Map<string, { snapshot: ToolsSnapshot; fetchedAt: number }>();

type SnapshotParams = {
  city: string;
  state: string;
  zip?: string;
};

export type SalesTaxRecord = {
  zip_code?: string;
  state_rate?: string | number;
  total_rate?: string;
};

export type PropertyTaxRecord = {
  zip?: string;
  state?: string;
  county?: string;
  property_tax_25th_percentile?: number;
  property_tax_50th_percentile?: number;
  property_tax_75th_percentile?: number;
};

export type WeatherRecord = {
  temp?: number;
  feels_like?: number;
  humidity?: number;
  min_temp?: number;
  max_temp?: number;
  wind_speed?: number;
  wind_degrees?: number;
  sunrise?: number;
  sunset?: number;
};

export type AirQualityComponent = {
  concentration?: number;
  aqi?: number;
};

export type AirQualityRecord = {
  overall_aqi?: number;
  [component: string]: AirQualityComponent | number | undefined;
};

export type NewsItem = {
  title: string;
  description?: string;
  url?: string;
  source?: string;
};

export type ToolsSnapshot = {
  city: {
    name?: string;
    state?: string;
    country?: string;
    region?: string;
    population?: number;
    latitude?: number;
    longitude?: number;
    elevation?: number;
  };
  search: {
    city: string;
    state: string;
    zip?: string;
  };
  salesTax: SalesTaxRecord | null;
  propertyTax: PropertyTaxRecord | null;
  weather: WeatherRecord | null;
  airQuality: AirQualityRecord | null;
  news: NewsItem[] | null;
  requestedAt: string;
};

const buildCacheKey = (params: SnapshotParams) =>
  `${params.city.toLowerCase()}|${params.state.toLowerCase()}|${params.zip ?? ''}`;

const createUrl = (endpoint: string, params: Record<string, string | number | undefined>) => {
  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url;
};

const fetchNinjas = async (endpoint: string, params: Record<string, string | number | undefined>) => {
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    throw new Error('API Ninjas key is not configured.');
  }

  const url = createUrl(endpoint, params);
  const response = await fetch(url.toString(), {
    headers: { 'X-Api-Key': apiKey },
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `API Ninjas ${endpoint} call failed.`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unable to parse ${endpoint} response.`);
  }
};

const SERPER_URL = 'https://google.serper.dev/search';

const fetchSerperNews = async (query?: string) => {
  const apiKey = process.env.SERPER_KEY;
  if (!apiKey || !query) return null;

  const payload = {
    q: `${query} latest headlines`,
    gl: 'us',
    hl: 'en',
    num: 5,
    type: 'news',
  };

  try {
    const response = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    const rawArticles = Array.isArray(data?.news)
      ? data.news
      : Array.isArray(data?.news?.value)
      ? data.news.value
      : Array.isArray(data?.news?.results)
      ? data.news.results
      : [];

    return rawArticles
      .map((article: any) => ({
        title: article.title || article.headline || article.snippet,
        url: article.link || article.url,
        source: article.source?.name || article.source?.title || article.source,
      }))
      .filter((article: NewsItem) => Boolean(article.title))
      .slice(0, 3);
  } catch {
    return null;
  }
};

export async function getToolsSnapshot({ city, state, zip }: SnapshotParams) {
  const trimmedCity = city.trim();
  const trimmedState = state.trim();
  if (!trimmedCity || !trimmedState) {
    throw new Error('City and state are required.');
  }

  const cacheKey = buildCacheKey({ city: trimmedCity, state: trimmedState, zip });
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const cityData = await fetchNinjas('city', { name: trimmedCity, state: trimmedState });
  const cityRecord = Array.isArray(cityData) ? cityData[0] : cityData;
  if (!cityRecord) {
    throw new Error('Unable to locate that city and state combination.');
  }

  const salesTaxData = await fetchNinjas('salestax', {
    city: trimmedCity,
    state: trimmedState,
  });

  let propertyTaxData: unknown = null;
  if (zip) {
    propertyTaxData = await fetchNinjas('propertytax', { zip });
  }
  if ((!Array.isArray(propertyTaxData) || propertyTaxData.length === 0) && cityRecord) {
    propertyTaxData = await fetchNinjas('propertytax', { city: trimmedCity, state: trimmedState });
  }
  const propertyTaxRecord =
    Array.isArray(propertyTaxData) && propertyTaxData.length > 0 ? propertyTaxData[0] : null;

  const lat = cityRecord.latitude;
  const lon = cityRecord.longitude;
  const weatherData =
    typeof lat === 'number' && typeof lon === 'number'
      ? await fetchNinjas('weather', { lat, lon })
      : null;
  const airQualityData =
    typeof lat === 'number' && typeof lon === 'number'
      ? await fetchNinjas('airquality', { lat, lon })
      : null;
  const components = [`${cityRecord.name} ${cityRecord.state ?? trimmedState}`.trim()];
  if (zip) {
    components.unshift(zip);
  }
  const precision = components.filter(Boolean).join(' ');
  const newsQuery = `${precision} local headlines`;
  const news = await fetchSerperNews(newsQuery);

  const snapshot = {
    city: {
      name: cityRecord.name,
      state: cityRecord.region ?? trimmedState,
      country: cityRecord.country,
      population: cityRecord.population,
      region: cityRecord.region,
      elevation: cityRecord.elevation,
      latitude: cityRecord.latitude,
      longitude: cityRecord.longitude,
    },
    search: {
      city: trimmedCity,
      state: trimmedState,
      zip: zip || undefined,
    },
    salesTax: Array.isArray(salesTaxData) ? salesTaxData[0] : null,
    propertyTax: propertyTaxRecord,
    weather: weatherData,
    airQuality: airQualityData,
    news,
    requestedAt: new Date().toISOString(),
  } satisfies ToolsSnapshot;

  snapshotCache.set(cacheKey, { snapshot, fetchedAt: Date.now() });
  if (snapshotCache.size > 200) {
    const firstKey = snapshotCache.keys().next().value;
    if (firstKey) snapshotCache.delete(firstKey);
  }

  return snapshot;
}

