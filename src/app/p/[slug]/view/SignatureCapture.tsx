'use client';

import { useRef, useState, useEffect, type PointerEvent } from 'react';

type SignatureCaptureProps = {
  name: string;
  onNameChange: (value: string) => void;
  onSignatureChange: (value: string | null) => void;
};

export default function SignatureCapture({ name, onNameChange, onSignatureChange }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const draw = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(hasStroke ? dataUrl : null);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    draw(event.clientX, event.clientY);
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    draw(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
    captureImage();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/90 p-4 text-zinc-900 shadow-sm">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Signature (draw or write)</label>
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          className="w-full rounded-lg border border-zinc-300 bg-white"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-semibold text-brand-primary-600"
        >
          Clear signature
        </button>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Name</label>
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Type your name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
