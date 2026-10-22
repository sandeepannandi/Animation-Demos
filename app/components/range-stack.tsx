"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  RS_H, RS_SETTLE, RS_SLOW, RS_W, rsCreate, rsModel, rsReset, rsTap, type RsSel,
} from "../../packages/ui/src/components/range-stack/rangeMath";
import { drawRange, hitDay } from "./range-stack-draw";
import styles from "./range-stack.module.css";

export function RangeStackPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced });
  latest.current = { slow, reduced };
  const sel = useRef<RsSel>(rsCreate());
  const clock = useRef(0);
  const demo = useRef<{ at: number; n: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = RS_W * dpr;
    canvas.height = RS_H * dpr;
    let raf = 0;
    let last = 0;
    const steps = [9, 13];
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      clock.current += dt * (latest.current.reduced ? 1 : latest.current.slow ? RS_SLOW : 1);
      const d = demo.current;
      if (d && clock.current >= d.at) {
        sel.current = rsTap(sel.current, steps[d.n], clock.current);
        d.n += 1;
        d.at = clock.current + 0.9;
        if (d.n >= steps.length) demo.current = null;
      }
      let t = clock.current;
      if (latest.current.reduced) t += RS_SETTLE;
      const model = rsModel(sel.current, t);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRange(ctx, model, sel.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * RS_W;
    const y = ((ev.clientY - rect.top) / rect.height) * RS_H;
    demo.current = null;
    const day = hitDay(x, y);
    if (day) sel.current = rsTap(sel.current, day, clock.current);
    else if (y > 322 && x < 90) sel.current = rsReset(clock.current, sel.current);
  };
  const pickForMe = () => {
    sel.current = rsReset(clock.current, sel.current);
    demo.current = { at: clock.current + 0.45, n: 0 };
  };
  const pickAnother = () => {
    const base = 1 + Math.floor(Math.random() * 18);
    sel.current = rsReset(clock.current, sel.current);
    demo.current = null;
    sel.current = rsTap(sel.current, base, clock.current + 0.2);
    sel.current = rsTap(sel.current, base + 2 + Math.floor(Math.random() * 6), clock.current + 0.7);
  };

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} width={RS_W} height={RS_H} role="img" aria-label="Range Stack web preview: pick two dates, a skeleton appears and a fanned stack of home photos springs in" onClick={onClick} />
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={pickForMe}>Pick dates for me</button>
        <button type="button" className={styles.chip} onClick={pickAnother}>Pick another range</button>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Tap a start and an end date. The photo stack reloads for every new range.</p>
    </div>
  );
}
