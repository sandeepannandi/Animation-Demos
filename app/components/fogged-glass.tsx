"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  FOG_DEFAULTS, applyWipe, createFog, packFrame, stepFogFixed, maxDrops,
  type FogConfig, type FogState,
} from "../../packages/ui/src/components/fogged-glass/fogMath";
import { PANE_H, PANE_W, sceneDesign, type Item } from "../../packages/ui/src/components/fogged-glass/sceneDesign";
import styles from "./fogged-glass.module.css";

const COLS = 96, ROWS = 128;
const CFG: FogConfig = { cols: COLS, rows: ROWS, width: PANE_W, height: PANE_H };
const S = 2;

function drawArtwork() {
  const canvas = document.createElement("canvas");
  canvas.width = PANE_W * S;
  canvas.height = PANE_H * S;
  const c = canvas.getContext("2d")!;
  for (const it of sceneDesign() as Item[]) {
    if (it.k === "vgrad") {
      const g = c.createLinearGradient(it.x * S, it.y * S, it.x * S, (it.y + it.h) * S);
      g.addColorStop(0, it.from);
      g.addColorStop(1, it.to);
      c.fillStyle = g;
      c.fillRect(it.x * S, it.y * S, it.w * S, it.h * S);
    } else if (it.k === "rect") {
      c.fillStyle = it.color;
      if (!it.r) c.fillRect(it.x * S, it.y * S, it.w * S, it.h * S);
      else {
        c.beginPath();
        c.roundRect(it.x * S, it.y * S, it.w * S, it.h * S, it.r * S);
        c.fill();
      }
    } else if (it.k === "circle") {
      c.fillStyle = it.color;
      c.beginPath();
      c.arc(it.x * S, it.y * S, it.r * S, 0, Math.PI * 2);
      c.fill();
    } else if (it.k === "poly") {
      c.fillStyle = it.color;
      c.beginPath();
      c.moveTo(it.points[0] * S, it.points[1] * S);
      for (let i = 2; i < it.points.length; i += 2) c.lineTo(it.points[i] * S, it.points[i + 1] * S);
      c.closePath();
      c.fill();
    } else {
      c.fillStyle = it.color;
      c.font = `${it.size * S}px "Geist", sans-serif`;
      c.textAlign = it.align ?? "left";
      c.textBaseline = "alphabetic";
      c.fillText(it.text, it.x * S, it.y * S);
    }
  }
  return canvas;
}

// The foggy read: the artwork drawn tiny and upscaled with smoothing.
function drawBlurred(art: HTMLCanvasElement) {
  const small = document.createElement("canvas");
  small.width = 48;
  small.height = 64;
  small.getContext("2d")!.drawImage(art, 0, 0, small.width, small.height);
  const blur = document.createElement("canvas");
  blur.width = PANE_W * S;
  blur.height = PANE_H * S;
  const c = blur.getContext("2d")!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(small, 0, 0, blur.width, blur.height);
  return blur;
}

export function FoggedGlassPreview() {
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
    canvas.width = PANE_W * dpr;
    canvas.height = PANE_H * dpr;

    const art = drawArtwork();
    const blurredArt = drawBlurred(art);
    const sim: FogState = createFog(CFG, FOG_DEFAULTS);
    const bytes = new Uint8Array(COLS * ROWS * 4);

    // Fog mask at grid resolution; the alpha channel is the fog level.
    const mask = document.createElement("canvas");
    mask.width = COLS;
    mask.height = ROWS;
    const maskCtx = mask.getContext("2d")!;
    const maskData = maskCtx.createImageData(COLS, ROWS);

    // Fog layer at pane resolution: blurred scene + haze, cut by the mask.
    const layer = document.createElement("canvas");
    layer.width = PANE_W * S;
    layer.height = PANE_H * S;
    const layerCtx = layer.getContext("2d")!;

    const pointer = { x: 0, y: 0, active: false };

    const draw = () => {
      packFrame(sim, CFG, bytes);
      const src = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      maskData.data.set(src);
      maskCtx.putImageData(maskData, 0, 0);

      layerCtx.globalCompositeOperation = "source-over";
      layerCtx.clearRect(0, 0, layer.width, layer.height);
      layerCtx.drawImage(blurredArt, 0, 0);
      layerCtx.fillStyle = "rgba(237, 242, 247, 0.55)";
      layerCtx.fillRect(0, 0, layer.width, layer.height);
      layerCtx.globalCompositeOperation = "destination-in";
      layerCtx.imageSmoothingEnabled = true;
      layerCtx.imageSmoothingQuality = "high";
      layerCtx.drawImage(mask, 0, 0, layer.width, layer.height);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, PANE_W, PANE_H);
      ctx.drawImage(art, 0, 0, PANE_W, PANE_H);
      ctx.drawImage(layer, 0, 0, PANE_W, PANE_H);

      // Beads: a magnified cut of the sharp scene, a rim and a highlight.
      for (let s = 0; s < maxDrops(); s++) {
        if (sim.drops[s * 4 + 3] === 0) continue;
        const x = sim.drops[s * 4];
        const y = sim.drops[s * 4 + 1];
        const r = sim.drops[s * 4 + 2];
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        const k = 0.72;
        ctx.drawImage(art, (x - r * k) * S, (y - r * k) * S, 2 * r * k * S, 2 * r * k * S, x - r, y - r, 2 * r, 2 * r);
        const rim = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
        rim.addColorStop(0, "rgba(0,0,0,0)");
        rim.addColorStop(1, "rgba(10,16,28,0.35)");
        ctx.fillStyle = rim;
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        const spec = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, 0, x - r * 0.38, y - r * 0.42, r * 0.7);
        spec.addColorStop(0, "rgba(255,255,255,0.75)");
        spec.addColorStop(0.5, "rgba(255,255,255,0.12)");
        spec.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = spec;
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        ctx.restore();
      }
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (!latest.current.reduced) {
        stepFogFixed(sim, CFG, dt * (latest.current.slow ? 0.25 : 1), FOG_DEFAULTS);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * PANE_W, y: ((ev.clientY - rect.top) / rect.height) * PANE_H };
    };
    const down = (ev: PointerEvent) => {
      if (latest.current.reduced) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      sim.wasWiping = 0;
      applyWipe(sim, CFG, p.x, p.y, FOG_DEFAULTS);
      canvas.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => {
      if (!pointer.active) return;
      const p = local(ev);
      pointer.x = p.x;
      pointer.y = p.y;
      applyWipe(sim, CFG, p.x, p.y, FOG_DEFAULTS);
    };
    const up = () => {
      pointer.active = false;
      sim.wasWiping = 0;
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
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: PANE_W, height: PANE_H }} role="img" aria-label="Fogged glass web preview: a misted window over a dusk lake; wipe the fog away with your finger" />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>A misted window at dusk. Wipe the glass; the fog creeps back.</p>
    </div>
  );
}
