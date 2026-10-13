"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import qrcode from "qrcode-generator";
import {
  buildData,
  layoutTiles,
  makeConfig,
  paperAlpha,
  tileColor,
} from "../../packages/ui/src/components/orbit-qr/orbitMath";
import styles from "./orbit-qr.module.css";

const URL_TEXT = "https://nativelet.netlify.app/";
const PX = 640;
const SPIN = 0.00042;

function encode(text: string) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => q.isDark(r, c)),
  );
}

export function OrbitQRPreview() {
  const system = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const reduced = Boolean(system);
  const modules = useMemo(() => encode(URL_TEXT), []);
  const data = useMemo(() => buildData(modules), [modules]);
  const cfg = useMemo(
    () => makeConfig(PX, modules.length, data.count, reduced),
    [modules, data.count, reduced],
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = useRef({
    progress: 0,
    from: 0,
    to: 0,
    start: 0,
    yaw: 0.6,
    pitch: -0.28,
    spin: SPIN,
    drag: false,
    lastX: 0,
    lastY: 0,
    vx: 0,
  });
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
    let last = performance.now();
    const out: number[] = new Array(data.count * 5);
    const rgb = [0, 0, 0];
    const frame = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const dur = (reduced ? 220 : 1700) * (slowRef.current ? 4 : 1);
      const t = Math.min(1, (now - st.start) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      st.progress = st.from + (st.to - st.from) * e;
      if (!st.drag && !reduced) {
        st.yaw += st.spin * dt;
        st.spin +=
          (SPIN * (1 - st.progress) - st.spin) * (1 - Math.exp(-dt / 420));
      }
      const order: number[] = [];
      layoutTiles(st.progress, st.yaw, st.pitch, data, cfg, out, order);
      ctx.clearRect(0, 0, PX, PX);
      const paper = paperAlpha(st.progress);
      if (paper > 0) {
        ctx.fillStyle = `rgba(246,248,241,${paper})`;
        ctx.fillRect(0, 0, PX, PX);
      }
      for (const i of order) {
        const side = out[i * 5 + 2];
        const x = out[i * 5] - side / 2;
        const y = out[i * 5 + 1] - side / 2;
        tileColor(out[i * 5 + 3], out[i * 5 + 4], rgb);
        ctx.fillStyle = `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`;
        ctx.beginPath();
        ctx.rect(x, y, side, side);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [data, cfg, reduced]);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span>ORBIT QR</span>
        <button
          className={styles.motion}
          onClick={() => setSlow((v) => !v)}
          aria-pressed={slow}
        >
          Slow motion: {slow ? "on" : "off"}
        </button>
      </div>
      <canvas
        ref={canvas}
        width={PX}
        height={PX}
        className={styles.stage}
        role="img"
        aria-label={
          showCode
            ? `QR code for ${URL_TEXT}`
            : "Rotating sphere of tiles that becomes a QR code. Drag to rotate."
        }
        onPointerDown={(e) => {
          if (s.current.progress > 0.2) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          Object.assign(s.current, {
            drag: true,
            lastX: e.clientX,
            lastY: e.clientY,
            spin: 0,
            vx: 0,
          });
        }}
        onPointerMove={(e) => {
          const st = s.current;
          if (!st.drag) return;
          const k = PX / e.currentTarget.getBoundingClientRect().width;
          st.yaw += (e.clientX - st.lastX) * 0.011 * k;
          st.pitch = Math.max(
            -1.1,
            Math.min(1.1, st.pitch + (e.clientY - st.lastY) * 0.011 * k),
          );
          st.vx = ((e.clientX - st.lastX) * 0.011 * k) / 16;
          st.lastX = e.clientX;
          st.lastY = e.clientY;
        }}
        onPointerUp={() => {
          s.current.drag = false;
          s.current.spin = s.current.vx;
        }}
        onPointerCancel={() => {
          s.current.drag = false;
        }}
      />
      <button className={styles.action} onClick={() => setShowCode((v) => !v)}>
        {showCode ? "Back to sphere" : "Turn into QR"}
      </button>
    </div>
  );
}
