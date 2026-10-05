"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

export type SignaturePadHandle = {
  /** PNG data URL of the drawing, or null when nothing has been drawn. */
  toDataUrl: () => string | null;
  clear: () => void;
};

/**
 * A plain canvas the clinician signs on with a mouse, finger or stylus.
 * The drawing is exported as a transparent PNG so it sits cleanly on the
 * report. Nothing leaves the browser until the form is submitted.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (hasInk: boolean) => void }>(function SignaturePad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const WIDTH = 600;
  const HEIGHT = 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1d003a";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    last.current = point(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) {
      setHasInk(true);
      onChange?.(true);
    }
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    // A tap with no movement still leaves a dot.
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#1d003a";
      ctx.fill();
      if (!hasInk) {
        setHasInk(true);
        onChange?.(true);
      }
    }
    drawing.current = false;
    last.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(false);
  }

  useImperativeHandle(ref, () => ({
    toDataUrl: () => (hasInk && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null),
    clear,
  }));

  return (
    <div>
      <div className="relative rounded-2xl border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          data-testid="signature-pad"
          className="block w-full touch-none rounded-2xl"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-9 border-t border-dashed border-slate-300" />
        {!hasInk && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-slate-400">
            Sign here with your mouse, finger or stylus
          </p>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={clear} className="text-xs font-semibold text-slate-500 hover:text-midnight">
          Clear
        </button>
      </div>
    </div>
  );
});
