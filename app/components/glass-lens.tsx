"use client";
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { lensTarget, lensUniforms, samplePoint, springStep, type LensConfig } from '../../packages/ui/src/components/glass-lens/lensMath';
import styles from './glass-lens.module.css';
const W = 300, H = 200, S = 1.5, STEP = 24;
const cfg: LensConfig = { width: W, height: H, radius: 62, strength: 0.45, aberration: 0.03 };
// The same poster as the native example: a gradient, a dot grid, fine rules and two rings.
function paint() {
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const g = c.getContext('2d')!; g.scale(S, S);
  const base = g.createLinearGradient(0, 0, W, H); base.addColorStop(0, '#0f2933'); base.addColorStop(1, '#52338c'); g.fillStyle = base; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.85, H * 0.15, 0, W * 0.85, H * 0.15, W * 0.65); sun.addColorStop(0, 'rgba(250,158,97,.8)'); sun.addColorStop(1, 'rgba(250,158,97,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.5)';
  for (let x = 7; x < W; x += 14) for (let y = 7; y < H; y += 14) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(153,242,217,.55)'; g.lineWidth = 1;
  for (let x = 28; x < W; x += 56) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 28; y < H; y += 56) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.lineWidth = 2.4; g.strokeStyle = '#ffeb99'; g.beginPath(); g.arc(W * 0.3, H * 0.6, 46, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ff80a6'; g.beginPath(); g.arc(W * 0.7, H * 0.75, 28, 0, Math.PI * 2); g.stroke();
  return g.getImageData(0, 0, W * S, H * S);
}
export function GlassLensPreview() {
  const systemReduce = useReducedMotion(), [forcedReduce, setForcedReduce] = useState(false), reduce = !!systemReduce || forcedReduce;
  const [at, setAt] = useState({ x: 186, y: 84 });
  const canvas = useRef<HTMLCanvasElement>(null), bg = useRef<ImageData | null>(null), raf = useRef(0);
  const sim = useRef({ cx: 186, cy: 84, vx: 0, vy: 0, tx: 186, ty: 84, grow: 1, gv: 0, growTarget: 1, last: 0, running: false, reduce: false });
  sim.current.reduce = reduce;
  function render() {
    const ctx = canvas.current?.getContext('2d'), b = bg.current; if (!ctx || !b) return;
    const s = sim.current, u = lensUniforms(s.cx, s.cy, s.tx, s.ty, s.grow, s.reduce, cfg), R = u.radius;
    const out = new ImageData(new Uint8ClampedArray(b.data), b.width, b.height);
    const pad = R * (1 + u.stretch) * 1.7 + 4;
    const x0 = Math.max(0, Math.floor((s.cx - pad) * S)), x1 = Math.min(b.width - 1, Math.ceil((s.cx + pad) * S));
    const y0 = Math.max(0, Math.floor((s.cy - pad) * S)), y1 = Math.min(b.height - 1, Math.ceil((s.cy + pad) * S));
    const at2 = (x: number, y: number) => { const sx = Math.max(0, Math.min(b.width - 1, Math.round(x * S))), sy = Math.max(0, Math.min(b.height - 1, Math.round(y * S))); return (sy * b.width + sx) * 4; };
    if (R >= 0.5) for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const p = samplePoint(px / S, py / S, u); if (p.cover <= 0 && p.shadow <= 0.002) continue;
      const di = (py * b.width + px) * 4, ri = at2(p.r.x, p.r.y), gi = at2(p.g.x, p.g.y), bi = at2(p.b.x, p.b.y);
      const lit = p.light * 255, k = p.cover;
      const base = [b.data[di], b.data[di + 1], b.data[di + 2]].map(v => v * (1 - p.shadow));
      const glass = [b.data[ri] + lit, b.data[gi + 1] + lit, b.data[bi + 2] + lit];
      for (let ch = 0; ch < 3; ch++) out.data[di + ch] = Math.min(255, base[ch] * (1 - k) + glass[ch] * k);
    }
    ctx.putImageData(out, 0, 0);
  }
  function tick(now: number) {
    const s = sim.current, dt = Math.min(0.05, (now - s.last) / 1000 || 1 / 60); s.last = now;
    if (s.reduce) { s.cx += (s.tx - s.cx) * 0.5; s.cy += (s.ty - s.cy) * 0.5; s.grow += (s.growTarget - s.grow) * 0.5; s.vx = s.vy = s.gv = 0; }
    else {
      const a = springStep(s.cx, s.vx, s.tx, dt), b = springStep(s.cy, s.vy, s.ty, dt), g = springStep(s.grow, s.gv, s.growTarget, dt, 220, 14);
      s.cx = a.pos; s.vx = a.vel; s.cy = b.pos; s.vy = b.vel; s.grow = g.pos; s.gv = g.vel;
    }
    render();
    const calm = Math.abs(s.tx - s.cx) < 0.05 && Math.abs(s.ty - s.cy) < 0.05 && Math.abs(s.vx) + Math.abs(s.vy) < 0.5 && Math.abs(s.growTarget - s.grow) < 0.002 && Math.abs(s.gv) < 0.02;
    if (calm) { s.cx = s.tx; s.cy = s.ty; s.grow = s.growTarget; s.running = false; render(); } else raf.current = requestAnimationFrame(tick);
  }
  function wake() { const s = sim.current; if (s.running) return; s.running = true; s.last = performance.now(); raf.current = requestAnimationFrame(tick); }
  useEffect(() => { bg.current = paint(); render(); return () => cancelAnimationFrame(raf.current); }, []);
  function goTo(x: number, y: number) { const t = lensTarget(x, y, W, H), s = sim.current; s.tx = t.x; s.ty = t.y; setAt(t); wake(); }
  function local(e: React.PointerEvent) { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; }
  const drag = useRef(false);
  function onKey(e: React.KeyboardEvent) {
    const m: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    if (m[e.key]) { e.preventDefault(); goTo(sim.current.tx + m[e.key][0], sim.current.ty + m[e.key][1]); }
  }
  return <div className={styles.root}>
    <div className={styles.status} aria-live="polite">Lens at {Math.round(at.x)}, {Math.round(at.y)}</div>
    <div className={styles.stage} data-lens-stage tabIndex={0} role="application" aria-roledescription="draggable lens" aria-label="Glass lens. Drag to move it over the poster, or use the arrow keys."
      onKeyDown={onKey}
      onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); const p = local(e); sim.current.growTarget = 1.14; goTo(p.x, p.y); }}
      onPointerMove={e => { if (drag.current) { const p = local(e); goTo(p.x, p.y); } }}
      onPointerUp={() => { drag.current = false; sim.current.growTarget = 1; wake(); }}
      onPointerCancel={() => { drag.current = false; sim.current.growTarget = 1; wake(); }}>
      <canvas ref={canvas} className={styles.canvas} width={W * S} height={H * S} aria-hidden="true" />
      <div className={styles.caption} aria-hidden="true">Drag the lens over the poster</div>
    </div>
    <div className={styles.note}><span>Drag, or focus and use the arrow keys.</span><button aria-pressed={forcedReduce} onClick={() => setForcedReduce(!forcedReduce)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
  </div>;
}
// End of Glass Lens web preview.
