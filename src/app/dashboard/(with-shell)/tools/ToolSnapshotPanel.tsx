'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { ToolsSnapshot } from '@/lib/toolsSnapshot';
import { STATE_OPTIONS, normalizeStateValue } from '@/lib/states';

type FormState = {
  city: string;
  state: string;
  zip: string;
};


const defaultForm: FormState = {
  city: 'San Diego',
  state: 'California',
  zip: '',
};

const percentFormatter = (value?: number | string | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${(Number(value) * 100).toFixed(2)}%`;
};

const timestampToTime = (value?: number | null) => {
  if (!value) return '—';
  return new Date(value * 1000).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

type ToolSnapshotPanelProps = {
  initialForm?: FormState;
  initialSnapshot?: ToolsSnapshot | null;
  initialError?: string | null;
  onSnapshot?: (snapshot: ToolsSnapshot) => void;
};

const serializePayload = (form: FormState) => {
  const trimmedCity = form.city.trim();
  const trimmedState = form.state.trim();
  const trimmedZip = form.zip.trim();
  return {
    city: trimmedCity,
    state: trimmedState,
    zip: trimmedZip || undefined,
  };
};

export default function ToolSnapshotPanel({
  initialForm,
  initialSnapshot,
  initialError,
  onSnapshot,
}: ToolSnapshotPanelProps) {
  const resolvedInitialForm: FormState = {
    city: initialForm?.city ?? defaultForm.city,
    state: normalizeStateValue(initialForm?.state),
    zip: initialForm?.zip ?? defaultForm.zip,
  };
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [form, setForm] = useState<FormState>(() => resolvedInitialForm);
  const [snapshot, setSnapshot] = useState<ToolsSnapshot | null>(initialSnapshot ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const computedComponents = useMemo(() => {
    if (!snapshot?.airQuality) return [];
    return Object.entries(snapshot.airQuality)
      .filter(([key]) => key.toLowerCase() !== 'overall_aqi')
      .map(([key, value]) => {
        const layer = value as { concentration?: number; aqi?: number };
        return {
          name: key,
          concentration: layer?.concentration,
          aqi: layer?.aqi,
        };
      })
      .slice(0, 4);
  }, [snapshot]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = serializePayload(form);
      if (!payload.city || !payload.state) {
        setError('City and state are required.');
        return;
      }
      const response = await fetch('/api/tools/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? 'Unable to fetch snapshot');
      }
      setSnapshot(data.snapshot);
      onSnapshot?.(data.snapshot);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canSubmit = Boolean(form.city.trim() && form.state.trim());

  const formatTemperature = (value?: number | null) => {
    if (value === undefined || value === null) return '—';
    const temp = useFahrenheit ? value * 1.8 + 32 : value;
    return `${Math.round(temp * 10) / 10}°${useFahrenheit ? 'F' : 'C'}`;
  };

  const formatCoordinate = (value?: number) =>
    value !== undefined && !Number.isNaN(value) ? value.toFixed(4) : '—';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Live Snapshot</p>
          <h2 className="text-lg font-semibold text-zinc-900">Look up area data</h2>
          <p className="text-sm text-zinc-500">
            Enter a city and state (ZIP optional) to read taxes, weather, air quality, and key population data in one go.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
              State
              <select
                name="state"
                value={form.state}
                onChange={handleInputChange}
                className="mt-1 max-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm outline-none transition focus:border-brand-primary-400"
                required
              >
                {STATE_OPTIONS.map((stateOption) => (
                  <option key={stateOption.abbr} value={stateOption.name}>
                    {stateOption.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
              City
              <input
                name="city"
                value={form.city}
                onChange={handleInputChange}
                className="mt-1 max-w-[220px] rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm outline-none transition focus:border-brand-primary-400"
                placeholder=""
                required
              />
            </label>
            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
              ZIP (optional)
              <div className="mt-1 flex gap-2">
                <input
                  name="zip"
                  value={form.zip}
                  onChange={handleInputChange}
                  className="flex-1 min-w-[120px] max-w-[180px] rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm outline-none transition focus:border-brand-primary-400"
                  placeholder=""
                />
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="flex-none inline-flex items-center justify-center rounded-2xl border border-brand-primary-500 bg-brand-primary-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-brand-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Explore'}
                </button>
              </div>
            </label>
          </div>
        </form>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
        )}

        {snapshot ? (
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              {snapshot.requestedAt
                ? `Updated ${new Date(snapshot.requestedAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`
                : 'Snapshot ready'}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-100 bg-brand-primary-50/30 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500 mb-2">Summary</p>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {snapshot.city?.name ?? snapshot.search?.city}, {snapshot.city?.state ?? snapshot.search?.state}
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-zinc-700">
                  <div>
                    <span className="font-semibold text-zinc-700">Coordinates:</span>{' '}
                    {formatCoordinate(snapshot.city?.latitude)} / {formatCoordinate(snapshot.city?.longitude)}
                  </div>
       
                  <div>
                    <span className="font-semibold text-zinc-700">Population:</span>{' '}
                    {snapshot.city?.population ? new Intl.NumberFormat('en-US').format(snapshot.city.population) : '—'}
                  </div>
               {snapshot.search?.zip && (
                    <div>
                      <span className="font-semibold text-zinc-900">Zip:</span> {snapshot.search.zip}
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Taxes</p>
                <div className="mt-3 space-y-3 text-sm text-zinc-700">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">State sales tax</p>
                    <div className="text-lg font-semibold text-zinc-900">
                      {snapshot.salesTax?.state_rate ? percentFormatter(snapshot.salesTax.state_rate) : '—'}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {snapshot.salesTax?.total_rate
                        ? `Combined rate: ${snapshot.salesTax.total_rate}`
                        : 'Combined rate unavailable.'}
                    </p>
                  </div>
                  <div className="border-t border-dashed border-zinc-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Property tax</p>
                    {snapshot.propertyTax ? (
                      <div className="space-y-1 text-sm text-zinc-700">
                        <div>
                          <span className="font-semibold text-zinc-900">County:</span>{' '}
                          {snapshot.propertyTax.county ?? '—'}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900">Median rate:</span>{' '}
                          {percentFormatter(snapshot.propertyTax.property_tax_50th_percentile)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          25th / 75th: {percentFormatter(snapshot.propertyTax.property_tax_25th_percentile)} /{' '}
                          {percentFormatter(snapshot.propertyTax.property_tax_75th_percentile)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 mt-2">Property data not available.</p>
                    )}
                  </div>
                </div>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Weather</p>
                  <div className="inline-flex rounded-full border border-zinc-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setUseFahrenheit(true)}
                      className={`px-3 py-1 text-xs font-semibold transition ${
                        useFahrenheit
                          ? 'rounded-l-full bg-brand-primary-600 text-white'
                          : 'bg-transparent text-zinc-500 hover:text-brand-primary-600'
                      }`}
                    >
                      °F
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseFahrenheit(false)}
                      className={`px-3 py-1 text-xs font-semibold transition ${
                        !useFahrenheit
                          ? 'rounded-r-full bg-brand-primary-600 text-white'
                          : 'bg-transparent text-zinc-500 hover:text-brand-primary-600'
                      }`}
                    >
                      °C
                    </button>
                  </div>
                </div>
                {snapshot.weather ? (
                  <div className="mt-3 space-y-2 text-sm text-zinc-900">
                    <div className="text-3xl font-semibold text-zinc-900">{formatTemperature(snapshot.weather.temp)}</div>
                    <div>Feels like {formatTemperature(snapshot.weather.feels_like)}</div>
                    <div>Humidity {snapshot.weather.humidity ?? '—'}%</div>
                    <div>Wind {snapshot.weather.wind_speed ?? '—'} km/h</div>
                    <div className="text-sm text-zinc-900">
                      Sunrise {timestampToTime(snapshot.weather.sunrise)} · Sunset {timestampToTime(snapshot.weather.sunset)}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">Weather data unavailable for this location.</p>
                )}
              </article>

              <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Air quality</p>
                {snapshot.airQuality ? (
                  <div className="mt-3 text-sm text-zinc-700">
                    <div className="flex items-baseline gap-2 text-3xl font-semibold text-zinc-900">
                      {snapshot.airQuality?.overall_aqi ?? '—'}
                      <span className="text-xs   text-zinc-500">Overall AQI</span>
                    </div>
                    <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-zinc-50">
                      {computedComponents.length > 0 ? (
                        computedComponents.map((component) => (
                          <div
                            key={component.name}
                            className="flex justify-between px-3 py-2 text-xs text-zinc-600"
                          >
                            <span className="uppercase tracking-[0.2em] text-zinc-400">{component.name}</span>
                            <span>
                              {component.aqi ?? '—'} ·{' '}
                              {component.concentration !== undefined ? component.concentration.toFixed(2) : '—'} μg/m³
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-zinc-500">Component data unavailable.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">Air quality data unavailable.</p>
                )}
              </article>
            </div>

            <div className="mt-4">
              <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-500">Local news</p>
                <div className="mt-3 space-y-3 text-sm text-zinc-600">
                  {snapshot.news && snapshot.news.length > 0 ? (
                    snapshot.news.map((article) => (
                      <article key={article.title} className="space-y-1">
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-brand-primary-700 hover:underline"
                          >
                            {article.title}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-brand-primary-700">{article.title}</p>
                        )}
                        {article.source && (
                          <p className="text-xs text-zinc-500">Source: {article.source}</p>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No local headlines found yet.</p>
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Run a lookup to populate taxes, weather, air quality, and city fun facts with API Ninjas.
          </p>
        )}
      </div>
    </section>
  );
}
