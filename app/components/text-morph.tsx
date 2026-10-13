"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  buildMorph,
  layoutGlyphs,
  makeConfig,
  pageColor,
} from "../../packages/ui/src/components/text-morph/textMorphMath";
import { lighthouseImage } from "../../packages/ui/src/components/text-morph/scene";
import { LIGHTHOUSE_TEXT } from "../../packages/ui/src/components/text-morph/lighthouseText";
import styles from "./text-morph.module.css";

const W = 640; // canvas resolution (4:5)
const H = 800;
const INK = [0.13, 0.12, 0.11];
const DURATION = 2200;
const FAMILY = "Geist, ui-sans-serif, system-ui, sans-serif";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function TextMorphPreview() {
  const reduced = Boolean(useReducedMotion());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [morphed, setMorphed] = useState(false);
  const s = useRef({ p: 0, from: 0, to: 0, start: 0, drag: false, startX: 0, startP: 0, moved: false, lastX: 0, lastT: 0, vx: 0 });
  const morphedRef = useRef(morphed);
  morphedRef.current = morphed;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const cfg = useMemo(() => makeConfig(W), []);
  const image = useMemo(() => lighthouseImage(192), []);
  const [data, setData] = useState<ReturnType<typeof buildMorph> | null>(null);

  useEffect(() => {
    let alive = true;
    const build = () => {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx || !alive) return;
      ctx.font = `${cfg.fontSize}px ${FAMILY}`;
      setData(buildMorph(LIGHTHOUSE_TEXT, image, cfg, (ch) => ctx.measureText(ch).width));
    };
    // Measure after the page font is ready so line breaks match what is drawn.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.load) {
      fonts.load(`${cfg.fontSize}px Geist`).catch(() => {}).finally(build);
    } else build();
    return () => { alive = false; };
  }, [cfg, image]);

  const settle = (to: number) => {
    const st = s.current;
    st.from = st.p;
    st.to = to;
    st.start = performance.now();
  };

  useEffect(() => { settle(morphed ? 1 : 0); }, [morphed, reduced]);

  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const out = new Array(data.count * 7);
    const page = [0, 0, 0];
    let raf = 0;
    const draw = (now: number) => {
      const st = s.current;
      if (!st.drag && st.p !== st.to) {
        const dur = reducedRef.current ? 200 : DURATION;
        const t = Math.min(1, (now - st.start) / dur);
        st.p = st.from + (st.to - st.from) * ease(t);
        if (t >= 1) st.p = st.to;
      }
      const p = st.p;
      layoutGlyphs(p, data, INK, out);
      pageColor(p, page);
      ctx.fillStyle = `rgb(${page[0] * 255},${page[1] * 255},${page[2] * 255})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "alphabetic";
      for (let i = 0; i < data.count; i += 1) {
        const o = i * 7;
        const size = out[o + 3];
        const w = (data.gw[i] * size) / data.fontSize;
        ctx.save();
        ctx.translate(out[o], out[o + 1]);
        ctx.rotate(out[o + 2]);
        ctx.font = `${size}px ${FAMILY}`;
        ctx.fillStyle = `rgb(${out[o + 4] * 255},${out[o + 5] * 255},${out[o + 6] * 255})`;
        ctx.fillText(data.chars[i], -w / 2, size * 0.34);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * W;
    };
    const down = (e: PointerEvent) => {
      const st = s.current;
      canvas.setPointerCapture(e.pointerId);
      st.drag = true;
      st.moved = false;
      st.startX = toLocal(e);
      st.startP = st.p;
      st.lastX = st.startX;
      st.lastT = performance.now();
      st.vx = 0;
    };
    const move = (e: PointerEvent) => {
      const st = s.current;
      if (!st.drag) return;
      const x = toLocal(e);
      const dx = x - st.startX;
      if (Math.abs(dx) > 9) st.moved = true;
      if (st.moved) st.p = Math.max(0, Math.min(1, st.startP + dx / (W * 0.7)));
      const now = performance.now();
      st.vx = (x - st.lastX) / Math.max(1, now - st.lastT);
      st.lastX = x;
      st.lastT = now;
    };
    const up = () => {
      const st = s.current;
      if (!st.drag) return;
      st.drag = false;
      const to = st.moved ? (st.p + st.vx * 160 / (W * 0.7) > 0.5 ? 1 : 0) : morphedRef.current ? 0 : 1;
      settle(to);
      setMorphed(to === 1);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    const cancel = () => {
      const st = s.current;
      if (!st.drag) return;
      st.drag = false;
      settle(morphedRef.current ? 1 : 0);
    };
    canvas.addEventListener("pointercancel", cancel);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, [data]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.kicker}>TEXT MORPH</span>
        <span className={styles.state}>{morphed ? "a lighthouse" : "a page"}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={styles.canvas}
        role="img"
        aria-label={morphed ? "A lighthouse under a full moon, made of letters" : "A paragraph about a lighthouse keeper"}
      />
      <button className={styles.button} onClick={() => setMorphed((v) => !v)}>
        {morphed ? "Back to the page" : "Turn into a picture"}
      </button>
      <p className={styles.hint}>Tap the page, or drag sideways to scrub.</p>
    </div>
  );
}
