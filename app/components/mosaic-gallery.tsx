"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginShuffle, clampView, decodeBase64, evalMosaicFrame, makeFrame, makeState, zoomAbout,
  type MosaicFrame, type MosaicState, type MosaicView,
} from '../../packages/ui/src/components/mosaic-gallery/mosaicMath';
import { MOSAIC_COLS, MOSAIC_ROWS, MOSAIC_PAINTINGS } from '../../packages/ui/src/components/mosaic-gallery/mosaic-data';
import styles from './mosaic-gallery.module.css';

const COLS = MOSAIC_COLS, ROWS = MOSAIC_ROWS, N = COLS * ROWS;
const W = 400, H = 275;
const CELL = Math.min(W / COLS, H / ROWS);
const OFFX = (W - CELL * COLS) / 2;
const OFFY = (H - CELL * ROWS) / 2;
const GAP = 0.14;
const BEVEL = [1.13, 1.05, 0.95, 0.84];

function shadeCss(packed: number, f: number): string {
  const r = Math.min(255, Math.round(((packed >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((packed >> 8) & 255) * f));
  const b = Math.min(255, Math.round((packed & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function MosaicGalleryPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const [slow, setSlow] = useState(false);
  const [reduced, setReduced] = useState<boolean | undefined>(undefined);
  const decoded = useRef(MOSAIC_PAINTINGS.map(p => decodeBase64(p.colorsB64)));
  const sim = useRef<{ st: MosaicState; frame: MosaicFrame; view: MosaicView; clock: number } | null>(null);
  if (!sim.current) sim.current = { st: makeState(0, decoded.current[0], N), frame: makeFrame(N), view: { scale: 1, tx: 0, ty: 0 }, clock: 0 };
  const latest = useRef({ slow, reduced });
  latest.current = { slow, reduced };

  const goTo = useCallback((next: number, gx: number, gy: number) => {
    const s = sim.current!;
    const target = ((next % MOSAIC_PAINTINGS.length) + MOSAIC_PAINTINGS.length) % MOSAIC_PAINTINGS.length;
    const seed = (target + 1) * 7919 + Math.floor(gx * 13 + gy * 17);
    beginShuffle(s.st, target, decoded.current[target], s.clock, gx, gy, seed);
    setIndex(target);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    const s = sim.current!;
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const draw = (now: number) => {
      const dt = Math.min(48, now - last) / 1000;
      last = now;
      clock += dt * (latest.current.slow && latest.current.reduced !== true ? 0.25 : 1);
      s.clock = clock;
      const reducedNow = latest.current.reduced === true || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      evalMosaicFrame(s.st, COLS, ROWS, clock, reducedNow, s.frame);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#101c15';
      ctx.fillRect(0, 0, W, H);
      const v = s.view;
      ctx.translate(W / 2 + v.tx, H / 2 + v.ty);
      ctx.scale(v.scale, v.scale);
      ctx.translate(-W / 2, -H / 2);
      const half = (CELL * (1 - GAP)) / 2;
      for (let i = 0; i < N; i++) {
        const h = half * s.frame.s[i];
        const x = OFFX + s.frame.x[i] * CELL;
        const y = OFFY + s.frame.y[i] * CELL;
        const c = s.frame.color[i];
        // Beveled tile: lit body plus a darker lower-right facet.
        ctx.fillStyle = shadeCss(c, BEVEL[0]);
        ctx.fillRect(x - h, y - h, h * 2, h * 2);
        ctx.fillStyle = shadeCss(c, BEVEL[3]);
        ctx.beginPath();
        ctx.moveTo(x + h, y - h);
        ctx.lineTo(x + h, y + h);
        ctx.lineTo(x - h, y + h);
        ctx.closePath();
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Wheel zoom about the cursor; drag pans; click shuffles; double-click toggles zoom.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const s = sim.current!;
    const local = (e: MouseEvent | PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    let downAt = 0, downX = 0, downY = 0, moved = false, base: MosaicView = { scale: 1, tx: 0, ty: 0 };
    let pendingTap: ReturnType<typeof setTimeout> | null = null;
    const onDown = (e: PointerEvent) => {
      // A second press cancels the pending single-click shuffle (double-click).
      if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
      downAt = Date.now(); downX = e.clientX; downY = e.clientY; moved = false; base = { ...s.view }; canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!downAt) return;
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      if (moved) s.view = clampView({ scale: s.view.scale, tx: base.tx + dx, ty: base.ty + dy }, W, H);
    };
    const onUp = (e: PointerEvent) => {
      if (!downAt) return;
      const quick = Date.now() - downAt < 300;
      downAt = 0;
      if (moved || !quick) return;
      const p = local(e);
      // Delay the shuffle so a double-click can cancel it and zoom instead.
      pendingTap = setTimeout(() => {
        pendingTap = null;
        const v = s.view;
        const gx = (((p.x - W / 2 - v.tx) / v.scale + W / 2) - OFFX) / CELL;
        const gy = (((p.y - H / 2 - v.ty) / v.scale + H / 2) - OFFY) / CELL;
        goTo(indexRef.current + 1, Math.max(0, Math.min(COLS, gx)), Math.max(0, Math.min(ROWS, gy)));
      }, 280);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const factor = Math.exp(-e.deltaY * 0.0016);
      s.view = zoomAbout(s.view, s.view.scale * factor, p.x, p.y, W, H);
    };
    const onDbl = (e: MouseEvent) => {
      e.preventDefault();
      if (pendingTap) { clearTimeout(pendingTap); pendingTap = null; }
      const p = local(e);
      s.view = s.view.scale > 1.2 ? { scale: 1, tx: 0, ty: 0 } : zoomAbout(s.view, 2, p.x, p.y, W, H);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDbl);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDbl);
    };
  }, [goTo]);

  const painting = MOSAIC_PAINTINGS[index];

  return (
    <div className={styles.stage}>
      <p className={styles.caption} aria-live="polite">{painting.title} · {painting.artist}, {painting.year}</p>
      <p className={styles.sub}>{index + 1} of {MOSAIC_PAINTINGS.length} · 2,816 tiles</p>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: W, height: H }}
        tabIndex={0}
        role="img"
        aria-label={`Mosaic of ${painting.title} by ${painting.artist}. Activate for the next painting.`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(indexRef.current + 1, COLS / 2, ROWS / 2); } }}
      />
      <p className={styles.hint}>Click the mosaic for the next painting. Scroll to zoom, drag to pan, double-click to zoom in.</p>
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={() => goTo(index + 1, COLS / 2, ROWS / 2)}>Next painting</button>
        <button type="button" className={styles.chip} aria-pressed={slow} onClick={() => setSlow(!slow)}>Slow motion: {slow ? 'on' : 'off'}</button>
        <button type="button" className={styles.chip} aria-pressed={reduced === true} onClick={() => setReduced(reduced === true ? undefined : true)}>Motion: {reduced === true ? 'reduced' : 'system'}</button>
      </div>
      <div className={styles.dots}>
        {MOSAIC_PAINTINGS.map((p, i) => (
          <button key={p.id} type="button" className={i === index ? styles.dotActive : styles.dot} aria-label={`Show ${p.title}`} onClick={() => goTo(i, COLS / 2, ROWS / 2)} />
        ))}
      </div>
    </div>
  );
}
