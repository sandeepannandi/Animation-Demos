"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CLOTH_DEFAULTS, clothIndices, computeMesh, createCloth, pickParticle, stepClothFixed,
  type ClothConfig, type ClothPointer, type ClothState,
} from "../../packages/ui/src/components/cloth-banner/clothMath";
import { BANNER_H, BANNER_W, bannerDesign, type Item } from "../../packages/ui/src/components/cloth-banner/bannerDesign";
import styles from "./cloth-banner.module.css";

const COLS = 25, ROWS = 17;
const PAD_X = 48, PAD_TOP = 40, PAD_BOTTOM = 64;
const CANVAS_W = BANNER_W + PAD_X * 2;
const CANVAS_H = BANNER_H + PAD_TOP + PAD_BOTTOM;
const S = 2;
const CFG: ClothConfig = {
  cols: COLS, rows: ROWS,
  spacingX: BANNER_W / (COLS - 1), spacingY: BANNER_H / (ROWS - 1),
  originX: PAD_X, originY: PAD_TOP,
  perspective: 620, centerX: PAD_X + BANNER_W / 2, centerY: PAD_TOP + BANNER_H / 2,
};

function drawArtwork() {
  const canvas = document.createElement("canvas");
  canvas.width = BANNER_W * S;
  canvas.height = BANNER_H * S;
  const c = canvas.getContext("2d")!;
  for (const it of bannerDesign() as Item[]) {
    c.fillStyle = it.color;
    if (it.k === "rect") {
      if (!it.r) c.fillRect(it.x * S, it.y * S, it.w * S, it.h * S);
      else {
        c.beginPath();
        c.roundRect(it.x * S, it.y * S, it.w * S, it.h * S, it.r * S);
        c.fill();
      }
    } else {
      c.font = `${it.size * S}px "Geist", sans-serif`;
      c.textAlign = it.align ?? "left";
      c.textBaseline = "alphabetic";
      c.fillText(it.text, it.x * S, it.y * S);
    }
  }
  return canvas;
}

export function ClothBannerPreview() {
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    const art = drawArtwork();
    const sim: ClothState = createCloth(CFG);
    const pointer: ClothPointer = { x: 0, y: 0, active: 0 };
    const indices = clothIndices(CFG);
    const xy: { x: number; y: number }[] = [];
    const shade: number[] = [];
    // Texture coords in artwork px, one per particle.
    const uv: { x: number; y: number }[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) uv.push({ x: (c / (COLS - 1)) * art.width, y: (r / (ROWS - 1)) * art.height });

    // Textured triangle via an affine map from uv to screen, expanded a hair
    // around its centroid so neighboring triangles overlap instead of seam.
    const drawTri = (i0: number, i1: number, i2: number) => {
      const p0 = xy[i0], p1 = xy[i1], p2 = xy[i2];
      const u0 = uv[i0], u1 = uv[i1], u2 = uv[i2];
      const mx = (p0.x + p1.x + p2.x) / 3, my = (p0.y + p1.y + p2.y) / 3;
      const grow = (p: { x: number; y: number }) => {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.hypot(dx, dy) || 1;
        return { x: p.x + (dx / d) * 0.8, y: p.y + (dy / d) * 0.8 };
      };
      const q0 = grow(p0), q1 = grow(p1), q2 = grow(p2);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.closePath();
      ctx.clip();
      const den = (u1.x - u0.x) * (u2.y - u0.y) - (u2.x - u0.x) * (u1.y - u0.y) || 1e-6;
      const a = ((q1.x - q0.x) * (u2.y - u0.y) - (q2.x - q0.x) * (u1.y - u0.y)) / den;
      const b = ((q2.x - q0.x) * (u1.x - u0.x) - (q1.x - q0.x) * (u2.x - u0.x)) / den;
      const cc = ((q1.y - q0.y) * (u2.y - u0.y) - (q2.y - q0.y) * (u1.y - u0.y)) / den;
      const d = ((q2.y - q0.y) * (u1.x - u0.x) - (q1.y - q0.y) * (u2.x - u0.x)) / den;
      const e = q0.x - a * u0.x - cc * u0.y;
      const f = q0.y - b * u0.x - d * u0.y;
      ctx.transform(a, b, cc, d, e, f);
      ctx.drawImage(art, 0, 0);
      ctx.restore();
      // Per-vertex shade, filled with the exact linear gradient of the three
      // vertex alphas (a plane through three values is a linear gradient), so
      // brightness varies smoothly across the mesh instead of stepping per
      // triangle.
      const a0 = 1 - shade[i0], a1 = 1 - shade[i1], a2 = 1 - shade[i2];
      const aMax = Math.max(a0, a1, a2);
      if (aMax > 0.004) {
        const aMin = Math.min(a0, a1, a2);
        const e1x = p1.x - p0.x, e1y = p1.y - p0.y, e2x = p2.x - p0.x, e2y = p2.y - p0.y;
        const det = e1x * e2y - e2x * e1y || 1e-6;
        const gx = ((a1 - a0) * e2y - (a2 - a0) * e1y) / det;
        const gy = ((a2 - a0) * e1x - (a1 - a0) * e2x) / det;
        const g2 = gx * gx + gy * gy;
        let grad;
        if (g2 < 1e-8) {
          grad = ctx.createLinearGradient(q0.x, q0.y, q0.x + 1, q0.y);
          grad.addColorStop(0, `rgba(8,14,10,${a0.toFixed(3)})`);
          grad.addColorStop(1, `rgba(8,14,10,${a0.toFixed(3)})`);
        } else {
          const tMin = (aMin - a0) / g2, tMax = (aMax - a0) / g2;
          grad = ctx.createLinearGradient(p0.x + gx * tMin, p0.y + gy * tMin, p0.x + gx * tMax, p0.y + gy * tMax);
          grad.addColorStop(0, `rgba(8,14,10,${aMin.toFixed(3)})`);
          grad.addColorStop(1, `rgba(8,14,10,${aMax.toFixed(3)})`);
        }
        ctx.beginPath();
        ctx.moveTo(q0.x, q0.y);
        ctx.lineTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      computeMesh(sim, CFG, xy, shade, CLOTH_DEFAULTS);
      for (let t = 0; t < indices.length; t += 3) drawTri(indices[t], indices[t + 1], indices[t + 2]);
      // The two pins the banner hangs from.
      for (const px of [CFG.originX, CFG.originX + BANNER_W]) {
        ctx.beginPath();
        ctx.arc(px, CFG.originY, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#2c4a37";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, CFG.originY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#e9dfc8";
        ctx.fill();
      }
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (!latest.current.reduced) {
        if (pointer.active && sim.grabbed < 0) {
          sim.grabbed = pickParticle(sim, CFG, pointer.x, pointer.y, CLOTH_DEFAULTS.grabRadius + 14);
          if (sim.grabbed >= 0) sim.grabZ = sim.pos[sim.grabbed * 3 + 2];
        }
        if (!pointer.active && sim.grabbed >= 0) sim.grabbed = -1;
        stepClothFixed(sim, CFG, dt * (latest.current.slow ? 0.25 : 1), pointer, CLOTH_DEFAULTS);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * CANVAS_W, y: ((ev.clientY - rect.top) / rect.height) * CANVAS_H };
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: CANVAS_W, height: CANVAS_H }} role="img" aria-label="Cloth banner web preview: a green flower show banner pinned at two corners, rippling in a breeze" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>The banner hangs from two pins in a light breeze. Grab a corner and let go.</p>
    </div>
  );
}
