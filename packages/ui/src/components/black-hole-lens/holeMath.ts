export type HoleConfig = {
  width: number;
  height: number;
  rs: number;
  einstein: number;
  diskOut: number;
  inclCos: number;
  spin: number;
};

export const HOLE_DEFAULTS = {
  rs: 9,
  einstein: 62,
  diskOut: 108,
  inclCos: 0.22,
  spin: 0.6,
  seed: 20261018,
  starCount: 210,
  noiseRings: 72,
  noiseSectors: 192,
} as const;

export type HoleDefaults = typeof HOLE_DEFAULTS;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function shadowRadius(rs: number) {
  return ((3 * Math.sqrt(3)) / 2) * rs;
}

export function photonSphereRadius(rs: number) {
  return 1.5 * rs;
}

export function iscoRadius(rs: number) {
  return 3 * rs;
}

export function deflectionAngle(b: number, rs: number) {
  return (2 * rs) / b;
}

export function einsteinRadius(rs: number, dEff: number) {
  return Math.sqrt(2 * rs * dEff);
}

export function sourceOffset(theta: number, einstein: number) {
  return theta - (einstein * einstein) / theta;
}

export function imagePositions(beta: number, einstein: number): [number, number] {
  const s = Math.sqrt(beta * beta + 4 * einstein * einstein);
  return [(beta + s) / 2, (beta - s) / 2];
}

export function imageMagnification(theta: number, einstein: number) {
  const u = (einstein / theta) ** 4;
  return 1 / (1 - u);
}

export function totalMagnification(beta: number, einstein: number) {
  const [a, b] = imagePositions(beta, einstein);
  return Math.abs(imageMagnification(a, einstein)) + Math.abs(imageMagnification(b, einstein));
}

export function keplerBeta(r: number, rs: number) {
  return Math.sqrt(rs / (2 * r));
}

export function lorentzGamma(beta: number) {
  return 1 / Math.sqrt(1 - beta * beta);
}

export function dopplerFactor(beta: number, cosView: number) {
  return 1 / (lorentzGamma(beta) * (1 - beta * cosView));
}

export function gravRedshift(r: number, rs: number) {
  return Math.sqrt(Math.max(0, 1 - rs / r));
}

export const DISK_TEMP_PEAK = Math.pow((36 / 49) ** 3 * (1 - 6 / 7), 0.25);

export function diskTemperature(r: number, rIn: number) {
  const x = rIn / r;
  return Math.pow(Math.max(0, x * x * x * (1 - Math.sqrt(x))), 0.25) / DISK_TEMP_PEAK;
}

export function diskAngularVelocity(r: number, rIn: number, spin: number) {
  return spin * Math.pow(rIn / r, 1.5);
}

export function holeTarget(x: number, y: number, cfg: HoleConfig, opts: HoleDefaults) {
  const pad = shadowRadius(opts.rs) + 8;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: cfg.width / 2, y: cfg.height / 2 };
  return { x: clamp(x, pad, cfg.width - pad), y: clamp(y, pad, cfg.height - pad) };
}

export function springStep(pos: number, vel: number, target: number, dt: number, stiffness = 170, damping = 16) {
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / steps;
  let p = pos;
  let v = vel;
  for (let i = 0; i < steps; i++) {
    v += (stiffness * (target - p) - damping * v) * h;
    p += v * h;
  }
  return { pos: p, vel: v };
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Star = { x: number; y: number; r: number; b: number; tint: number };

export function makeStars(seed: number, w: number, h: number, count: number): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * w,
      y: rand() * h,
      r: 0.4 + Math.pow(rand(), 2.2) * 1.7,
      b: 0.22 + Math.pow(rand(), 3) * 0.78,
      tint: rand(),
    });
  }
  return stars;
}

export function makeDiskNoise(rings: number, sectors: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const raw = new Float32Array(rings * sectors);
  for (let i = 0; i < raw.length; i++) raw[i] = rand();
  const out = new Float32Array(rings * sectors);
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      let sum = 0;
      for (let dr = -2; dr <= 2; dr++) {
        const rr = clamp(r + dr, 0, rings - 1);
        for (let ds = -3; ds <= 3; ds++) {
          sum += raw[rr * sectors + ((s + ds + sectors) % sectors)];
        }
      }
      out[r * sectors + s] = sum / 35;
    }
  }
  return out;
}

export function diskEmission(
  rr: number,
  ang: number,
  phase: number,
  atten: number,
  cfg: HoleConfig,
  opts: HoleDefaults,
  noise: Float32Array,
): [number, number, number] {
  const diskIn = iscoRadius(opts.rs);
  const beta = Math.sqrt(diskIn / (6 * rr));
  const gam = 1 / Math.sqrt(1 - beta * beta);
  const sinI = Math.sqrt(1 - cfg.inclCos * cfg.inclCos);
  const cosView = -Math.cos(ang) * sinI;
  const dop = 1 / (gam * (1 - beta * cosView));
  const gred = Math.sqrt(Math.max(0, 1 - diskIn / (3 * rr)));
  const beam = clamp(Math.pow(dop * gred, 3), 0.04, 6);
  const temp = diskTemperature(rr, diskIn);
  const sectors = opts.noiseSectors;
  const rings = opts.noiseRings;
  const u = ((ang + phase) / (Math.PI * 2)) % 1;
  const uu = u < 0 ? u + 1 : u;
  const v = clamp((rr - diskIn) / (cfg.diskOut - diskIn), 0, 1);
  const s0 = Math.floor(uu * sectors) % sectors;
  const s1 = (s0 + 1) % sectors;
  const sf = uu * sectors - Math.floor(uu * sectors);
  const r0 = clamp(Math.floor(v * rings), 0, rings - 2);
  const rf = v * rings - r0;
  const at = (ri: number, si: number) => noise[ri * sectors + si];
  const row0 = at(r0, s0) * (1 - sf) + at(r0, s1) * sf;
  const row1 = at(r0 + 1, s0) * (1 - sf) + at(r0 + 1, s1) * sf;
  const n = row0 * (1 - rf) + row1 * rf;
  const u2 = (uu * 2 + 0.35) % 1;
  const t0 = Math.floor(u2 * sectors) % sectors;
  const n2 = at(r0, t0) * (1 - rf) + at(r0 + 1, t0) * rf;
  const tex = 0.5 + 0.85 * (n * 0.7 + n2 * 0.3);
  const hot: [number, number, number] = [0.82, 0.88, 1.0];
  const mid: [number, number, number] = [1.0, 0.85, 0.62];
  const cold: [number, number, number] = [1.0, 0.42, 0.22];
  const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const tint = temp > 0.55 ? mix3(mid, hot, (temp - 0.55) / 0.45) : mix3(cold, mid, temp / 0.55);
  const bright = beam * tex * (0.2 + 0.9 * temp) * atten;
  return [tint[0] * bright, tint[1] * bright, tint[2] * bright];
}

export function diskEdgeAlpha(rr: number, cfg: HoleConfig, opts: HoleDefaults) {
  const diskIn = iscoRadius(opts.rs);
  const a = clamp((rr - diskIn) / 3, 0, 1);
  const b = clamp((cfg.diskOut - rr) / 12, 0, 1);
  return a * b;
}

export function photonRingGlow(r: number, rs: number) {
  return Math.exp(-Math.abs(r - shadowRadius(rs)) / 2.1) * 0.65;
}

export const PLANET_DEFAULTS = {
  x: 60,
  y: 300,
  radius: 16,
  massRatio: 0.08,
  rocheFluid: 2.44,
  deformGain: 0.55,
  maxStretch: 2.4,
  maxSqueeze: 0.45,
  debrisCount: 64,
  debrisSpan: 3.0,
  debrisLife: 12,
  timeWarp: 48,
  feedBoost: 1.4,
  feedDecay: 2.6,
  diskDragRate: 0.05,
  diskInspiralRate: 0.08,
} as const;

export type PlanetDefaults = typeof PLANET_DEFAULTS;

export function holeMassFromRs(rs: number) {
  return rs / 2;
}

export function rocheLimit(radius: number, massRatio: number) {
  return radius * Math.pow(2 / massRatio, 1 / 3);
}

export function fluidRocheLimit(radius: number, massRatio: number) {
  return PLANET_DEFAULTS.rocheFluid * radius * Math.pow(1 / massRatio, 1 / 3);
}

export function tidalAcceleration(mHole: number, radius: number, d: number) {
  const dd = Math.max(d, 0.0001);
  return (2 * mHole * radius) / (dd * dd * dd);
}

export function tidalTensor(mHole: number, radius: number, d: number) {
  const radial = tidalAcceleration(mHole, radius, d);
  return { radial, transverse: -radial / 2 };
}

export function planetSurfaceGravity(mHole: number, massRatio: number, radius: number) {
  return (mHole * massRatio) / (radius * radius);
}

export function tidalRatio(mHole: number, massRatio: number, radius: number, d: number) {
  return tidalAcceleration(mHole, radius, d) / planetSurfaceGravity(mHole, massRatio, radius);
}

export function pwAcceleration(mHole: number, r: number, rs: number) {
  return mHole / Math.pow(Math.max(r - rs, 0.6), 2);
}

export function pwPotential(mHole: number, r: number, rs: number) {
  return -mHole / Math.max(r - rs, 0.6);
}

export function pwCircularL2(mHole: number, r: number, rs: number) {
  const rr = Math.max(r - rs, 0.6);
  return (mHole * r * r * r) / (rr * rr);
}

export function pwCircularSpeed(mHole: number, r: number, rs: number) {
  const rr = Math.max(r - rs, 0.6);
  return Math.sqrt((mHole * r) / (rr * rr));
}

export function debrisKick(mHole: number, radius: number, d: number, rs: number) {
  const dd = Math.max(d, 0.0001);
  return radius * (pwCircularSpeed(mHole, dd, rs) / dd);
}

export function debrisHeat(x: number, y: number, hx: number, hy: number, hole: HoleDefaults) {
  const r = Math.hypot(x - hx, y - hy);
  const cold = hole.diskOut * 0.95;
  const hot = shadowRadius(hole.rs) * 1.1;
  return clamp((cold - r) / Math.max(cold - hot, 1), 0, 1);
}

export type DebrisParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  size: number;
  tone: number;
};

export type PlanetSim = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: "intact" | "disrupted" | "gone";
  eta: number;
  stretch: number;
  squeeze: number;
  shedTime: number;
  shedAcc: number;
  bodyScale: number;
  feed: number;
  debris: DebrisParticle[];
  rand: () => number;
};

export function makePlanet(opts: PlanetDefaults, seed: number): PlanetSim {
  return {
    x: opts.x,
    y: opts.y,
    vx: 0,
    vy: 0,
    state: "intact",
    eta: 0,
    stretch: 0,
    squeeze: 0,
    shedTime: 0,
    shedAcc: 0,
    bodyScale: 1,
    feed: 0,
    debris: [],
    rand: mulberry32(seed),
  };
}

type Body = { x: number; y: number; vx: number; vy: number };

function integratePW(b: Body, hx: number, hy: number, mHole: number, rs: number, tdt: number) {
  const r0 = Math.hypot(b.x - hx, b.y - hy);
  const tDyn = Math.sqrt(Math.pow(Math.max(r0, rs * 2.2), 3) / mHole);
  const n = Math.max(1, Math.min(16, Math.ceil((tdt / tDyn) * 8)));
  const h = tdt / n;
  for (let i = 0; i < n; i++) {
    const dx = b.x - hx;
    const dy = b.y - hy;
    const r = Math.max(Math.hypot(dx, dy), 0.6);
    const a = -mHole / Math.pow(Math.max(r - rs, 0.6), 2);
    b.vx += (dx / r) * a * h;
    b.vy += (dy / r) * a * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
  }
}

function spawnDebris(sim: PlanetSim, hx: number, hy: number, mHole: number, rs: number, opts: PlanetDefaults) {
  const dx = hx - sim.x;
  const dy = hy - sim.y;
  const d = Math.max(Math.hypot(dx, dy), opts.radius);
  const ux = dx / d;
  const uy = dy / d;
  const tx = -uy;
  const ty = ux;
  const side = sim.rand() < 0.5 ? -1 : 1;
  const reach = opts.radius * (1 + sim.stretch) * Math.max(sim.bodyScale, 0.25);
  const along = side * reach * (0.55 + 0.45 * sim.rand());
  const omega = pwCircularSpeed(mHole, d, rs) / d;
  const kick = omega * along + debrisKick(mHole, opts.radius, d, rs) * 0.4 * sim.rand() * side;
  const jitter = debrisKick(mHole, opts.radius, d, rs) * 0.25;
  const width = opts.radius * 0.45 * Math.max(sim.bodyScale, 0.3);
  sim.debris.push({
    x: sim.x + ux * along + tx * (sim.rand() - 0.5) * width,
    y: sim.y + uy * along + ty * (sim.rand() - 0.5) * width,
    vx: sim.vx + ux * kick + tx * jitter * (sim.rand() - 0.5),
    vy: sim.vy + uy * kick + ty * jitter * (sim.rand() - 0.5),
    age: 0,
    size: 0.7 + sim.rand() * 1.0,
    tone: sim.rand(),
  });
}

export function isCaptured(x: number, y: number, hx: number, hy: number, rs: number) {
  return Math.hypot(x - hx, y - hy) < shadowRadius(rs) * 0.92;
}

export function planetStep(
  sim: PlanetSim,
  hx: number,
  hy: number,
  dt: number,
  hole: HoleDefaults,
  opts: PlanetDefaults,
  bounds: { width: number; height: number },
) {
  const mHole = holeMassFromRs(hole.rs);
  const warp = opts.timeWarp;
  const tdt = dt * warp;
  const d = Math.max(Math.hypot(hx - sim.x, hy - sim.y), opts.radius * 0.5);
  const roche = fluidRocheLimit(opts.radius, opts.massRatio);
  sim.eta = tidalRatio(mHole, opts.massRatio, opts.radius, d);
  const etaFluid = Math.pow(roche / d, 3);
  const stretchTarget = opts.deformGain * clamp(sim.eta, 0, opts.maxStretch / opts.deformGain);
  sim.stretch += (stretchTarget - sim.stretch) * Math.min(1, dt * 7);
  const squeezeTarget = clamp(sim.stretch / 2, 0, opts.maxSqueeze);
  sim.squeeze += (squeezeTarget - sim.squeeze) * Math.min(1, dt * 7);
  if (d < 1.5 * roche) {
    integratePW(sim, hx, hy, mHole, hole.rs, tdt);
  } else {
    const damp = Math.exp(-dt * 2);
    sim.vx *= damp;
    sim.vy *= damp;
  }
  sim.x = clamp(sim.x, 4, bounds.width - 4);
  sim.y = clamp(sim.y, 4, bounds.height - 4);
  if (sim.state === "intact" && d <= roche) sim.state = "disrupted";
  if (sim.state === "disrupted") {
    const shedSpeed = etaFluid > 1 ? clamp(etaFluid - 1, 0.3, 1.2) : 0;
    if (shedSpeed > 0 && sim.bodyScale > 0) {
      sim.shedTime += dt * shedSpeed;
      sim.bodyScale = clamp(sim.bodyScale - (dt * shedSpeed) / opts.debrisSpan, 0, 1);
      sim.shedAcc += (dt * shedSpeed * opts.debrisCount) / opts.debrisSpan;
      while (sim.shedAcc >= 1 && sim.bodyScale > 0) {
        sim.shedAcc -= 1;
        spawnDebris(sim, hx, hy, mHole, hole.rs, opts);
      }
    }
    if (sim.bodyScale <= 0 && sim.debris.length === 0) sim.state = "gone";
  }
  const diskIn = iscoRadius(hole.rs);
  const keep: DebrisParticle[] = [];
  for (const p of sim.debris) {
    p.age += dt;
    integratePW(p, hx, hy, mHole, hole.rs, tdt);
    const dx = p.x - hx;
    const dy = p.y - hy;
    const r = Math.max(Math.hypot(dx, dy), 1);
    if (r > diskIn * 0.9 && r < hole.diskOut * 0.85) {
      const vc = pwCircularSpeed(mHole, r, hole.rs);
      const rvx = dx / r;
      const rvy = dy / r;
      const vrad = p.vx * rvx + p.vy * rvy;
      const vt = p.vx * -rvy + p.vy * rvx;
      const sense = vt >= 0 ? 1 : -1;
      const k = Math.min(1, opts.diskDragRate * tdt);
      p.vx += rvx * (-opts.diskInspiralRate * vc - vrad) * k + -rvy * (vc * sense - vt) * k;
      p.vy += rvy * (-opts.diskInspiralRate * vc - vrad) * k + rvx * (vc * sense - vt) * k;
    }
    if (isCaptured(p.x, p.y, hx, hy, hole.rs)) {
      sim.feed = clamp(sim.feed + 4.5 / opts.debrisCount, 0, 1);
      continue;
    }
    if (p.age < opts.debrisLife) keep.push(p);
  }
  sim.debris = keep;
  sim.feed *= Math.exp(-dt / opts.feedDecay);
}
