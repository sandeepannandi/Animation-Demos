"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  WHEEL_H, WHEEL_COLS, WHEEL_SIZES, WHEEL_SLOW, WHEEL_W,
  wheelCreate, wheelFling, wheelGrab, wheelRelease, wheelSettled, wheelStep, wheelValue, type WheelState,
} from "../../packages/ui/src/components/wheel-time-picker/wheelMath";
import { drawWheel } from "./wheel-time-picker-draw";
import styles from "./wheel-time-picker.module.css";

export function WheelTimePickerPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced });
  latest.current = { slow, reduced };
  const sim = useRef<WheelState>(wheelCreate());
  const [label, setLabel] = useState("7:30 AM");
  const drag = useRef<{ d: number; y0: number; id: number; samples: { t: number; y: number }[] } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WHEEL_W * dpr;
    canvas.height = WHEEL_H * dpr;
    let raf = 0;
    let last = 0;
    let shown = "";
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      const s = sim.current;
      if (latest.current.reduced) {
        for (let d = 0; d < 3; d++) {
          const m = s.drums[d];
          if (!m.drag && (m.v !== 0 || m.p !== Math.round(m.p))) {
            let r = Math.round(m.p + m.v * 0.1);
            if (d === 2) r = Math.max(0, Math.min(WHEEL_SIZES[2] - 1, r));
            m.p = r; m.v = 0; m.target = NaN; m.lastRow = r;
          }
        }
      } else wheelStep(s, dt * (latest.current.slow ? WHEEL_SLOW : 1));
      if (wheelSettled(s)) {
        const v = wheelValue(s);
        const txt = `${v.hour}:${String(v.minute).padStart(2, "0")} ${v.period}`;
        if (txt !== shown) { shown = txt; setLabel(txt); }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const local = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return { x: ((ev.clientX - rect.left) / rect.width) * WHEEL_W, y: ((ev.clientY - rect.top) / rect.height) * WHEEL_H };
  };
  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = local(ev);
    let d = 0;
    let best = 1e9;
    for (let k = 0; k < 3; k++) if (Math.abs(x - WHEEL_COLS[k]) < best) { best = Math.abs(x - WHEEL_COLS[k]); d = k; }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    drag.current = { d, y0: y, id: ev.pointerId, samples: [{ t: performance.now(), y }] };
    wheelGrab(sim.current, d, 0);
  };
  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const g = drag.current;
    if (!g || g.id !== ev.pointerId) return;
    const { y } = local(ev);
    g.samples.push({ t: performance.now(), y });
    if (g.samples.length > 6) g.samples.shift();
    wheelGrab(sim.current, g.d, y - g.y0);
  };
  const onUp = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const g = drag.current;
    if (!g || g.id !== ev.pointerId) return;
    drag.current = null;
    const a = g.samples[0], b = g.samples[g.samples.length - 1];
    const stale = performance.now() - b.t > 90;
    const vy = stale || b.t === a.t ? 0 : (b.y - a.y) / (b.t - a.t);
    wheelRelease(sim.current, g.d, vy);
  };
  const spin = () => {
    const s = sim.current;
    wheelFling(s, 0, -16);
    wheelFling(s, 1, -58);
    wheelFling(s, 2, -7);
  };
  const spinAnother = () => {
    const s = sim.current;
    wheelFling(s, 0, 10 + Math.random() * 30);
    wheelFling(s, 1, 20 + Math.random() * 70);
    wheelFling(s, 2, Math.random() < 0.5 ? -9 : 9);
  };

  return (
    <div className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={WHEEL_W}
        height={WHEEL_H}
        role="img"
        aria-label="Wheel Time Picker web preview: three drums for hour, minute and AM or PM. Drag or fling, they coast and snap to a row"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <p className={styles.time} aria-live="polite">{label}</p>
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={spin}>Spin for me</button>
        <button type="button" className={styles.chip} onClick={spinAnother}>Spin another way</button>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Drag or fling a drum. It coasts, the ticks sharpen as it slows, then it snaps to a row.</p>
    </div>
  );
}
