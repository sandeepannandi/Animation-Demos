"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import qrcode from "qrcode-generator";
import {
  CREAM,
  ISO_YAW,
  buildScene,
  layoutScene,
  makeConfig,
} from "../../packages/ui/src/components/blossom-qr/blossomMath";
import styles from "./blossom-qr.module.css";

const URL_TEXT = "https://nativelet.netlify.app/";
const PX = 640;
const SPREAD = 0.34;

function encode(text: string) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => q.isDark(r, c)),
  );
}

const byte = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);

export function BlossomQRPreview() {
  const system = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const reduced = Boolean(system);
  const modules = useMemo(() => encode(URL_TEXT), []);
  const scene = useMemo(() => buildScene(modules), [modules]);
  const cfg = useMemo(() => makeConfig(PX, modules.length), [modules]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = useRef({ progress: 0, from: 0, to: 0, start: 0, yaw: ISO_YAW, drag: false, lastX: 0 });
  const slowRef = useRef(slow);
  slowRef.current = slow;

  useEffect(() => {
    const st = s.current;
    st.from = st.progress;
    st.to = showCode ? 1 : 0;
    st.start = performance.now();
  }, [showCode]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const st = s.current;
    let raf = 0;
    const max = scene.size * scene.size * 30;
    const pos: number[] = new Array(max * 2);
    const rgb: number[] = new Array(max * 3);
    const shadow = [0, 0, 0, 0];
    const frame = (now: number) => {
      const dur = (reduced ? 220 : 2400) * (slowRef.current ? 4 : 1);
      const t = Math.min(1, (now - st.start) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      st.progress = st.from + (st.to - st.from) * e;
      const count = layoutScene(st.progress, st.yaw, scene, cfg, SPREAD, pos, rgb, shadow);
      ctx.fillStyle = `rgb(${byte(CREAM[0])},${byte(CREAM[1])},${byte(CREAM[2])})`;
      ctx.fillRect(0, 0, PX, PX);
      if (shadow[3] > 0.01) {
        ctx.save();
        ctx.filter = `blur(${Math.round(shadow[2] * 0.2)}px)`;
        ctx.fillStyle = `rgba(64,31,26,${shadow[3]})`;
        ctx.beginPath();
        ctx.ellipse(shadow[0], shadow[1], shadow[2], shadow[2] * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const flat = st.progress >= 1;
      ctx.lineWidth = flat ? 0 : 0.6;
      ctx.lineJoin = "round";
      for (let v = 0; v < count; v += 3) {
        const color = `rgb(${byte(rgb[v * 3])},${byte(rgb[v * 3 + 1])},${byte(rgb[v * 3 + 2])})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pos[v * 2], pos[v * 2 + 1]);
        ctx.lineTo(pos[v * 2 + 2], pos[v * 2 + 3]);
        ctx.lineTo(pos[v * 2 + 4], pos[v * 2 + 5]);
        ctx.closePath();
        ctx.fill();
        if (!flat) {
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene, cfg, reduced]);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span>BLOSSOM QR</span>
        <button className={styles.motion} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>
          Slow motion: {slow ? "on" : "off"}
        </button>
      </div>
      <canvas
        ref={canvas}
        width={PX}
        height={PX}
        className={styles.stage}
        role="img"
        aria-label={showCode ? `QR code for ${URL_TEXT}` : "Isometric blossom tree that becomes a QR code. Drag to turn it."}
        onPointerDown={(e) => {
          if (s.current.progress > 0.2) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          Object.assign(s.current, { drag: true, lastX: e.clientX });
        }}
        onPointerMove={(e) => {
          const st = s.current;
          if (!st.drag) return;
          const k = PX / e.currentTarget.getBoundingClientRect().width;
          st.yaw += (e.clientX - st.lastX) * 0.012 * k;
          st.lastX = e.clientX;
        }}
        onPointerUp={() => {
          s.current.drag = false;
        }}
        onPointerCancel={() => {
          s.current.drag = false;
        }}
      />
      <button className={styles.action} onClick={() => setShowCode((v) => !v)}>
        {showCode ? "Back to tree" : "Turn into QR"}
      </button>
    </div>
  );
}
