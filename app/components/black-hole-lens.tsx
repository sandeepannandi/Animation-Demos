"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  HOLE_DEFAULTS,
  PLANET_DEFAULTS,
  clamp,
  debrisHeat,
  diskEmission,
  holeTarget,
  iscoRadius,
  makeDiskNoise,
  makePlanet,
  makeStars,
  planetStep,
  shadowRadius,
  springStep,
  type HoleConfig,
  type PlanetSim,
} from "../../packages/ui/src/components/black-hole-lens/holeMath";
import {
  GALAXY,
  HALO_BOTTOM,
  HALO_TOP,
  HOLE_H,
  HOLE_W,
  NEBULAE,
  PLANET_PALETTE,
  RING_STRENGTH,
  SPACE_BACKGROUND,
  starColor,
} from "../../packages/ui/src/components/black-hole-lens/holeDesign";
import styles from "./black-hole-lens.module.css";

const W = HOLE_W, H = HOLE_H, S = 1.25;
const PW = Math.round(W * S), PH = Math.round(H * S);
const CFG: HoleConfig = { width: W, height: H, rs: HOLE_DEFAULTS.rs, einstein: HOLE_DEFAULTS.einstein, diskOut: HOLE_DEFAULTS.diskOut, inclCos: HOLE_DEFAULTS.inclCos, spin: HOLE_DEFAULTS.spin };
const SHADOW = shadowRadius(HOLE_DEFAULTS.rs);
const DISK_IN = iscoRadius(HOLE_DEFAULTS.rs);
const TE2 = HOLE_DEFAULTS.einstein * HOLE_DEFAULTS.einstein;
const PHASES = 256;
const STEP = 24;

function paintSpace() {
  const c = document.createElement("canvas");
  c.width = PW;
  c.height = PH;
  const g = c.getContext("2d")!;
  g.fillStyle = SPACE_BACKGROUND;
  g.fillRect(0, 0, PW, PH);
  for (const n of NEBULAE) {
    const grad = g.createRadialGradient(n.x * PW, n.y * PH, 0, n.x * PW, n.y * PH, n.r * PW);
    grad.addColorStop(0, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},${n.alpha})`);
    grad.addColorStop(1, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(n.x * PW, n.y * PH, n.r * PW, 0, Math.PI * 2);
    g.fill();
  }
  g.save();
  g.translate(GALAXY.x * PW, GALAXY.y * PH);
  g.rotate(GALAXY.angle);
  g.scale(1, GALAXY.ry / GALAXY.rx);
  const gg = g.createRadialGradient(0, 0, 0, 0, 0, GALAXY.rx * S);
  gg.addColorStop(0, "rgba(235,238,255,0.85)");
  gg.addColorStop(0.35, "rgba(150,160,220,0.25)");
  gg.addColorStop(1, "rgba(150,160,220,0)");
  g.fillStyle = gg;
  g.beginPath();
  g.arc(0, 0, GALAXY.rx * S, 0, Math.PI * 2);
  g.fill();
  g.restore();
  for (const star of makeStars(HOLE_DEFAULTS.seed, W, H, HOLE_DEFAULTS.starCount)) {
    const [r, gg2, b] = starColor(star.tint);
    g.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(gg2 * 255)},${Math.round(b * 255)},${star.b})`;
    g.beginPath();
    g.arc(star.x * S, star.y * S, Math.max(0.5, star.r * S), 0, Math.PI * 2);
    g.fill();
  }
  return { canvas: c, image: g.getImageData(0, 0, PW, PH) };
}

function paintPlanet(g: CanvasRenderingContext2D, sim: PlanetSim, hx: number, hy: number) {
  const px = sim.x * S;
  const py = sim.y * S;
  const ang = Math.atan2(hy - sim.y, hx - sim.x);
  if (sim.bodyScale > 0.001) {
    const r = PLANET_DEFAULTS.radius * S * sim.bodyScale;
    const sx = 1 + sim.stretch;
    const sy = 1 - sim.squeeze;
    g.save();
    g.translate(px, py);
    g.rotate(ang);
    g.scale(sx, sy);
    const [lr, lg2, lb] = PLANET_PALETTE.light;
    const [mr, mg, mb] = PLANET_PALETTE.mid;
    const [dr, dg, db] = PLANET_PALETTE.dark;
    const grad = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.6);
    grad.addColorStop(0, `rgb(${lr},${lg2},${lb})`);
    grad.addColorStop(0.55, `rgb(${mr},${mg},${mb})`);
    grad.addColorStop(1, `rgb(${dr},${dg},${db})`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.clip();
    const [br, bg2, bb] = PLANET_PALETTE.band;
    g.fillStyle = `rgba(${br},${bg2},${bb},0.55)`;
    g.beginPath();
    g.ellipse(0, -r * 0.28, r * 1.2, r * 0.16, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, r * 0.24, r * 1.2, r * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    if (r > 1.4) {
      const [gr, gg3, gb] = PLANET_PALETTE.glow;
      g.strokeStyle = `rgba(${gr},${gg3},${gb},0.4)`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(0, 0, r - 0.6, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }
  const [lr, lg2, lb] = PLANET_PALETTE.light;
  const [mr, mg, mb] = PLANET_PALETTE.mid;
  if (sim.debris.length > 1) {
    const ordered = [...sim.debris].sort((a, b) => b.age - a.age);
    g.strokeStyle = `rgba(${mr},${mg},${mb},0.55)`;
    g.lineWidth = 1.7;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(ordered[0].x * S, ordered[0].y * S);
    for (let i = 1; i < ordered.length; i++) g.lineTo(ordered[i].x * S, ordered[i].y * S);
    g.stroke();
  }
  for (const d of sim.debris) {
    const fade = clamp(1 - d.age / PLANET_DEFAULTS.debrisLife, 0, 1);
    if (fade <= 0) continue;
    const heat = debrisHeat(d.x, d.y, hx, hy, HOLE_DEFAULTS);
    const rr = Math.round(mr + (lr - mr) * d.tone + (255 - (mr + (lr - mr) * d.tone)) * heat);
    const gg2 = Math.round(mg + (lg2 - mg) * d.tone + (236 - (mg + (lg2 - mg) * d.tone)) * heat);
    const bb = Math.round(mb + (lb - mb) * d.tone + (190 - (mb + (lb - mb) * d.tone)) * heat);
    g.fillStyle = `rgba(${rr},${gg2},${bb},${(fade * (0.55 + 0.45 * heat)).toFixed(3)})`;
    const sp = Math.hypot(d.vx, d.vy);
    if (sp > 0.02) {
      g.save();
      g.translate(d.x * S, d.y * S);
      g.rotate(Math.atan2(d.vy, d.vx));
      g.beginPath();
      g.ellipse(0, 0, Math.max(0.6, d.size * S * 1.6), Math.max(0.4, d.size * S * 0.6), 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    } else {
      g.beginPath();
      g.arc(d.x * S, d.y * S, Math.max(0.5, d.size * S), 0, Math.PI * 2);
      g.fill();
    }
  }
}

export function BlackHoleLensPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slow, setSlow] = useState(false);
  const [planetOn, setPlanetOn] = useState(false);
  const systemReduce = useReducedMotion();
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  const reduced = reducedOverride ?? !!systemReduce;
  const latest = useRef({ slow, reduced, planetOn });
  latest.current = { slow, reduced, planetOn };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = PW;
    canvas.height = PH;
    const space = paintSpace();
    const scratch = document.createElement("canvas");
    scratch.width = PW;
    scratch.height = PH;
    const sg = scratch.getContext("2d")!;
    const noise = makeDiskNoise(HOLE_DEFAULTS.noiseRings, HOLE_DEFAULTS.noiseSectors, HOLE_DEFAULTS.seed);
    const out = ctx.createImageData(PW, PH);
    const phaseTable = new Float32Array(PHASES + 1);
    const sim = { cx: W / 2, cy: H / 2, vx: 0, vy: 0, tx: W / 2, ty: H / 2, time: 0 };
    let planet: PlanetSim | null = null;
    let planetWasOn = false;

    const render = () => {
      const { cx, cy, time } = sim;
      for (let k = 0; k <= PHASES; k++) {
        const rr = DISK_IN + (k / PHASES) * (CFG.diskOut - DISK_IN);
        phaseTable[k] = CFG.spin * time * Math.pow(DISK_IN / rr, 1.5);
      }
      let src = space.image.data;
      let boost = 1;
      if (planet) {
        sg.drawImage(space.canvas, 0, 0);
        paintPlanet(sg, planet, cx, cy);
        src = sg.getImageData(0, 0, PW, PH).data;
        boost = 1 + PLANET_DEFAULTS.feedBoost * planet.feed;
      }
      const dst = out.data;
      const rc = RING_STRENGTH;
      for (let py = 0; py < PH; py++) {
        const y = py / S;
        const dy = y - cy;
        const qy = dy / CFG.inclCos;
        for (let px = 0; px < PW; px++) {
          const x = px / S;
          const dx = x - cx;
          const r = Math.sqrt(dx * dx + dy * dy);
          let R = 0, G = 0, B = 0;
          if (r >= SHADOW) {
            const sr = r - TE2 / Math.max(r, 0.0001);
            const inv = sr / r;
            const sx = Math.max(0, Math.min(PW - 1, Math.round((cx + dx * inv) * S)));
            const sy = Math.max(0, Math.min(PH - 1, Math.round((cy + dy * inv) * S)));
            const si = (sy * PW + sx) * 4;
            R = src[si];
            G = src[si + 1];
            B = src[si + 2];
          }
          const rr = Math.sqrt(dx * dx + qy * qy);
          const ang = Math.atan2(qy, dx);
          if (r > SHADOW && dy < 0) {
            const t = (r - SHADOW) / HALO_TOP.height;
            if (t < 1) {
              const rr2 = DISK_IN + t * (CFG.diskOut - DISK_IN);
              const pk = ((rr2 - DISK_IN) / (CFG.diskOut - DISK_IN)) * PHASES;
              const pk0 = Math.floor(pk);
              const ph = phaseTable[pk0] + (phaseTable[Math.min(PHASES, pk0 + 1)] - phaseTable[pk0]) * (pk - pk0);
              const e = diskEmission(rr2, -ang, ph, HALO_TOP.atten * boost, CFG, HOLE_DEFAULTS, noise);
              const w = 1 - t * t;
              R += e[0] * 255 * w;
              G += e[1] * 255 * w;
              B += e[2] * 255 * w;
            }
          }
          if (r > SHADOW && dy > 0) {
            const t = (r - SHADOW) / HALO_BOTTOM.height;
            if (t < 1) {
              const rr2 = DISK_IN + t * (CFG.diskOut - DISK_IN);
              const pk = ((rr2 - DISK_IN) / (CFG.diskOut - DISK_IN)) * PHASES;
              const pk0 = Math.floor(pk);
              const ph = phaseTable[pk0] + (phaseTable[Math.min(PHASES, pk0 + 1)] - phaseTable[pk0]) * (pk - pk0);
              const e = diskEmission(rr2, -ang, ph, HALO_BOTTOM.atten * boost, CFG, HOLE_DEFAULTS, noise);
              const w = 1 - t * t;
              R += e[0] * 255 * w;
              G += e[1] * 255 * w;
              B += e[2] * 255 * w;
            }
          }
          const ring = Math.exp(-Math.abs(r - SHADOW) / 2.1) * rc;
          R += 0.75 * 255 * ring;
          G += 0.85 * 255 * ring;
          B += 255 * ring;
          if (rr >= DISK_IN && rr <= CFG.diskOut && (dy > 0 || r >= SHADOW)) {
            const ea = Math.max(0, Math.min(1, (rr - DISK_IN) / 3)) * Math.max(0, Math.min(1, (CFG.diskOut - rr) / 12)) * 0.96;
            if (ea > 0.004) {
              const pk = ((rr - DISK_IN) / (CFG.diskOut - DISK_IN)) * PHASES;
              const pk0 = Math.floor(pk);
              const ph = phaseTable[pk0] + (phaseTable[Math.min(PHASES, pk0 + 1)] - phaseTable[pk0]) * (pk - pk0);
              const e = diskEmission(rr, ang, ph, boost, CFG, HOLE_DEFAULTS, noise);
              R = R * (1 - ea) + e[0] * 255 * ea;
              G = G * (1 - ea) + e[1] * 255 * ea;
              B = B * (1 - ea) + e[2] * 255 * ea;
            }
          }
          const di = (py * PW + px) * 4;
          dst[di] = R > 255 ? 255 : R;
          dst[di + 1] = G > 255 ? 255 : G;
          dst[di + 2] = B > 255 ? 255 : B;
          dst[di + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    };

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.reduced) {
        sim.cx = sim.tx;
        sim.cy = sim.ty;
        sim.vx = 0;
        sim.vy = 0;
      } else {
        const a = springStep(sim.cx, sim.vx, sim.tx, dt);
        const b = springStep(sim.cy, sim.vy, sim.ty, dt);
        sim.cx = a.pos;
        sim.vx = a.vel;
        sim.cy = b.pos;
        sim.vy = b.vel;
        sim.time += dt * (latest.current.slow ? 0.25 : 1);
      }
      if (latest.current.planetOn) {
        if (!planet || !planetWasOn) planet = makePlanet(PLANET_DEFAULTS, HOLE_DEFAULTS.seed ^ 61);
        planetWasOn = true;
        planetStep(planet, sim.cx, sim.cy, dt, HOLE_DEFAULTS, PLANET_DEFAULTS, { width: W, height: H });
      } else {
        planetWasOn = false;
        planet = null;
      }
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const local = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((ev.clientX - rect.left) / rect.width) * W, y: ((ev.clientY - rect.top) / rect.height) * H };
    };
    const goTo = (x: number, y: number) => {
      const t = holeTarget(x, y, CFG, HOLE_DEFAULTS);
      sim.tx = t.x;
      sim.ty = t.y;
    };
    let dragging = false;
    const down = (ev: PointerEvent) => {
      dragging = true;
      canvas.setPointerCapture(ev.pointerId);
      const p = local(ev);
      goTo(p.x, p.y);
    };
    const move = (ev: PointerEvent) => {
      if (!dragging) return;
      const p = local(ev);
      goTo(p.x, p.y);
    };
    const up = () => {
      dragging = false;
    };
    const key = (ev: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
      const d = m[ev.key];
      if (!d) return;
      ev.preventDefault();
      goTo(sim.tx + d[0], sim.ty + d[1]);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: W, height: H }}
        tabIndex={0}
        role="application"
        aria-roledescription="draggable black hole"
        aria-label="Black hole lens web preview: drag the black hole across the starfield, or use the arrow keys"
      />
      <div className={styles.row}>
        <button type="button" className={slow ? styles.chipPrimary : styles.chip} onClick={() => setSlow((v) => !v)} aria-pressed={slow}>Slow motion: {slow ? "on" : "off"}</button>
        <button type="button" className={reduced ? styles.chipPrimary : styles.chip} onClick={() => setReducedOverride(!reduced)} aria-pressed={reduced}>Reduce motion: {reduced ? "on" : "off"}</button>
        <button type="button" className={planetOn ? styles.chipPrimary : styles.chip} onClick={() => setPlanetOn((v) => !v)} aria-pressed={planetOn}>Planet: {planetOn ? "on" : "off"}</button>
      </div>
      <p className={styles.hint}>Drag the black hole across the starfield, or focus it and use the arrow keys. Turn the planet on and drag the hole right up to it: tides stretch it at the Roche limit, then it shreds into a stream that spirals into the disk.</p>
    </div>
  );
}
