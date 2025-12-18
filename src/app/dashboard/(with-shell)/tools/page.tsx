import { getCurrentUser } from '@/lib/auth';
import { ToolsSnapshot, getToolsSnapshot } from '@/lib/toolsSnapshot';
import SnapshotRevenueSection from '@/components/SnapshotRevenueSection';
import PolymarketPanel from '@/components/PolymarketPanel';

const featureBlocks = [
  {
    title: 'Sales tax',
    description:
      'Query the Sales Tax API for the full combined rate in any city, county, or state to show exactly what your customers pay.',
  },
  {
    title: 'Property tax',
    description:
      'Surface local property tax rates and stats so users can compare jurisdictions when evaluating new locations.',
  },
  {
    title: 'Tax-included price calculator',
    description:
      'Use the Sales Tax Calculator API to show final prices after tax for a price point plus automatic rounding.',
  },
  {
    title: 'City / ZIP metadata',
    description:
      'City and Zip Code APIs deliver population, density, region, elevation, and matching county information for quick lookups.',
  },
  {
    title: 'Weather',
    description: 'API Ninjas weather endpoints return current conditions, humidity, and wind so snapshots feel alive.',
  },
  {
    title: 'Population',
    description:
      'Pull the latest counts for cities or counties so neighborhood summaries stay accurate as you show totals.',
  },
  {
    title: 'Air quality',
    description: 'Share AQI data in the same snapshot so health-conscious users understand local conditions.',
  },
];

export default async function ToolsPage() {
  const user = await getCurrentUser();
  const initialForm = {
    city: user?.company?.city ?? 'San Diego',
    state: user?.company?.state ?? 'California',
    zip: user?.company?.postalCode ?? '92103',
  };
  let initialSnapshot: ToolsSnapshot | null = null;
  let initialSnapshotError: string | null = null;
  try {
    initialSnapshot = await getToolsSnapshot({
      city: initialForm.city,
      state: initialForm.state,
      zip: initialForm.zip || undefined,
    });
  } catch (error) {
    initialSnapshotError =
      error instanceof Error ? error.message : 'Unable to load the snapshot on first render.';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Tools</h1>
          <p className="text-sm text-zinc-500">
            API Ninjas only. Fast, affordable, and optimized for the free tier, this snapshot delivers taxes,
            weather, air quality, and city details in a single view with the key endpoints you already have access to.
          </p>
        </div>

        <SnapshotRevenueSection
          initialForm={initialForm}
          initialSnapshot={initialSnapshot}
          initialError={initialSnapshotError}
        />

        <PolymarketPanel />

      </div>
    </div>
  );
}
