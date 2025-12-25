'use client';

import dynamic from 'next/dynamic';

const HrefEmptyDebugger = dynamic(
  () => import('./HrefEmptyDebugger').then((mod) => mod.HrefEmptyDebugger),
  { ssr: false }
);

export function DevHrefEmptyDebugger() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <HrefEmptyDebugger />;
}
