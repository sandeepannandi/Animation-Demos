"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  PENDULUM_DEFAULTS, bobPositions, createPendulum, restPendulum, stepPendulumFixed, trailIndex,
  type PendulumConfig, type PendulumPointer,
} from "../../packages/ui/src/components/chaos-pendulum/pendulumMath";
import {
  BOB_RADIUS, ELBOW_TRAIL, PENDULUM_ARM, PENDULUM_BACKGROUND, PENDULUM_BOB, PENDULUM_H, PENDULUM_ORIGIN_X,
  PENDULUM_ORIGIN_Y, PENDULUM_PX_PER_M, PENDULUM_W, TIP_TRAIL, TRAIL_BUCKETS, TRAIL_LAYERS, trailStyle,
  type TrailSpec,
} from "../../packages/ui/src/components/chaos-pendulum/pendulumDesign";
import styles from "./chaos-pendulum.module.css";

const CFG: PendulumConfig = { originX: PENDULUM_ORIGIN_X, originY: PENDULUM_ORIGIN_Y, pixelsPerMeter: PENDULUM_PX_PER_M };

export function ChaosPendulumPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced });
  latest.current = { slow, reduced };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PENDULUM_W * dpr;
    canvas.height = PENDULUM_H * dpr;
    const sim = createPendulum(PENDULUM_DEFAULTS);
    const pointer: PendulumPointer = { x: 0, y: 0, active: 0 };
    const pos = [0, 0, 0, 0];
    const length = PENDULUM_DEFAULTS.trailLength;
    const per = length / TRAIL_BUCKETS;
    let wasReduced = false;

    const drawTrail = (buf: Float32Array, spec: TrailSpec, layers: number) => {
      const shown = TRAIL_LAYERS.slice(TRAIL_LAYERS.length - layers);
      for (let b = 0; b < TRAIL_BUCKETS; b++) {
        const style = trailStyle(spec, b, TRAIL_BUCKETS);
        const first = trailIndex(sim, length, b * per);
        if (first < 0) break;
        for (const layer of shown) {
          ctx.beginPath();
          ctx.moveTo(buf[first * 2], buf[first * 2 + 1]);
          for (let k = b * per + 1; k <= (b + 1) * per; k++) {
            const i = trailIndex(sim, length, k);
            if (i < 0) break;
            ctx.lineTo(buf[i * 2], buf[i * 2 + 1]);
          }
          ctx.strokeStyle = style.color;
          ctx.globalAlpha = Math.min(1, layer.alpha * style.alpha);
          ctx.lineWidth = layer.width;
          ctx.lineCap = "butt";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const bob = (x: number, y: number, glow: string, haloAlpha: number) => {
      ctx.fillStyle = glow;
      ctx.globalAlpha = haloAlpha * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, BOB_RADIUS + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = haloAlpha;
      ctx.beginPath();
      ctx.arc(x, y, BOB_RADIUS + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PENDULUM_BOB;
      ctx.beginPath();
      ctx.arc(x, y, BOB_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (showTrails: boolean) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PENDULUM_BACKGROUND;
      ctx.fillRect(0, 0, PENDULUM_W, PENDULUM_H);
      if (showTrails) {
        drawTrail(sim.trail1, ELBOW_TRAIL, 2);
        drawTrail(sim.trail2, TIP_TRAIL, 3);
      }
      bobPositions(sim, CFG, PENDULUM_DEFAULTS, pos);
      ctx.strokeStyle = PENDULUM_ARM;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(PENDULUM_ORIGIN_X, PENDULUM_ORIGIN_Y);
      ctx.lineTo(pos[0], pos[1]);
      ctx.lineTo(pos[2], pos[3]);
      ctx.stroke();
      ctx.fillStyle = PENDULUM_ARM;
      ctx.beginPath();
      ctx.arc(PENDULUM_ORIGIN_X, PENDULUM_ORIGIN_Y, 5, 0, Math.PI * 2);
      ctx.fill();
      bob(pos[0], pos[1], ELBOW_TRAIL.head, 0.25);
      bob(pos[2], pos[3], TIP_TRAIL.head, 0.3);
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.reduced) {
        if (!wasReduced) {
          pointer.active = 0;
          restPendulum(sim, 0.55, 0.85);
          wasReduced = true;
        }
        draw(false);
      } else {
        if (wasReduced) {
          Object.assign(sim, createPendulum(PENDULUM_DEFAULTS));
          wasReduced = false;
        }
        stepPendulumFixed(sim, CFG, dt * (latest.current.slow ? 0.25 : 1), pointer, PENDULUM_DEFAULTS);
        draw(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * PENDULUM_W, y: ((ev.clientY - rect.top) / rect.height) * PENDULUM_H };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = 1;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!pointer.active) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
    };
    const up = () => {
      pointer.active = 0;
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
  }, []);

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: PENDULUM_W, height: PENDULUM_H }} role="img" aria-label="Chaos pendulum web preview: a double pendulum swinging with glowing fading trails" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Grab the pendulum and fling it. The trails fade over four seconds.</p>
    </div>
  );
}
