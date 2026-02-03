import React from 'react';

export function RealisticSun({ variant = 'afternoon', size = 80 }) {
  // variant: 'morning' | 'afternoon'
  let gradientId = `sun-gradient-${variant}`;
  let stops;
  if (variant === 'morning') {
    stops = (
      <>
        <stop offset="0%" stopColor="#fffbe6" />
        <stop offset="60%" stopColor="#ffe066" />
        <stop offset="100%" stopColor="#ffd700" />
      </>
    );
  } else {
    // afternoon
    stops = (
      <>
        <stop offset="0%" stopColor="#fffbe6" />
        <stop offset="60%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#ffae00" />
      </>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
      <defs>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffde4" stopOpacity="0.8" />
          <stop offset="80%" stopColor="#ffe066" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          {stops}
        </radialGradient>
      </defs>
      {/* Glow */}
      <circle cx="40" cy="40" r="36" fill="url(#sun-glow)" />
      {/* Main sun body */}
      <circle cx="40" cy="40" r="28" fill={`url(#${gradientId})`} />
      {/* Rays */}
      <g stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round">
        <line x1="40" y1="8" x2="40" y2="0" />
        <line x1="40" y1="72" x2="40" y2="80" />
        <line x1="8" y1="40" x2="0" y2="40" />
        <line x1="72" y1="40" x2="80" y2="40" />
        <line x1="18" y1="18" x2="8" y2="8" />
        <line x1="62" y1="18" x2="72" y2="8" />
        <line x1="18" y1="62" x2="8" y2="72" />
        <line x1="62" y1="62" x2="72" y2="72" />
      </g>
    </svg>
  );
}
