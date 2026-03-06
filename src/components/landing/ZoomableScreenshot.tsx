'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Search, X } from 'lucide-react';

const zoomInCursor =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2728%27 height=%2728%27 viewBox=%270 0 28 28%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%278%27 fill=%27white%27 stroke=%27%23111827%27 stroke-width=%272%27/%3E%3Cline x1=%2718%27 y1=%2718%27 x2=%2725%27 y2=%2725%27 stroke=%27%23111827%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3Cline x1=%2712%27 y1=%278.5%27 x2=%2712%27 y2=%2715.5%27 stroke=%27%23111827%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3Cline x1=%278.5%27 y1=%2712%27 x2=%2715.5%27 y2=%2712%27 stroke=%27%23111827%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 12 12, zoom-in';
const zoomOutCursor =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2728%27 height=%2728%27 viewBox=%270 0 28 28%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%278%27 fill=%27white%27 stroke=%27%23111827%27 stroke-width=%272%27/%3E%3Cline x1=%2718%27 y1=%2718%27 x2=%2725%27 y2=%2725%27 stroke=%27%23111827%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3Cline x1=%278.5%27 y1=%2712%27 x2=%2715.5%27 y2=%2712%27 stroke=%27%23111827%27 stroke-width=%272%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 12 12, zoom-out';

type ZoomableScreenshotProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  frameClassName?: string;
};

export default function ZoomableScreenshot({
  src,
  alt,
  width,
  height,
  priority = false,
  frameClassName = '',
}: ZoomableScreenshotProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen]);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    if (!active) setActive(true);
  };

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-white shadow-lg ${frameClassName}`}
        style={{ cursor: active ? zoomOutCursor : zoomInCursor }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setActive(false);
          setOrigin('50% 50%');
        }}
        onMouseMove={handleMove}
        onClick={() => setLightboxOpen(true)}
      >
        <div
          className={`pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full border border-white/80 bg-black/45 p-2 text-white backdrop-blur-sm transition-opacity duration-200 ${
            hovered || active ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Search size={14} />
        </div>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className={`h-auto w-full object-cover transition-transform duration-700 ease-out ${
            active ? 'scale-[1.22]' : 'scale-100'
          }`}
          style={{ transformOrigin: origin }}
        />
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Close image"
          >
            <X size={18} />
          </button>
          <div
            className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-black/30"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              className="h-auto max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
