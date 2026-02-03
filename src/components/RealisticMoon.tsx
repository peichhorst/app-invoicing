import React from 'react';

export function RealisticMoon({ size = 80 }) {
  // Simple crescent moon SVG with subtle glow
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
      <defs>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="80%" stopColor="#e0e7ef" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#cfd8dc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moon-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#cfd8dc" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <circle cx="40" cy="40" r="36" fill="url(#moon-glow)" />
      {/* Main moon body */}
      <circle cx="40" cy="40" r="28" fill="url(#moon-body)" />
      {/* Crescent shadow */}
      <ellipse cx="48" cy="40" rx="18" ry="26" fill="#e0e7ef" />
      <ellipse cx="52" cy="40" rx="14" ry="22" fill="#f8fafc" />
    </svg>
  );
}
