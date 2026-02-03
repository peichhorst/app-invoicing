'use client';

import { useEffect, useState } from 'react';
import { OverallPieChart } from './OverallPieChart';

type OverallPieChartProps = Parameters<typeof OverallPieChart>[0];

export function OverallPieChartClient(props: OverallPieChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(token);
  }, []);

  if (!mounted) {
    return <div className="h-64 w-full" aria-hidden="true" />;
  }

  return <OverallPieChart {...props} />;
}
