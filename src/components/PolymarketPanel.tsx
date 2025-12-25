import { getPolymarketOdds } from '@/lib/polymarket';

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

async function loadOdds() {
  try {
    const data = await getPolymarketOdds();
    return data || [];
  } catch (error) {
    console.error('Failed to fetch Polymarket odds:', error);
    return [];
  }
}

export default async function PolymarketPanel() {
  const odds = await loadOdds();
  const isSample = odds.every((entry) => entry.source === 'sample');
  const hasData = odds.length > 0;
  const isError = !hasData && odds.length === 0;

  return (
    <section className="rounded-3xl border border-zinc-100 bg-white/90 p-6 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-zinc-400">
            Polymarket
          </p>
          <h2 className="text-2xl font-semibold text-zinc-900">Global Economy</h2>
          <p className="text-sm text-zinc-500">
            Real-time crowd-sourced probabilities powered by the Gamma API and Polymarket markets.
          </p>
        </div>

        {/* Debug Badge - Only shown in development or when issues occur */}
        {(isSample || isError) && process.env.NODE_ENV === 'development' && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              {isSample ? 'SAMPLE DATA' : 'NO DATA'}
            </span>
            {isError && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                API ERROR
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {hasData ? (
          odds.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-4">
                <a
                  className="text-sm font-semibold text-zinc-900 hover:text-brand-primary-600 transition-colors"
                  href={`https://polymarket.com/event/${entry.slug ?? entry.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {entry.question}
                </a>
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-primary-600">
                  {entry.tags?.join(', ') || 'economy'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-zinc-900">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  YES {formatPercent(entry.yesPrice)}
                </span>
                <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                  NO {formatPercent(entry.noPrice)}
                </span>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Updated{' '}
                {new Date(entry.updatedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {isSample && (
                  <span className="ml-2 font-bold text-orange-600">• Sample</span>
                )}
              </p>
            </article>
          ))
        ) : (
          /* Error / No Data State */
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="text-4xl">📉</div>
              <h3 className="text-lg font-semibold text-zinc-900">
                No Polymarket data available
              </h3>
              <p className="text-sm text-zinc-600">
                {isError
                  ? 'The Polymarket API is currently unreachable or returned an error.'
                  : 'No active markets matched the current filters.'}
              </p>

              {/* Extra debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                    Debug info (click to view)
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-300">
                    {JSON.stringify(
                      {
                        timestamp: new Date().toISOString(),
                        error: isError,
                        sampleData: isSample,
                        oddsLength: odds.length,
                        env: process.env.NODE_ENV,
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              )}

              <a
                href="https://polymarket.com/economy"
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-700"
              >
                View on Polymarket →
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
