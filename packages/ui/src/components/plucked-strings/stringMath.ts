// Pure 1D wave physics for Plucked Strings. Every function is a worklet so
// Reanimated can step the simulation on the UI thread; plain JS (tests, web
// preview) ignores the tag. Deterministic: no randomness anywhere, so tests,
// native and web agree frame for frame.
//
// Model: the classic wave equation on a stretched string, d2u/dt2 =
// c^2 d2u/dx2, stepped with an explicit finite-difference scheme (FDTD) on a
// regular grid. Each string keeps a Courant number r = c*dt/dx below one,
// which is the exact stability limit of the scheme, so thicker strings carry
// slower waves and a lower pitch. Both ends are fixed (u = 0), which is what
// makes a pulse reflect and come back inverted, like a real guitar string.
// Damping removes a fraction of velocity per substep, so a pluck rings and
// settles instead of buzzing forever. The motion is slowed far below a real
// string's hundreds of hertz so you can watch the waves travel.

export const STR_W = 320;
export const STR_H = 380;
export const STRING_COUNT = 5;
export const STR_X0 = 26;
export const STR_X1 = 294;
export const STR_NODES = 137; // 136 segments, 2 px apart
export const STR_M = STR_NODES - 1;
export const STR_DX = (STR_X1 - STR_X0) / STR_M;
export const STR_LENGTH = STR_X1 - STR_X0;
// Per-string Courant numbers (bass to treble): all <= 1, the stability limit.
export const STR_COURANT = [0.96, 0.85, 0.75, 0.66, 0.58];
// Velocity fraction removed per substep; bright strings decay a little faster.
export const STR_DAMPING = [0.0009, 0.0012, 0.0016, 0.0021, 0.0027];
export const STR_SUB_DT = 1 / 240;
export const STR_MAX_PULL = 46;
export const STR_GRAB_RANGE = 30;
// Drive stiffness while a finger holds a node (0..1 per substep).
export const STR_GRAB_K = 0.5;

export function stringY(k: number) {
  'worklet';
  return 86 + k * 52;
}

/** Wave speed in px/s implied by a Courant number: c = r * dx / dt. */
export function stringWaveSpeed(r: number) {
  'worklet';
  return (r * STR_DX) / STR_SUB_DT;
}

/** Fundamental frequency f1 = c / 2L for a string fixed at both ends. */
export function stringFundamental(r: number) {
  'worklet';
  return stringWaveSpeed(r) / (2 * STR_LENGTH);
}

export type StringsState = {
  n: number;          // strings
  m: number;          // segments per string
  u: number[];        // displacement, [k * STR_NODES + i]
  up: number[];       // displacement one substep ago
  grabString: number; // -1 when free
  grabIndex: number;  // node index being driven
  grabTarget: number; // displacement the finger asks for
  acc: number;        // substep accumulator, s
  seq: number;        // pointer sequence handled
  settled: boolean;
};

export function createStrings(settled = false): StringsState {
  'worklet';
  const n = STRING_COUNT;
  return {
    n,
    m: STR_M,
    u: new Array(n * STR_NODES).fill(0),
    up: new Array(n * STR_NODES).fill(0),
    grabString: -1,
    grabIndex: 0,
    grabTarget: 0,
    acc: 0,
    seq: 0,
    settled,
  };
}

function idx(k: number, i: number) {
  'worklet';
  return k * STR_NODES + i;
}

/** Start a drag at canvas point (x, y): grab the nearest string in range. */
export function stringsDragTo(s: StringsState, x: number, y: number) {
  'worklet';
  let k = s.grabString;
  if (k < 0) {
    let best = -1;
    let bestD = STR_GRAB_RANGE;
    for (let j = 0; j < s.n; j++) {
      const d = Math.abs(y - stringY(j));
      if (d <= bestD) {
        bestD = d;
        best = j;
      }
    }
    k = best;
  }
  if (k < 0) return;
  s.grabString = k;
  s.grabIndex = Math.min(s.m - 1, Math.max(1, Math.round((x - STR_X0) / STR_DX)));
  s.grabTarget = Math.min(STR_MAX_PULL, Math.max(-STR_MAX_PULL, y - stringY(k)));
}

/** Let go: the string keeps the shape the finger left and rings on. */
export function stringsRelease(s: StringsState) {
  'worklet';
  s.grabString = -1;
  s.settled = false;
}

/** Pull the middle of string k to `amp` and let go (tests and demo pluck). */
export function stringsPluck(s: StringsState, k: number, amp: number) {
  'worklet';
  const mid = Math.round(s.m / 2);
  for (let i = 1; i < s.m; i++) {
    const tri = i <= mid ? i / mid : (s.m - i) / (s.m - mid);
    s.u[idx(k, i)] = amp * tri;
    s.up[idx(k, i)] = amp * tri;
  }
  s.settled = false;
}

function substep(s: StringsState) {
  'worklet';
  const { u, up, m } = s;
  for (let k = 0; k < s.n; k++) {
    const r = STR_COURANT[k];
    const r2 = r * r;
    const keep = 1 - STR_DAMPING[k];
    const base = k * STR_NODES;
    let prev = u[base]; // left neighbour from the previous tick, not yet updated
    for (let i = 1; i < m; i++) {
      const j = base + i;
      const cur = u[j];
      const next = cur + (cur - up[j]) * keep + r2 * (prev - 2 * cur + u[j + 1]);
      up[j] = cur;
      u[j] = next;
      prev = cur;
    }
    // Fixed ends: the displacement is pinned, which inverts a reflected pulse.
    up[base] = 0;
    u[base] = 0;
    up[base + m] = 0;
    u[base + m] = 0;
  }
  if (s.grabString >= 0) {
    const g = idx(s.grabString, s.grabIndex);
    const next = s.u[g] + (s.grabTarget - s.u[g]) * STR_GRAB_K;
    s.u[g] = next;
    s.up[g] = next; // a held node has no velocity: letting go is a clean pluck
  }
}

export function stepStringsFrame(s: StringsState, dt: number) {
  'worklet';
  if (s.settled) return;
  s.acc += Math.min(0.05, Math.max(0, dt));
  let steps = 0;
  while (s.acc >= STR_SUB_DT && steps < 16) {
    substep(s);
    s.acc -= STR_SUB_DT;
    steps++;
  }
  if (steps === 16) s.acc = 0;
}

/** Largest absolute displacement on string k (tests and settle checks). */
export function stringMaxAbs(s: StringsState, k: number) {
  'worklet';
  let m = 0;
  const base = k * STR_NODES;
  for (let i = 0; i <= s.m; i++) {
    const a = Math.abs(s.u[base + i]);
    if (a > m) m = a;
  }
  return m;
}

/** Mechanical energy proxy: kinetic + elastic over the grid, px^2/s^2. */
export function stringEnergy(s: StringsState, k: number) {
  'worklet';
  const c = stringWaveSpeed(STR_COURANT[k]);
  const base = k * STR_NODES;
  let e = 0;
  for (let i = 0; i <= s.m; i++) {
    const v = (s.u[base + i] - s.up[base + i]) / STR_SUB_DT;
    e += 0.5 * v * v * STR_DX;
  }
  for (let i = 0; i < s.m; i++) {
    const slope = (s.u[base + i + 1] - s.u[base + i]) / STR_DX;
    e += 0.5 * c * c * slope * slope * STR_DX;
  }
  return e;
}

/** Local motion amount at node i of string k, used to pick a copper shade. */
export function stringNodeGlow(s: StringsState, k: number, i: number) {
  'worklet';
  const j = idx(k, i);
  const speed = Math.abs(s.u[j] - s.up[j]) / STR_SUB_DT;
  const t = speed / 260;
  return t > 1 ? 1 : t;
}

/** Flatten string k into [x0, y0, x1, y1, ...] canvas points for renderers. */
export function stringPoints(s: StringsState, k: number) {
  'worklet';
  const out = new Array(STR_NODES * 2);
  const base = k * STR_NODES;
  const y0 = stringY(k);
  for (let i = 0; i < STR_NODES; i++) {
    out[2 * i] = STR_X0 + i * STR_DX;
    out[2 * i + 1] = y0 + s.u[base + i];
  }
  return out;
}
