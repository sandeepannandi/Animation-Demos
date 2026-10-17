"use client";
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_VINYL, armAngles, armTip, makeVinyl, stepVinyl,
  type VinylState,
} from '../../packages/ui/src/components/vinyl-player/vinylMath';
import styles from './vinyl-player.module.css';

const S = 400;
const CX = S / 2;
const CY = S / 2;
const R = S * 0.40;
const PX = S * 0.88;
const PY = S * 0.12;
const LABEL_R = R * 0.34;
const GROOVES = 22;
const GEO = armAngles(PX, PY, CX, CY, R);
const OPTS = { ...DEFAULT_VINYL, armParkDeg: GEO.park, armPlayDeg: GEO.play };

export function VinylPlayerPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const sim = useRef<VinylState | null>(null);
  if (!sim.current) sim.current = makeVinyl(GEO.park);
  const latest = useRef({ playing, slow, reduced });
  latest.current = { playing, slow, reduced };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = S * dpr;
    canvas.height = S * dpr;

    const wedge = (a0: number, a1: number) => {
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      for (let a = a0; a <= a1; a += 6) {
        const rad = (a * Math.PI) / 180;
        ctx.lineTo(CX + Math.cos(rad) * R, CY + Math.sin(rad) * R);
      }
      ctx.closePath();
    };

    let last = 0;
    let raf = 0;
    const draw = (now: number) => {
      const dt = (last ? Math.min(now - last, 48) : 16.7) * (latest.current.slow ? 0.25 : 1);
      last = now;
      const r = stepVinyl(sim.current!, latest.current.playing, dt, OPTS, latest.current.reduced);
      sim.current = r.state;
      const v = r.state;
      const spinUp = OPTS.rpm > 0 ? Math.min(1, v.speed / (OPTS.rpm / 60)) : 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);

      // soft deck shadow
      const shadow = ctx.createRadialGradient(CX, CY + R * 0.05, R * 0.6, CX, CY + R * 0.05, R * 1.04);
      shadow.addColorStop(0, 'rgba(24,32,20,0.30)');
      shadow.addColorStop(1, 'rgba(24,32,20,0)');
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(CX, CY + R * 0.05, R * 1.04, 0, Math.PI * 2);
      ctx.fill();

      // playing glow
      if (spinUp > 0.001) {
        ctx.strokeStyle = `rgba(123,163,106,${0.55 * spinUp})`;
        ctx.lineWidth = S * 0.02;
        ctx.beginPath();
        ctx.arc(CX, CY, R * 1.05, 0, Math.PI * 2);
        ctx.stroke();
      }

      // the record (rotates)
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate((v.angle * Math.PI) / 180);
      ctx.fillStyle = '#141315';
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      for (let i = 0; i < GROOVES; i++) {
        const t = i / (GROOVES - 1);
        ctx.strokeStyle = `rgba(255,255,255,${0.035 + 0.045 * ((i * 7) % 5) / 4})`;
        ctx.beginPath();
        ctx.arc(0, 0, R * (0.42 + 0.55 * t), 0, Math.PI * 2);
        ctx.stroke();
      }
      // deadwax band + rotating shine mark
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = R * 0.035;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.47, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = R * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.72, (18 * Math.PI) / 180, (64 * Math.PI) / 180);
      ctx.stroke();
      // label
      ctx.fillStyle = '#b8402e';
      ctx.beginPath();
      ctx.arc(0, 0, LABEL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, LABEL_R * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(LABEL_R * 0.42, -LABEL_R * 0.3, LABEL_R * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8d3c8';
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.008, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // fixed sheen wedges
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      wedge(-52, -22);
      ctx.fill();
      wedge(128, 158);
      ctx.fill();

      // rest post
      const rest = armTip(PX, PY, GEO.len, GEO.park);
      ctx.fillStyle = '#3d3a3e';
      ctx.beginPath();
      ctx.roundRect(rest.x - S * 0.012, rest.y - S * 0.03, S * 0.024, S * 0.05, S * 0.008);
      ctx.fill();

      // tonearm
      ctx.save();
      ctx.translate(PX, PY);
      ctx.rotate((v.arm * Math.PI) / 180);
      ctx.fillStyle = '#57535a';
      ctx.beginPath();
      ctx.roundRect(-GEO.len * 0.3, -S * 0.0045, GEO.len * 1.3, S * 0.009, S * 0.0045);
      ctx.fill();
      ctx.fillStyle = '#3d3a3e';
      ctx.beginPath();
      ctx.arc(-GEO.len * 0.3, 0, S * 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(GEO.len, 0);
      ctx.rotate(0.42);
      ctx.fillStyle = '#8a858d';
      ctx.beginPath();
      ctx.roundRect(-S * 0.007, -S * 0.013, S * 0.05, S * 0.026, S * 0.005);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      // pivot base
      ctx.fillStyle = '#2c2a2e';
      ctx.beginPath();
      ctx.arc(PX, PY, S * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57535a';
      ctx.beginPath();
      ctx.arc(PX, PY, S * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a858d';
      ctx.beginPath();
      ctx.arc(PX, PY, S * 0.011, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.stage}>
      <div className={styles.caption}>Late Night Drive · 33⅓ rpm · {playing ? 'now playing' : 'paused'}</div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: S, height: S }}
        role="button"
        tabIndex={0}
        aria-label={`Turntable. ${playing ? 'Playing' : 'Paused'}. Activate to ${playing ? 'pause' : 'play'}.`}
        onClick={() => setPlaying(!playing)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPlaying(!playing); } }}
      />
      <div className={styles.hint}>Click the record: the tonearm swings in, then the platter spins up.</div>
      <div className={styles.row}>
        <button type="button" className={styles.chipPrimary} onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" className={styles.chip} aria-pressed={slow} onClick={() => setSlow(!slow)}>Slow motion: {slow ? 'on' : 'off'}</button>
        <button type="button" className={styles.chip} aria-pressed={reduced} onClick={() => setReduced(!reduced)}>Motion: {reduced ? 'reduced' : 'full'}</button>
      </div>
    </div>
  );
}
