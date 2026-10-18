export const REVEAL_DEFAULTS = {
  slots: 40,
  minRadius: 26,
  maxRadius: 64,
  speedScale: 700,
  speedSmoothing: 0.4,
  spacing: 0.28,
  maxPerMove: 10,
  tau: 0.7,
  cutoff: 0.004,
};

export type RevealOptions = typeof REVEAL_DEFAULTS;

export type RevealBrush = {
  data: number[];
  head: number;
  x: number;
  y: number;
  t: number;
  speed: number;
  radius: number;
  down: number;
  seq: number;
};

export type RevealPointer = { x: number; y: number; down: number; seq: number };

export function createBrush(opts: RevealOptions): RevealBrush {
  "worklet";
  return {
    data: new Array(opts.slots * 4).fill(0),
    head: 0,
    x: 0,
    y: 0,
    t: 0,
    speed: 0,
    radius: opts.minRadius,
    down: 0,
    seq: 0,
  };
}

export function brushRadius(speed: number, opts: RevealOptions): number {
  "worklet";
  return opts.minRadius + (opts.maxRadius - opts.minRadius) * (1 - Math.exp(-speed / opts.speedScale));
}

function writeStamp(b: RevealBrush, slot: number, x: number, y: number, r: number, s: number) {
  "worklet";
  const i = slot * 4;
  b.data[i] = x;
  b.data[i + 1] = y;
  b.data[i + 2] = r;
  b.data[i + 3] = s;
}

function pushStamp(b: RevealBrush, x: number, y: number, r: number, opts: RevealOptions) {
  "worklet";
  writeStamp(b, b.head, x, y, r, 1);
  b.head = (b.head + 1) % (opts.slots - 1);
}

export function brushDown(b: RevealBrush, x: number, y: number, t: number, opts: RevealOptions) {
  "worklet";
  b.x = x;
  b.y = y;
  b.t = t;
  b.speed = 0;
  b.radius = brushRadius(0, opts);
  b.down = 1;
  writeStamp(b, opts.slots - 1, x, y, b.radius, 1);
}

export function brushMove(b: RevealBrush, x: number, y: number, t: number, opts: RevealOptions) {
  "worklet";
  const dx = x - b.x;
  const dy = y - b.y;
  const dist = Math.hypot(dx, dy);
  const dt = Math.max(1, t - b.t) / 1000;
  b.speed += (dist / dt - b.speed) * opts.speedSmoothing;
  const r1 = brushRadius(b.speed, opts);
  const r0 = b.radius;
  const n = Math.min(opts.maxPerMove, Math.max(1, Math.ceil(dist / (Math.max(r0, r1) * opts.spacing))));
  for (let k = 1; k <= n; k++) {
    const f = k / n;
    pushStamp(b, b.x + dx * f, b.y + dy * f, r0 + (r1 - r0) * f, opts);
  }
  b.x = x;
  b.y = y;
  b.t = t;
  b.radius = r1;
  b.down = 1;
  writeStamp(b, opts.slots - 1, x, y, r1, 1);
}

export function brushRelease(b: RevealBrush) {
  "worklet";
  b.down = 0;
  b.speed = 0;
}

export function brushStep(b: RevealBrush, dt: number, opts: RevealOptions): boolean {
  "worklet";
  const f = Math.exp(-Math.max(0, dt) / opts.tau);
  let active = false;
  const last = opts.slots - 1;
  for (let k = 0; k < opts.slots; k++) {
    const i = k * 4 + 3;
    if (k === last && b.down) {
      b.data[i] = 1;
      active = true;
      continue;
    }
    let s = b.data[i] * f;
    if (s < opts.cutoff) s = 0;
    b.data[i] = s;
    if (s > 0) active = true;
  }
  return active;
}

export function brushActive(b: RevealBrush): boolean {
  "worklet";
  for (let k = 3; k < b.data.length; k += 4) if (b.data[k] > 0) return true;
  return false;
}

export function brushPresetPatch(b: RevealBrush, x: number, y: number, r: number, opts: RevealOptions) {
  "worklet";
  writeStamp(b, 0, x, y, r, 1);
  b.head = 1 % (opts.slots - 1);
}
