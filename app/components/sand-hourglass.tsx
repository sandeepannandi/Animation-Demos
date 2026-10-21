"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  GRAIN_COUNT, HOUR_BOT, HOUR_BOT_HALF, HOUR_CX, HOUR_TOP, HOUR_TOP_HALF,
  SAND_DEFAULTS, createSand, hourGlassOutline, hourSheen, sandDragTo, sandFlip, sandReleaseDrag, stepSandFrame, type SandState,
} from "../../packages/ui/src/components/sand-hourglass/sandMath";
import { HOUR_BACK, HOUR_BACKGROUND, HOUR_FRONT, HOUR_GLASS, HOUR_GLASS_SHADE, HOUR_H, HOUR_W, SAND_RIM, SAND_RIM_STROKE, SAND_SHADES, SAND_STROKES, type HourPrim } from "../../packages/ui/src/components/sand-hourglass/sandDesign";
import styles from "./sand-hourglass.module.css";

function traceGlass(ctx: CanvasRenderingContext2D) {
  const pts = hourGlassOutline();
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}

export function SandHourglassPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const [flips, setFlips] = useState(0);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced, flips });
  latest.current = { slow, reduced, flips };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = HOUR_W * dpr;
    canvas.height = HOUR_H * dpr;
    let sim = createSand(SAND_DEFAULTS, GRAIN_COUNT);
    const pointer = { x: 0, y: 0, down: 0, vy: 0, lastY: 0, lastT: 0 };
    let wasReduced = false;
    let seenFlips = flips;

    const prim = (p: HourPrim) => {
      if (typeof p.fill === "string") ctx.fillStyle = p.fill;
      else {
        const g = ctx.createLinearGradient(p.fill.lin[0], p.fill.lin[1], p.fill.lin[2], p.fill.lin[3]);
        for (const [o, c] of p.fill.stops) g.addColorStop(o, c);
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, p.r);
      ctx.fill();
    };
    const sheen = hourSheen();

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, HOUR_H);
      bg.addColorStop(0, "#131b2e");
      bg.addColorStop(1, "#080c16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, HOUR_W, HOUR_H);
      for (const p of HOUR_BACK) prim(p);
      traceGlass(ctx);
      const gg = ctx.createLinearGradient(HOUR_GLASS_SHADE.lin[0], 0, HOUR_GLASS_SHADE.lin[2], 0);
      for (const [o, c] of HOUR_GLASS_SHADE.stops) gg.addColorStop(o, c);
      ctx.fillStyle = gg;
      ctx.fill();
      ctx.fillStyle = SAND_RIM;
      ctx.beginPath();
      for (let i = 0; i < sim.n; i++) {
        ctx.moveTo(sim.x[i] + SAND_RIM_STROKE / 2, sim.y[i]);
        ctx.arc(sim.x[i], sim.y[i], SAND_RIM_STROKE / 2, 0, 6.2832);
      }
      ctx.fill();
      // Grains, bucketed by shade then size (batch fillStyle changes).
      // Round dots like the Skia round-cap points, never squares: sand is
      // round, pixels are not.
      for (let shade = 0; shade < SAND_SHADES.length; shade++) {
        for (let big = 0; big <= 1; big++) {
          const s = SAND_STROKES[big];
          const half = s / 2;
          ctx.fillStyle = SAND_SHADES[shade];
          ctx.beginPath();
          for (let i = 0; i < sim.n; i++) {
            if (sim.shade[i] !== shade || sim.big[i] !== big) continue;
            ctx.moveTo(sim.x[i] + half, sim.y[i]);
            ctx.arc(sim.x[i], sim.y[i], half, 0, 6.2832);
          }
          ctx.fill();
        }
      }
      traceGlass(ctx);
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(226, 234, 255, 0.10)";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = HOUR_GLASS;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      for (const line of sheen) {
        ctx.beginPath();
        ctx.moveTo(line[0], line[1]);
        for (let i = 2; i < line.length; i += 2) ctx.lineTo(line[i], line[i + 1]);
        ctx.stroke();
      }
      for (const p of HOUR_FRONT) prim(p);
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.flips !== seenFlips) {
        seenFlips = latest.current.flips;
        sandFlip(sim);
      }
      if (latest.current.reduced) {
        if (!wasReduced) {
          pointer.down = 0;
          sandReleaseDrag(sim);
          sim = createSand(SAND_DEFAULTS, GRAIN_COUNT, 20261020, true);
          wasReduced = true;
        }
      } else {
        if (wasReduced) {
          sim = createSand(SAND_DEFAULTS, GRAIN_COUNT);
          wasReduced = false;
        }
        if (pointer.down) sandDragTo(sim, pointer.x, pointer.y);
        stepSandFrame(sim, dt * (latest.current.slow ? 0.25 : 1));
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * HOUR_W, y: ((ev.clientY - rect.top) / rect.height) * HOUR_H };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.lastY = p.y;
      pointer.lastT = performance.now();
      pointer.vy = 0;
      pointer.down = 1;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!pointer.down) return;
      const p = local(ev);
      const now = performance.now();
      const dtm = Math.max(1, now - pointer.lastT);
      pointer.vy = 0.75 * pointer.vy + 0.25 * ((p.y - pointer.lastY) / dtm) * 1000;
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.lastY = p.y;
      pointer.lastT = now;
    };
    const up = () => {
      if (pointer.down && Math.abs(pointer.vy) > 1100) sandFlip(sim);
      pointer.down = 0;
      sandReleaseDrag(sim);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: HOUR_W, height: HOUR_H }} role="img" aria-label="Sand hourglass web preview: sand pours through a glass hourglass, drag to tilt and fling to flip" />
      <div className={styles.row}>
        <button type="button" className={styles.chip} onClick={() => setFlips((v) => v + 1)}>Flip</button>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Drag sideways to tilt gravity. Fling up or down, or tap Flip, to turn it over.</p>
    </div>
  );
}
