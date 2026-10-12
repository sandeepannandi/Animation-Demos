"use client";
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { originFrom, rippleUniforms, samplePoint, type RippleConfig } from '../../packages/ui/src/components/ripple-reveal/rippleMath';
import styles from './ripple-reveal.module.css';
const W = 300, H = 200, S = 1.5, DURATION = 1100;
const cfg: RippleConfig = { width: W, height: H, ringWidth: 64, wavelength: 38, amplitude: 14 };
type Art = { top: string; bottom: string; blobA: string; blobB: string };
const dusk: Art = { top: '#121733', bottom: '#2a1a4d', blobA: '#5a4dd9', blobB: '#e6668c' };
const dawn: Art = { top: '#fff0cc', bottom: '#fdcc9e', blobA: '#ffa65a', blobB: '#8cc7b3' };
// The same artwork as the native example: a vertical gradient with two soft blobs.
function paint(art: Art) {
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const g = c.getContext('2d')!; g.scale(S, S);
  const base = g.createLinearGradient(0, 0, 0, H); base.addColorStop(0, art.top); base.addColorStop(1, art.bottom); g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (const [x, y, r, color, a] of [[0.22, 0.28, 0.55, art.blobA, 0.85], [0.82, 0.78, 0.62, art.blobB, 0.8]] as const) {
    const rad = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W); rad.addColorStop(0, color); rad.addColorStop(1, color + '00');
    g.globalAlpha = a; g.fillStyle = rad; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  }
  return g.getImageData(0, 0, W * S, H * S);
}
export function RippleRevealPreview() {
  const systemReduce = useReducedMotion(), [forcedReduce, setForcedReduce] = useState(false), reduce = !!systemReduce || forcedReduce;
  const [showing, setShowing] = useState<'a' | 'b'>('a'), [overlay, setOverlay] = useState<'a' | 'b'>('a'), [announce, setAnnounce] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null), art = useRef<{ a: ImageData; b: ImageData } | null>(null), raf = useRef(0), busy = useRef(false), timers = useRef<number[]>([]);
  function draw(img: ImageData) { canvas.current?.getContext('2d')?.putImageData(img, 0, 0); }
  useEffect(() => {
    art.current = { a: paint(dusk), b: paint(dawn) };
    draw(art.current.a);
    return () => { cancelAnimationFrame(raf.current); timers.current.forEach(clearTimeout); };
  }, []);
  function reveal(x: number, y: number) {
    if (busy.current || !art.current) return;
    busy.current = true;
    const from = showing, next = from === 'a' ? 'b' : 'a', { a, b } = art.current;
    const oldImg = from === 'a' ? a : b, newImg = from === 'a' ? b : a;
    const origin = originFrom(x, y, W, H), ms = reduce ? 180 : DURATION;
    setShowing(next); setAnnounce(`Showing ${next === 'a' ? 'Dusk' : 'Dawn'}`);
    timers.current.push(window.setTimeout(() => setOverlay(next), ms * 0.4));
    const out = new ImageData(W * S, H * S), start = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / ms), u = rippleUniforms(p, origin, from === 'b', reduce, cfg);
      for (let py = 0; py < H * S; py++) for (let px = 0; px < W * S; px++) {
        const s = samplePoint(px / S, py / S, u);
        const sx = Math.max(0, Math.min(W * S - 1, Math.round(s.x * S))), sy = Math.max(0, Math.min(H * S - 1, Math.round(s.y * S)));
        const si = (sy * W * S + sx) * 4, di = (py * W * S + px) * 4, k = s.over;
        const lit = reduce || u.amp === 0 ? 0 : Math.min(1, s.crest) * Math.max(0, 1 - Math.abs(Math.hypot(px / S - u.origin[0], py / S - u.origin[1]) - u.radius) / cfg.ringWidth) * 0.16 * 255;
        for (let ch = 0; ch < 3; ch++) out.data[di + ch] = Math.min(255, oldImg.data[si + ch] * (1 - k) + newImg.data[si + ch] * k + lit);
        out.data[di + 3] = 255;
      }
      draw(p >= 1 ? newImg : out);
      if (p < 1) raf.current = requestAnimationFrame(frame); else busy.current = false;
    };
    raf.current = requestAnimationFrame(frame);
  }
  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    // Keyboard activation reports detail 0 and no real pointer position.
    if (e.detail === 0) reveal(NaN, NaN); else reveal((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
  }
  const dark = overlay === 'a';
  return <div className={styles.root}>
    <div className={styles.status} aria-live="polite">Theme: {showing === 'a' ? 'Dusk' : 'Dawn'}</div>
    <div className={styles.stage} data-ripple-stage>
      <canvas ref={canvas} className={styles.canvas} width={W * S} height={H * S} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true"><strong style={{ color: dark ? '#f1eefc' : '#3d2a14' }}>{dark ? 'Dusk' : 'Dawn'}</strong><span style={{ color: dark ? '#c9c2ee' : '#7a5a35' }}>Tap anywhere to switch</span></div>
      <button type="button" className={styles.hit} aria-label="Switch between Dusk and Dawn" onClick={onClick} />
    </div>
    <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{announce}</span>
    <div className={styles.note}><span>Tap anywhere on the card.</span><button aria-pressed={forcedReduce} onClick={() => setForcedReduce(!forcedReduce)}>Motion: {reduce ? 'reduced' : 'system'}</button></div>
  </div>;
}
// End of Ripple Reveal web preview.
