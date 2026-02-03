'use client';

import { useEffect } from 'react';

const primaryColorMap: Record<string, string> = {
  purple: '#a855f7',
  blue: '#1d4ed8',
  green: '#22c55e',
  red: '#ef4444',
  // Add more palette colors as needed
};

type ApplyPrimaryColorProps = {
  primaryColor?: string;
};

const ApplyPrimaryColor = ({ primaryColor }: ApplyPrimaryColorProps) => {
  useEffect(() => {
    if (!primaryColor) return;
    const color = primaryColorMap[primaryColor] || primaryColor;
    const overrideShades = [500, 600, 700];
    overrideShades.forEach((shade) => {
      document.documentElement.style.setProperty(`--color-brand-accent-${shade}`, color);
      document.documentElement.style.setProperty(`--color-brand-primary-${shade}`, color);
    });
  }, [primaryColor]);
  return null;
};
export default ApplyPrimaryColor;
