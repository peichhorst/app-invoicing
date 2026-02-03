'use client';

import { useState } from 'react';
import { ToolsSnapshot } from '@/lib/toolsSnapshot';
import RevenueByLocationPanel from '@/components/RevenueByLocationPanel';
import ToolSnapshotPanel from '@/app/dashboard/(with-shell)/tools/ToolSnapshotPanel';

type SnapshotSectionProps = {
  initialForm: {
    city: string;
    state: string;
    zip: string;
  };
  initialSnapshot: ToolsSnapshot | null;
  initialError: string | null;
  showRevenue?: boolean;
};

export default function SnapshotRevenueSection({
  initialForm,
  initialSnapshot,
  initialError,
  showRevenue = true,
}: SnapshotSectionProps) {
  const [snapshot, setSnapshot] = useState<ToolsSnapshot | null>(initialSnapshot);

  return (
    <>
      <ToolSnapshotPanel
        initialForm={initialForm}
        initialSnapshot={initialSnapshot}
        initialError={initialError}
        onSnapshot={(updated) => setSnapshot(updated)}
      />
      {showRevenue && <RevenueByLocationPanel snapshot={snapshot} />}
    </>
  );
}
