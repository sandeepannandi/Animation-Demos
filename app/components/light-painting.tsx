"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  createRope,
  stepRopeFixed,
  bulbPosition,
  shadeBuffer,
  type Vec,
} from "../../packages/ui/src/components/light-painting/lightMath";
import {
  PAINTINGS,
  rasterize,
  type RasterizedPainting,
} from "../../packages/ui/src/components/light-painting/paintings";
import styles from "./light-painting.module.css";

const PX = 640; // canvas resolution
const SHADE = 160; // shading buffer resolution
const ANCHOR = { x: PX / 2, y: 6 };
const ROPE_LENGTH = 300;

export function LightPaintingPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [paintingIndex, setPaintingIndex] = useState(0);
  const stateRef = useRef({
    rope: createRope({ anchor: ANCHOR, segments: 8, length: ROPE_LENGTH }),
    drag: null as Vec | null,
    swipe: null as { x: number; y: number; t: number } | null,
    rasters: [] as RasterizedPainting[],
    painting: 0,
    last: 0,
  });

  useEffect(() => {
    stateRef.current.painting = paintingIndex;
  }, [paintingIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = stateRef.current;
    st.rasters = PAINTINGS.map((p) => rasterize(p, SHADE));
    const off = document.createElement("canvas");
    off.width = SHADE;
    off.height = SHADE;
    const offCtx = off.getContext("2d")!;
    const img = offCtx.createImageData(SHADE, SHADE);
    const out = new Uint8ClampedArray(SHADE * SHADE * 4);

    let raf = 0;
    const frame = (now: number) => {
      const dt = st.last ? (now - st.last) / 1000 : 1 / 60;
      st.last = now;
      if (!reduced) stepRopeFixed(st.rope, dt, { dragTarget: st.drag, elasticity: 0.08 });
      const bulb = bulbPosition(st.rope);
      const r = st.rasters[st.painting];

      shadeBuffer({
        size: SHADE,
        albedo: r.albedo,
        depth: r.depth,
        bulb: { x: (bulb.x / PX) * SHADE, y: (bulb.y / PX) * SHADE },
        bulbZ: 1.1,
        intensity: 1.1,
        ambient: 0.12,
        out,
      });
      img.data.set(out);
      offCtx.putImageData(img, 0, 0);

      // dark room
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, PX, PX);
      // painting inside a wooden frame
      const fx = 56, fy = 56, fs = PX - 112;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, fx, fy, fs, fs);
      ctx.strokeStyle = "#3d2c1c";
      ctx.lineWidth = 14;
      ctx.strokeRect(fx - 7, fy - 7, fs + 14, fs + 14);
      ctx.strokeStyle = "#5a422a";
      ctx.lineWidth = 3;
      ctx.strokeRect(fx - 12, fy - 12, fs + 24, fs + 24);

      // cord
      ctx.strokeStyle = "#2a2f3a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(st.rope.nodes[0].x, st.rope.nodes[0].y);
      for (const n of st.rope.nodes) ctx.lineTo(n.x, n.y);
      ctx.stroke();

      // bulb glow + bulb
      const glow = ctx.createRadialGradient(bulb.x, bulb.y, 2, bulb.x, bulb.y, 120);
      glow.addColorStop(0, "rgba(255, 236, 180, 0.55)");
      glow.addColorStop(0.25, "rgba(255, 226, 160, 0.18)");
      glow.addColorStop(1, "rgba(255, 226, 160, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, PX, PX);
      ctx.fillStyle = "#ffe9b8";
      ctx.beginPath();
      ctx.arc(bulb.x, bulb.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath();
      ctx.arc(bulb.x - 3, bulb.y - 3, 5, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toLocal = (e: PointerEvent): Vec => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * PX,
        y: ((e.clientY - r.top) / r.height) * PX,
      };
    };
    const down = (e: PointerEvent) => {
      const p = toLocal(e);
      const bulb = bulbPosition(stateRef.current.rope);
      canvas.setPointerCapture(e.pointerId);
      if (Math.hypot(p.x - bulb.x, p.y - bulb.y) < 70) {
        stateRef.current.drag = p;
      } else {
        stateRef.current.swipe = { x: p.x, y: p.y, t: performance.now() };
      }
    };
    const move = (e: PointerEvent) => {
      if (stateRef.current.drag) stateRef.current.drag = toLocal(e);
    };
    const up = (e: PointerEvent) => {
      const st = stateRef.current;
      if (st.drag) {
        st.drag = null;
        return;
      }
      if (st.swipe) {
        const p = toLocal(e);
        const dx = p.x - st.swipe.x;
        const dt = performance.now() - st.swipe.t;
        if (Math.abs(dx) > 60 && dt < 600) {
          setPaintingIndex((i) => {
            const n = PAINTINGS.length;
            return dx < 0 ? (i + 1) % n : (i - 1 + n) % n;
          });
        }
        st.swipe = null;
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.kicker}>LIGHT ON PAINTING</span>
        <span className={styles.paintingName}>{PAINTINGS[paintingIndex].name}</span>
      </div>
      <canvas ref={canvasRef} width={PX} height={PX} className={styles.canvas} />
      <p className={styles.hint}>
        Drag the bulb to move the light. Swipe across the painting for the next one.
      </p>
    </div>
  );
}
