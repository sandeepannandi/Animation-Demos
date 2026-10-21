"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  STRING_COUNT, STR_DX, STR_H, STR_NODES, STR_W, STR_X0, STR_X1,
  createStrings, stringNodeGlow, stringY, stringsDragTo, stringsRelease, stepStringsFrame, type StringsState,
} from "../../packages/ui/src/components/plucked-strings/stringMath";
import { STR_BACKGROUND, STR_BOARD_EDGE, STR_DOT, STR_END_BAR, STR_PIN, STRING_SHADES } from "../../packages/ui/src/components/plucked-strings/stringDesign";
import styles from "./plucked-strings.module.css";

export function PluckedStringsPreview() {
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
    canvas.width = STR_W * dpr;
    canvas.height = STR_H * dpr;
    let sim: StringsState = createStrings();
    const pointer = { x: 0, y: 0, down: 0 };
    let wasReduced = false;

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = STR_BACKGROUND;
      ctx.fillRect(0, 0, STR_W, STR_H);
      ctx.fillStyle = STR_BOARD_EDGE;
      ctx.beginPath();
      ctx.roundRect(8, 60, STR_W - 8, STR_H - 90, 14);
      ctx.fill();
      ctx.fillStyle = STR_END_BAR;
      ctx.fillRect(STR_X0 - 9, 74, 7, 232);
      ctx.fillRect(STR_X1 + 2, 74, 7, 232);
      // Strings: round dots bucketed by copper shade. Nodes sit 2 px apart,
      // so the dots merge into a line whose highlights travel with the wave.
      for (let shade = 0; shade < STRING_SHADES.length; shade++) {
        const half = STR_DOT / 2;
        ctx.fillStyle = STRING_SHADES[shade];
        ctx.beginPath();
        for (let k = 0; k < STRING_COUNT; k++) {
          const base = k * STR_NODES;
          const y0 = stringY(k);
          for (let i = 0; i < STR_NODES; i++) {
            const glow = stringNodeGlow(sim, k, i);
            const bucket = Math.min(3, Math.floor((1 - glow) * 4));
            if (bucket !== shade) continue;
            const x = STR_X0 + i * STR_DX;
            const y = y0 + sim.u[base + i];
            ctx.moveTo(x + half, y);
            ctx.arc(x, y, half, 0, 6.2832);
          }
        }
        ctx.fill();
      }
      ctx.fillStyle = STR_PIN;
      ctx.beginPath();
      for (let k = 0; k < STRING_COUNT; k++) {
        ctx.moveTo(STR_X0 - 5 + 2.5, stringY(k));
        ctx.arc(STR_X0 - 5, stringY(k), 2.5, 0, 6.2832);
        ctx.moveTo(STR_X1 + 5 + 2.5, stringY(k));
        ctx.arc(STR_X1 + 5, stringY(k), 2.5, 0, 6.2832);
      }
      ctx.fill();
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.reduced) {
        if (!wasReduced) {
          pointer.down = 0;
          stringsRelease(sim);
          sim = createStrings(true);
          wasReduced = true;
        }
      } else {
        if (wasReduced) {
          sim = createStrings();
          wasReduced = false;
        }
        if (pointer.down) stringsDragTo(sim, pointer.x, pointer.y);
        stepStringsFrame(sim, dt * (latest.current.slow ? 0.25 : 1));
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * STR_W, y: ((ev.clientY - rect.top) / rect.height) * STR_H };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.down = 1;
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!pointer.down) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
    };
    const up = () => {
      pointer.down = 0;
      stringsRelease(sim);
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: STR_W, height: STR_H }} role="img" aria-label="Plucked strings web preview: drag a copper string and let go, waves reflect off the fixed ends and fade" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Drag a string up or down, then let go. Thick strings carry slower waves.</p>
    </div>
  );
}
