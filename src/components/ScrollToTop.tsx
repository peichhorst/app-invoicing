'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Forces scroll position to top on route changes to avoid retaining deep scroll positions
 * that can hide the header when navigating.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
