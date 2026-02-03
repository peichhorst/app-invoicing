import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  src?: string | null;
  alt?: string;
  textColor?: string;
}

export function Logo({ className = '', showText = true, size = 'md', src, alt, textColor }: LogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const logoSrc = src && src.trim().length > 0 ? src : null;
  const logoAlt = alt && alt.trim().length > 0 ? alt : 'ClientWave icon';

  return (
    <span
      suppressHydrationWarning
      className={`inline-flex items-center gap-2 font-bold text-brand-primary-700 ${className}`}
      style={textColor ? { color: textColor } : { color: 'var(--color-brand-primary-700)' }}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-[var(--color-brand-accent-700)] shadow-md overflow-hidden ${sizeClasses[size]}`}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={logoAlt}
            className="h-full w-full object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="h-full w-full"
            style={{ color: 'var(--color-brand-accent-700)' }}
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-brand-accent-700)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--color-brand-accent-700)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="48" height="48" rx="12" fill="var(--color-brand-accent-700)" />
            <path
              d="M-4 30 C 6 24, 14 30, 24 26 C 34 22, 42 28, 52 22 L 52 48 L -4 48 Z"
              fill="url(#waveGradient)"
              opacity="0.9"
            />
            <path
              d="M-6 34 C 6 28, 16 34, 26 30 C 38 26, 48 32, 58 26"
              stroke="var(--color-brand-contrast)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.35"
            />
            <path
              d="M-6 22 C 6 18, 16 24, 26 20 C 36 16, 46 22, 56 16"
              stroke="var(--color-brand-contrast)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M-4 16 C 8 12, 18 18, 28 14 C 38 10, 48 16, 58 10"
              stroke="var(--color-brand-contrast)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M-2 10 C 10 6, 20 12, 30 8 C 40 4, 50 10, 60 4"
              stroke="var(--color-brand-contrast)"
              strokeWidth="1.75"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          </svg>
        )}
      </span>
      {showText && (
        <span
          className={`${textSizeClasses[size]} font-extrabold tracking-tight antialiased text-brand-primary-700`}
          style={{
            fontFamily: '"Geist", "Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
            color: 'var(--color-brand-primary-700)'
          }}
        >
          ClientWave
        </span>
      )}
    </span>
  );
}
