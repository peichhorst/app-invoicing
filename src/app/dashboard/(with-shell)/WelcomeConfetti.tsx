'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  hue: number;
  size: number;
  drift: number;
};

// Deterministic pattern so it looks consistent each visit (no random flicker/hydration risk)
// brand-primary-700: 263° | brand-secondary-700: 243° | brand-accent-700: 213°
const gradientHues = [263, 243, 213];

const buildPieces = () =>
  Array.from({ length: 28 }).map((_, idx) => {
    const duration = 10000 + ((idx * 47) % 5000); // 10-15 seconds
    return {
      id: idx,
      left: (idx * 13.7) % 100,
      delay: -((idx * 500) % duration), // Negative delay to start mid-animation
      duration,
      rotation: idx % 2 === 0 ? 360 : -360,
      hue: gradientHues[idx % gradientHues.length],
      size: 6 + (idx % 4), // 6–9px dots
      drift: 30 + ((idx * 23) % 50), // 30-80px horizontal drift
    };
  });

export function WelcomeConfetti() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>(buildPieces);

  // Re-trigger on route change (e.g., client navigation back to dashboard)
  useEffect(() => {
    setPieces(buildPieces());
    setShow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, -10%, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate3d(var(--drift), 25vh, 0) rotate(calc(var(--rotate) * 0.25)); opacity: 1; }
          50% { transform: translate3d(calc(var(--drift) * -0.5), 50vh, 0) rotate(calc(var(--rotate) * 0.5)); opacity: 1; }
          75% { transform: translate3d(var(--drift), 75vh, 0) rotate(calc(var(--rotate) * 0.75)); opacity: 1; }
          95% { opacity: 1; }
          100% { transform: translate3d(0, 110vh, 0) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block rounded-full"
          style={
            {
              left: `${piece.left}%`,
              backgroundColor: `hsl(${piece.hue}deg 85% 60%)`,
              height: `${piece.size}px`,
              width: `${piece.size}px`,
              animation: `confetti-fall ${piece.duration}ms linear ${piece.delay}ms forwards`,
              '--rotate': `${piece.rotation}deg`,
              '--drift': `${piece.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
