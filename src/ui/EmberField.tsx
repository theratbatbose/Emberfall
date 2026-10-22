import { useEffect, useRef } from 'react';

/** Drifting embers behind everything. Pauses when hidden; off in calm mode. */
export function EmberField({ calm, density = 38 }: { calm: boolean; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (calm) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--glow').trim() || '255 122 26';
    const rgb = accent.split(/\s+/).join(',');
    type P = { x: number; y: number; r: number; vy: number; vx: number; life: number; max: number; phase: number };
    const spawn = (initial: boolean): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.25 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      life: 0,
      max: 260 + Math.random() * 400,
      phase: Math.random() * Math.PI * 2,
    });
    const parts: P[] = Array.from({ length: density }, () => spawn(true));
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.7);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life += dt;
        p.y -= p.vy * dt;
        p.x += (p.vx + Math.sin((p.life + p.phase * 50) / 40) * 0.25) * dt;
        const k = p.life / p.max;
        if (k >= 1 || p.y < -10) {
          parts[i] = spawn(false);
          continue;
        }
        const alpha = Math.sin(Math.PI * k) * 0.85;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255,236,190,${alpha})`);
        g.addColorStop(0.3, `rgba(${rgb},${alpha * 0.8})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible') {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [calm, density]);
  if (calm) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
