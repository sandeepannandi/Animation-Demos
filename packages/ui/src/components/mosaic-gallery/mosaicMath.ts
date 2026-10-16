/**
 * mosaicMath.ts - pure, worklet-safe math for MosaicGallery.
 *
 * Everything here is deterministic and shared verbatim between the native
 * Skia renderer and the web Canvas2D preview. No DOM, no Skia, no Reanimated
 * imports; the same file runs in Node for tests.
 */

export interface MosaicFrame {
  /** Center x per cell, in grid units (0..cols). */
  x: Float32Array;
  /** Center y per cell, in grid units (0..rows). */
  y: Float32Array;
  /** Uniform scale per cell (1 = rest size). */
  s: Float32Array;
  /** Packed 0xFFRRGGBB color per cell. */
  color: Uint32Array;
}

export interface MosaicState {
  /** Resting slot per cell in the currently shown painting. */
  home: Uint16Array;
  /** Slot each cell started the active transition from. */
  from: Uint16Array;
  /** Slot each cell is flying to in the active transition. */
  to: Uint16Array;
  /** RGB888 colors of the outgoing painting. */
  colorsA: Uint8ClampedArray;
  /** RGB888 colors of the incoming painting. */
  colorsB: Uint8ClampedArray;
  /** Index of the painting shown (or being left). */
  painting: number;
  /** Index of the painting being entered. */
  nextPainting: number;
  /** Clock time the transition started, in seconds. */
  startT: number;
  /** Tap origin of the transition, in grid units. */
  ox: number;
  oy: number;
  /** Seed for the shuffle permutation and per-cell jitter. */
  seed: number;
  /** 1 while a transition is in flight. */
  active: 0 | 1;
}

export const SHUFFLE_DURATION = 0.62; // seconds per cell
export const SHUFFLE_SPREAD = 0.55; // radial stagger span, seconds
export const SHUFFLE_JITTER = 0.14; // random extra stagger, seconds
export const ARC_AMOUNT = 2.6; // mid-flight scatter, grid units
export const POP_SCALE = 0.55; // mid-flight growth

/* ---------------------------------------------------------------- rng */

export function hashSeed(n: number): number {
  'worklet';
  let h = (n | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

/** Deterministic pseudo-random in [0, 1) for an integer stream position. */
export function rand01(stream: number): number {
  'worklet';
  return hashSeed(stream) / 4294967296;
}

/* ------------------------------------------------------------ base64 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Worklet-safe base64 decode (no atob on Hermes). */
export function decodeBase64(b64: string): Uint8ClampedArray {
  'worklet';
  let len = b64.length;
  while (len > 0 && b64.charCodeAt(len - 1) === 61) len--; // strip '='
  const out = new Uint8ClampedArray(Math.floor((len * 3) / 4));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < len; i++) {
    const v = B64_CHARS.indexOf(b64[i]);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

/* ---------------------------------------------------------- shuffling */

/** Fisher-Yates permutation of [0, n), seeded. perm[i] = target slot. */
export function shufflePermutation(n: number, seed: number): Uint16Array {
  'worklet';
  const perm = new Uint16Array(n);
  for (let i = 0; i < n; i++) perm[i] = i;
  let s = hashSeed(seed);
  for (let i = n - 1; i > 0; i--) {
    s = hashSeed(s + i);
    const j = s % (i + 1);
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  return perm;
}

/* ------------------------------------------------------------ easing */

export function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function easeInOutCubic(p: number): number {
  'worklet';
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeOutQuad(p: number): number {
  'worklet';
  return 1 - (1 - p) * (1 - p);
}

/* --------------------------------------------------------- transitions */

/**
 * Per-cell stagger delay: a radial wave out from the tap point plus jitter,
 * so the shuffle ripples across the field instead of flipping at once.
 */
export function cellDelay(slot: number, cols: number, rows: number, ox: number, oy: number, seed: number): number {
  'worklet';
  const cx = (slot % cols) + 0.5;
  const cy = Math.floor(slot / cols) + 0.5;
  const dx = cx - ox;
  const dy = cy - oy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const diag = Math.sqrt(cols * cols + rows * rows) * 0.5;
  return (dist / diag) * SHUFFLE_SPREAD + rand01(seed * 31 + slot * 7) * SHUFFLE_JITTER;
}

export function makeState(painting: number, colors: Uint8ClampedArray, cellCount: number): MosaicState {
  const home = new Uint16Array(cellCount);
  for (let i = 0; i < cellCount; i++) home[i] = i;
  return {
    home,
    from: home.slice(),
    to: home.slice(),
    colorsA: colors,
    colorsB: colors,
    painting,
    nextPainting: painting,
    startT: 0,
    ox: 0,
    oy: 0,
    seed: 0,
    active: 0,
  };
}

/**
 * Begin a shuffle to `nextPainting`. Cell i flies from its current resting
 * slot to perm[i]; when it lands it shows colorsB[perm[i]].
 */
export function beginShuffle(
  st: MosaicState,
  nextPainting: number,
  colorsB: Uint8ClampedArray,
  now: number,
  ox: number,
  oy: number,
  seed: number,
): void {
  'worklet';
  const n = st.home.length;
  const perm = shufflePermutation(n, seed);
  st.from.set(st.home);
  st.to.set(perm);
  st.colorsB = colorsB;
  st.nextPainting = nextPainting;
  st.startT = now;
  st.ox = ox;
  st.oy = oy;
  st.seed = seed;
  st.active = 1;
}

/**
 * Evaluate one frame. Positions are in grid units; the renderer multiplies
 * by the cell size. When `reduced` is set the ripple becomes a quick global
 * crossfade with no flight.
 */
export function evalMosaicFrame(
  st: MosaicState,
  cols: number,
  rows: number,
  t: number,
  reduced: boolean,
  out: MosaicFrame,
): void {
  'worklet';
  const n = st.home.length;
  if (reduced) {
    // Positions never move and the permutation is ignored: each cell stays
    // on its resting slot and crossfades to the new painting in 240 ms.
    const p = st.active ? clamp01((t - st.startT) / 0.24) : 1;
    if (st.active && p >= 1) {
      st.colorsA = st.colorsB;
      st.painting = st.nextPainting;
      st.active = 0;
    }
    const A2 = st.colorsA;
    const B2 = st.colorsB;
    for (let i = 0; i < n; i++) {
      const slot = st.home[i];
      out.x[i] = (slot % cols) + 0.5;
      out.y[i] = Math.floor(slot / cols) + 0.5;
      out.s[i] = 1;
      const si = slot * 3;
      const r = A2[si] + (B2[si] - A2[si]) * p;
      const g = A2[si + 1] + (B2[si + 1] - A2[si + 1]) * p;
      const b = A2[si + 2] + (B2[si + 2] - A2[si + 2]) * p;
      out.color[i] = 0xff000000 | (((r | 0) & 255) << 16) | (((g | 0) & 255) << 8) | ((b | 0) & 255);
    }
    return;
  }

  let allDone = true;
  const A = st.colorsA;
  const B = st.colorsB;
  for (let i = 0; i < n; i++) {
    const fromSlot = st.from[i];
    const toSlot = st.to[i];
    let p = 1;
    if (st.active) {
      const delay = cellDelay(fromSlot, cols, rows, st.ox, st.oy, st.seed);
      p = clamp01((t - st.startT - delay) / SHUFFLE_DURATION);
      if (p < 1) allDone = false;
      p = easeInOutCubic(p);
    }
    const fx = (fromSlot % cols) + 0.5;
    const fy = Math.floor(fromSlot / cols) + 0.5;
    const tx = (toSlot % cols) + 0.5;
    const ty = Math.floor(toSlot / cols) + 0.5;
    const flight = st.active ? Math.sin(Math.PI * clamp01(p)) : 0;
    const r1 = rand01(st.seed * 131 + i * 17) - 0.5;
    const r2 = rand01(st.seed * 733 + i * 29) - 0.5;
    out.x[i] = fx + (tx - fx) * p + r1 * ARC_AMOUNT * 2 * flight;
    out.y[i] = fy + (ty - fy) * p + r2 * ARC_AMOUNT * 2 * flight;
    out.s[i] = 1 + POP_SCALE * flight;
    const ai = fromSlot * 3;
    const bi = toSlot * 3;
    const cr = A[ai] + (B[bi] - A[ai]) * p;
    const cg = A[ai + 1] + (B[bi + 1] - A[ai + 1]) * p;
    const cb = A[ai + 2] + (B[bi + 2] - A[ai + 2]) * p;
    out.color[i] = 0xff000000 | (((cr | 0) & 255) << 16) | (((cg | 0) & 255) << 8) | ((cb | 0) & 255);
  }
  if (st.active && allDone) {
    st.home.set(st.to);
    st.colorsA = st.colorsB;
    st.painting = st.nextPainting;
    st.active = 0;
  }
}

/** Allocate the frame buffers for `cellCount` cells. */
export function makeFrame(cellCount: number): MosaicFrame {
  return {
    x: new Float32Array(cellCount),
    y: new Float32Array(cellCount),
    s: new Float32Array(cellCount),
    color: new Uint32Array(cellCount),
  };
}

/* ------------------------------------------------------ view transform */

export interface MosaicView {
  scale: number;
  tx: number;
  ty: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

/** Clamp and re-center so the field never leaves the viewport. */
export function clampView(view: MosaicView, width: number, height: number): MosaicView {
  'worklet';
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale));
  const maxTx = (width * (scale - 1)) / 2;
  const maxTy = (height * (scale - 1)) / 2;
  return {
    scale,
    tx: Math.min(maxTx, Math.max(-maxTx, view.tx)),
    ty: Math.min(maxTy, Math.max(-maxTy, view.ty)),
  };
}

/** Zoom about a focal point: keeps the point under the fingers stationary. */
export function zoomAbout(view: MosaicView, nextScale: number, fx: number, fy: number, width: number, height: number): MosaicView {
  'worklet';
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
  if (scale === view.scale) return view;
  const cx = width / 2;
  const cy = height / 2;
  // Field point under the focal point, in unscaled coords.
  const px = (fx - cx - view.tx) / view.scale;
  const py = (fy - cy - view.ty) / view.scale;
  return clampView({ scale, tx: fx - cx - px * scale, ty: fy - cy - py * scale }, width, height);
}
