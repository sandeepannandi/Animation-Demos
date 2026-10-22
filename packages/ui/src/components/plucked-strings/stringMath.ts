// Physics for Plucked Strings: modal synthesis of five stiff, damped strings.
// Every function is a worklet so Reanimated can step the simulation on the UI
// thread; plain JS (tests, web preview) ignores the tag. Deterministic: the
// only randomness is a seeded generator that jitters motion-blur sample times.
//
// Model. A real string is a sum of standing-wave modes, so each string is
// integrated as a set of damped oscillators, one per mode n:
//   a'' + 2 s_n a' + w_n^2 a = 0,   u(x, t) = sum_n a_n(t) sin(n pi x / L)
// - Pitch: w_n = 2 pi n f1 sqrt(1 + B n^2). B > 0 is the string's stiffness
//   (inharmonicity): upper partials sit slightly sharp, as on a steel string.
// - Damping: s_n = s0 + s1 n^2, so the high partials die first and the sound
//   mellows as it rings, which is what a plucked string really does.
// - Pluck: the finger holds the string as a triangle (two straight segments)
//   with its peak under the finger, softened by the finger's width. Its
//   Fourier amplitudes fall as 1 / n^2 and depend on where it was plucked, so
//   plucking near the bridge is brighter than plucking mid-string.
// - Bridge: all five strings end on one bridge that is not perfectly rigid.
//   The low modes are coupled through it, so a ringing string makes the
//   strings tuned to its partials sing in sympathy.
// - Light: a real string vibrates hundreds of times per frame, so it is shown
//   the way a camera shutter sees it. Each frame is the sum of several poses
//   spread over the simulated time of that frame: a blurred band that is
//   brightest at the turning points. Slow motion shrinks the time per frame,
//   so the blur collapses and you can watch the waves run and reflect.

export const STR_W = 320;
export const STR_H = 380;
export const STRING_COUNT = 5;
export const STR_X0 = 26;
export const STR_X1 = 294;
export const STR_LENGTH = STR_X1 - STR_X0;
export const STR_NODES = 49; // 48 segments along the string
export const STR_M = STR_NODES - 1;
export const STR_DX = STR_LENGTH / STR_M;
export const STR_MODES = 18;
export const STR_COUPLED = 8; // modes that exchange energy through the bridge
export const STR_POSES = 12; // motion-blur samples per frame
export const STR_SUB_DT = 1 / 6400; // modal substep, s
export const STR_MAX_PULL = 46; // px: past this the string slips off the finger
export const STR_GRAB_RANGE = 30;
export const STR_FINGER_W = 2.6; // px, softens the corner under the finger
export const STR_SLOW = 0.02; // slow-motion time scale
// E2 A2 D3 G3 B3, Hz. Real tuning, so the partials of one string line up with
// the open pitches of the others and sympathetic resonance is physical.
export const STR_FREQ = [82.41, 110.0, 146.83, 196.0, 246.94];
// Stiffness (inharmonicity) B per string.
export const STR_STIFF = [0.00006, 0.00008, 0.00011, 0.00022, 0.00036];
// Damping: amplitude decay rate s0 (1/s) for the fundamental, s1 per n^2.
export const STR_DAMP0 = [0.55, 0.65, 0.8, 1.0, 1.25];
export const STR_DAMP1 = [0.016, 0.018, 0.02, 0.024, 0.03];
// Bridge compliance (px per unit slope). Small: sympathetic motion is a few
// percent of the driving string, like a real instrument.
export const STR_BRIDGE = 0.5;
const NONE = 1e9;

export function stringY(k: number) {
  'worklet';
  return 86 + k * 52;
}

/** Frequency in Hz of mode n (1-based) of string k, with stiffness. */
export function stringModeFrequency(k: number, n: number) {
  'worklet';
  return n * STR_FREQ[k] * Math.sqrt(1 + STR_STIFF[k] * n * n);
}

/** Amplitude decay rate (1/s) of mode n (1-based) of string k. */
export function stringModeDecay(k: number, n: number) {
  'worklet';
  return STR_DAMP0[k] + STR_DAMP1[k] * n * n;
}

// ---- precomputed tables (module load, plain JS) ----
const TWO_PI = 2 * Math.PI;
const K = STRING_COUNT;
const N = STR_MODES;
const SIN: number[] = new Array(N * STR_NODES);
for (let n = 0; n < N; n++) {
  for (let i = 0; i < STR_NODES; i++) SIN[n * STR_NODES + i] = Math.sin(((n + 1) * Math.PI * i) / STR_M);
}
// Exact one-substep propagator of a damped oscillator, per (string, mode).
const C11: number[] = new Array(K * N);
const C12: number[] = new Array(K * N);
const C21: number[] = new Array(K * N);
const C22: number[] = new Array(K * N);
const OMEGA2: number[] = new Array(K * N);
for (let k = 0; k < K; k++) {
  for (let n = 0; n < N; n++) {
    const w = TWO_PI * (n + 1) * STR_FREQ[k] * Math.sqrt(1 + STR_STIFF[k] * (n + 1) * (n + 1));
    const sg = STR_DAMP0[k] + STR_DAMP1[k] * (n + 1) * (n + 1);
    const wd = Math.sqrt(w * w - sg * sg);
    const e = Math.exp(-sg * STR_SUB_DT);
    const cs = Math.cos(wd * STR_SUB_DT);
    const sn = Math.sin(wd * STR_SUB_DT);
    const j = k * N + n;
    C11[j] = e * (cs + (sg / wd) * sn);
    C12[j] = (e * sn) / wd;
    C21[j] = -e * ((w * w) / wd) * sn;
    C22[j] = e * (cs - (sg / wd) * sn);
    OMEGA2[j] = w * w;
  }
}
// Bridge coupling: slope at the bridge end of mode m is (m pi / L)(-1)^m, and a
// moving end drives mode m with weight 2 (-1)^(m+1) / (m pi).
const BRIDGE_SLOPE: number[] = new Array(N);
const BRIDGE_DRIVE: number[] = new Array(N);
for (let n = 0; n < N; n++) {
  const m = n + 1;
  BRIDGE_SLOPE[n] = ((m * Math.PI) / STR_LENGTH) * (m % 2 === 0 ? 1 : -1);
  BRIDGE_DRIVE[n] = (2 * (m % 2 === 0 ? -1 : 1)) / (m * Math.PI);
}

export type StringsState = {
  a: number[];         // modal displacement, px, [k * N + n]
  v: number[];         // modal velocity, px/s
  pa: number[];        // modal displacement at each blur pose, [(p * K + k) * N + n]
  fy: number[];        // string displacement per pose, [(p * K + k) * NODES + i]
  lo: number[];        // lowest displacement per string node over the frame
  hi: number[];        // highest displacement per string node over the frame
  blur: number[];      // widest travel of each string over the frame, px
  poseN: number;       // poses recorded for the last frame
  grabString: number;  // -1 when free
  grabBeta: number;    // where along the string the finger holds it, 0..1
  grabD: number;       // finger displacement, px
  touched: number[];   // finger has already plucked this string this gesture
  lastPy: number;
  acc: number;         // simulated time not yet stepped, s
  seq: number;         // pointer sequence handled
  rng: number;
  settled: boolean;
};

export function createStrings(settled = false): StringsState {
  'worklet';
  return {
    a: new Array(K * N).fill(0),
    v: new Array(K * N).fill(0),
    pa: new Array(STR_POSES * K * N).fill(0),
    fy: new Array(STR_POSES * K * STR_NODES).fill(0),
    lo: new Array(K * STR_NODES).fill(0),
    hi: new Array(K * STR_NODES).fill(0),
    blur: new Array(K).fill(0),
    poseN: 1,
    grabString: -1,
    grabBeta: 0.5,
    grabD: 0,
    touched: new Array(K).fill(0),
    lastPy: NONE,
    acc: 0,
    seq: 0,
    rng: 12345,
    settled,
  };
}

function rand(s: StringsState) {
  'worklet';
  s.rng = (s.rng * 1664525 + 1013904223) % 4294967296;
  return s.rng / 4294967296;
}

/** Modal amplitudes of a string held as a triangle: peak d at fraction beta. */
function setHeldShape(s: StringsState, k: number, beta: number, d: number) {
  'worklet';
  const b = Math.min(0.97, Math.max(0.03, beta));
  for (let n = 0; n < N; n++) {
    const m = n + 1;
    const soft = Math.exp(-0.5 * ((m * Math.PI * STR_FINGER_W) / STR_LENGTH) ** 2);
    s.a[k * N + n] = ((2 * d) / (m * m * Math.PI * Math.PI * b * (1 - b))) * Math.sin(m * Math.PI * b) * soft;
    s.v[k * N + n] = 0;
  }
}

function tryGrab(s: StringsState, x: number, y: number, py0: number) {
  'worklet';
  let pick = -1;
  let bestD = 1e9;
  for (let k = 0; k < K; k++) {
    if (s.touched[k]) continue;
    const y0 = stringY(k);
    let hit = false;
    if (py0 === NONE) hit = Math.abs(y - y0) <= STR_GRAB_RANGE;
    else hit = (py0 - y0) * (y - y0) <= 0 || Math.abs(y - y0) <= 2;
    if (!hit) continue;
    const d = py0 === NONE ? Math.abs(y - y0) : Math.abs(py0 - y0);
    if (d < bestD) {
      bestD = d;
      pick = k;
    }
  }
  if (pick < 0) return;
  s.grabString = pick;
  s.touched[pick] = 1;
  s.settled = false;
  s.grabBeta = Math.min(0.97, Math.max(0.03, (x - STR_X0) / STR_LENGTH));
}

/** Finger at canvas point (x, y): hold a string it touches, or strum across. */
export function stringsDragTo(s: StringsState, x: number, y: number) {
  'worklet';
  const py0 = s.lastPy;
  s.lastPy = y;
  for (let k = 0; k < K; k++) if (Math.abs(y - stringY(k)) > 58) s.touched[k] = 0;
  if (s.grabString < 0) tryGrab(s, x, y, py0);
  if (s.grabString >= 0) {
    const k = s.grabString;
    const d = y - stringY(k);
    s.grabBeta = Math.min(0.97, Math.max(0.03, (x - STR_X0) / STR_LENGTH));
    if (Math.abs(d) >= STR_MAX_PULL) {
      // Pulled far enough: the string slips off the fingertip and rings.
      s.grabD = d > 0 ? STR_MAX_PULL : -STR_MAX_PULL;
      setHeldShape(s, k, s.grabBeta, s.grabD);
      s.grabString = -1;
      s.settled = false;
      // The same stroke may already be past the next string: catch it now.
      tryGrab(s, x, y, py0 === NONE ? y : py0);
      if (s.grabString >= 0) s.grabD = Math.max(-STR_MAX_PULL, Math.min(STR_MAX_PULL, y - stringY(s.grabString)));
    } else {
      s.grabD = d;
    }
  }
}


/** Let go: the string keeps the shape the finger left and rings on. */
export function stringsRelease(s: StringsState) {
  'worklet';
  if (s.grabString >= 0) setHeldShape(s, s.grabString, s.grabBeta, s.grabD);
  s.grabString = -1;
  s.lastPy = NONE;
  for (let k = 0; k < K; k++) s.touched[k] = 0;
  s.settled = false;
}

/** Pluck string k at fraction beta of its length, pulled to `amp` px. */
export function stringsPluck(s: StringsState, k: number, amp: number, beta = 0.5) {
  'worklet';
  setHeldShape(s, k, beta, amp);
  s.settled = false;
}

function substep(s: StringsState) {
  'worklet';
  const { a, v } = s;
  // Bridge motion from the low modes of every string (conservative coupling).
  let drive = 0;
  for (let k = 0; k < K; k++) {
    const base = k * N;
    for (let n = 0; n < STR_COUPLED; n++) drive += OMEGA2[base + n] * BRIDGE_SLOPE[n] * a[base + n];
  }
  const kick = -STR_BRIDGE * drive * STR_SUB_DT;
  for (let k = 0; k < K; k++) {
    if (k === s.grabString) continue;
    const base = k * N;
    for (let n = 0; n < N; n++) {
      const j = base + n;
      const a0 = a[j];
      const v0 = v[j];
      a[j] = C11[j] * a0 + C12[j] * v0;
      v[j] = C21[j] * a0 + C22[j] * v0 + (n < STR_COUPLED ? kick * BRIDGE_DRIVE[n] : 0);
    }
  }
}

function buildFrame(s: StringsState) {
  'worklet';
  const P = s.poseN;
  for (let k = 0; k < K; k++) {
    // Highest mode still above 3/1000 px of motion.
    let top = 0;
    for (let n = N - 1; n >= 0; n--) {
      const j = k * N + n;
      const am = Math.abs(s.a[j]) + Math.abs(s.v[j]) / Math.sqrt(OMEGA2[j]);
      if (am > 0.003) {
        top = n + 1;
        break;
      }
    }
    for (let i = 0; i < STR_NODES; i++) {
      s.lo[k * STR_NODES + i] = 1e9;
      s.hi[k * STR_NODES + i] = -1e9;
    }
    let widest = 0;
    for (let p = 0; p < P; p++) {
      const pb = (p * K + k) * N;
      const fb = (p * K + k) * STR_NODES;
      for (let i = 0; i < STR_NODES; i++) {
        let y = 0;
        for (let n = 0; n < top; n++) y += s.pa[pb + n] * SIN[n * STR_NODES + i];
        s.fy[fb + i] = y;
        const li = k * STR_NODES + i;
        if (y < s.lo[li]) s.lo[li] = y;
        if (y > s.hi[li]) s.hi[li] = y;
      }
    }
    for (let i = 0; i < STR_NODES; i++) {
      const w = s.hi[k * STR_NODES + i] - s.lo[k * STR_NODES + i];
      if (w > widest) widest = w;
    }
    s.blur[k] = widest;
  }
}

/** Largest absolute displacement of string k right now, px. */
export function stringMaxAbs(s: StringsState, k: number) {
  'worklet';
  let m = 0;
  for (let i = 0; i < STR_NODES; i++) {
    let y = 0;
    for (let n = 0; n < N; n++) y += s.a[k * N + n] * SIN[n * STR_NODES + i];
    if (Math.abs(y) > m) m = Math.abs(y);
  }
  return m;
}

export function stepStringsFrame(s: StringsState, dt: number) {
  'worklet';
  if (s.settled) return;
  s.acc += Math.min(0.05, Math.max(0, dt));
  const nsub = Math.floor(s.acc / STR_SUB_DT);
  if (nsub < 1 && s.grabString < 0) return;
  if (s.grabString >= 0) setHeldShape(s, s.grabString, s.grabBeta, s.grabD);
  const P = Math.max(1, Math.min(STR_POSES, nsub));
  // One blur pose per stratum of the frame, jittered so a string vibrating
  // near a multiple of the pose rate turns into grain, not stripes.
  let next = Math.floor((rand(s) * Math.max(1, nsub)) / P);
  let taken = 0;
  for (let j = 0; j < nsub; j++) {
    substep(s);
    if (j >= next && taken < P) {
      const pb = taken * K * N;
      for (let q = 0; q < K * N; q++) s.pa[pb + q] = s.a[q];
      taken++;
      next = Math.floor(((taken + rand(s)) * nsub) / P);
    }
  }
  while (taken < P) {
    // Fewer substeps than poses (slow motion at a high frame rate).
    const pb = taken * K * N;
    for (let q = 0; q < K * N; q++) s.pa[pb + q] = s.a[q];
    taken++;
  }
  if (nsub < 1) {
    // Held string with no time passing: one static pose.
    for (let q = 0; q < K * N; q++) s.pa[q] = s.a[q];
  }
  s.acc -= nsub * STR_SUB_DT;
  if (s.acc > 4 * STR_SUB_DT) s.acc = 0;
  s.poseN = P;
  buildFrame(s);
  if (s.grabString < 0) {
    let live = false;
    for (let k = 0; k < K && !live; k++) if (s.blur[k] > 0.02 || stringMaxAbs(s, k) > 0.02) live = true;
    if (!live) {
      s.a.fill(0);
      s.v.fill(0);
      s.settled = true;
      s.poseN = 1;
      s.fy.fill(0);
      s.lo.fill(0);
      s.hi.fill(0);
      s.blur.fill(0);
    }
  }
}


/** Mechanical energy of string k: sum over modes of (v^2 + w^2 a^2) L / 4. */
export function stringEnergy(s: StringsState, k: number) {
  'worklet';
  let e = 0;
  for (let n = 0; n < N; n++) {
    const j = k * N + n;
    e += s.v[j] * s.v[j] + OMEGA2[j] * s.a[j] * s.a[j];
  }
  return (e * STR_LENGTH) / 4;
}

/** Displacement of string k at node i for blur pose p (renderers). */
export function stringPose(s: StringsState, p: number, k: number, i: number) {
  'worklet';
  return s.fy[(p * K + k) * STR_NODES + i];
}

/** Displacement of string k at node i, exact current state (tests). */
export function stringShape(s: StringsState, k: number, i: number) {
  'worklet';
  let y = 0;
  for (let n = 0; n < N; n++) y += s.a[k * N + n] * SIN[n * STR_NODES + i];
  return y;
}

/** Ink weight of one blur pose so coinciding poses add up to a solid string. */
export function stringPoseAlpha(s: StringsState) {
  'worklet';
  return 1 - Math.pow(0.05, 1 / s.poseN);
}
