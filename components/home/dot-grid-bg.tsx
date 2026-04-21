"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A restrained dot-grid background.
 * Draws a cool gray-blue grid and a subtle cursor halo.
 */
export function DotGridBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef<number>(0);

  const GAP = 22;
  const DOT_R = 1;
  const DOT_R_BOOST = 0.95;
  const BASE_ALPHA = 0.26;
  const GLOW_R = 132;
  const GLOW_BOOST = 0.34;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const mx = mouse.current.x;
    const my = mouse.current.y;
    const glowR2 = GLOW_R * GLOW_R;

    for (let x = GAP; x < w; x += GAP) {
      for (let y = GAP; y < h; y += GAP) {
        const dx = x - mx;
        const dy = y - my;
        const dist2 = dx * dx + dy * dy;

        let alpha = BASE_ALPHA;
        if (dist2 < glowR2) {
          const t = 1 - Math.sqrt(dist2) / GLOW_R;
          alpha += GLOW_BOOST * t * t;
        }

        ctx.fillStyle = `rgba(148,163,184,${alpha})`;
        ctx.beginPath();
        const t = dist2 < glowR2 ? 1 - Math.sqrt(dist2) / GLOW_R : 0;
        ctx.arc(x, y, DOT_R + DOT_R_BOOST * t * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    raf.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };

    const onLeave = () => {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
      style={{ display: "block" }}
    />
  );
}
