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
