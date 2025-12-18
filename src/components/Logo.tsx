import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
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

  return (
    <span suppressHydrationWarning className={`inline-flex items-center gap-2 font-bold text-purple-900 ${className}`}>
      <span className={`flex items-center justify-center rounded-full bg-white shadow-md overflow-hidden ${sizeClasses[size]}`}>
        <img
          src="/icon-192.png"
          alt="ClientWave icon"
          className="h-full w-full object-cover"
        />
      </span>
      {showText && (
        <span
          className={`${textSizeClasses[size]} font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-500 drop-shadow-[0_3px_10px_rgba(88,28,135,0.28)] antialiased`}
          style={{ fontFamily: '"Geist", "Inter", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif' }}
        >
          ClientWave
        </span>
      )}
    </span>
  );
}
