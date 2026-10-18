// Pure condensation physics for Fogged Glass. A pane mists over; a finger
// wipes clear streaks, water beads nucleate, grow by absorbing fog, and run
// down the glass with stick-slip, leaving clear trails that slowly fog over
// again. The pane is a grid of fog cells plus a small set of droplets; every
// function is a worklet so the sim can run on either thread, and plain JS
// (tests, web preview) ignores the tag. No Math.random anywhere: a seeded
// generator keeps web, native and tests in agreement frame for frame.

export type FogPointer = { x: number; y: number; active: number };

export type FogConfig = {
  cols: number;
  rows: number;
  /** Pane size in px. */
  width: number;
  height: number;
};

export type FogState = {
  /** Fog per cell, 0 (clear) .. 1 (opaque), row-major. */
  fog: Float32Array;
  /** Droplet slots, 4 floats each: x, y, r, mode (0 empty, 1 stuck, 2 sliding). */
  drops: Float32Array;
  dropCount: number;
  /** Seeded PRNG state. */
  seed: number;
  /** Sim clock, seconds. */
  time: number;
  /** Nucleation accumulator. */
  acc: number;
  /** Water squeezed out by wiping, not yet shed as beads. */
  squeeze: number;
  /** Previous wipe point, for capsule strokes. */
  wasWiping: number;
  lastX: number;
  lastY: number;
};

export const FOG_DEFAULTS = {
  /** Starting and resting fog level. */
  fogStart: 0.96,
  fogMax: 0.97,
  /** Fraction of the gap to fogMax closed per second, before per-cell noise. */
  regrowRate: 0.045,
  /** Wipe brush radius, px. */
  wipeRadius: 30,
  /** Seconds between ambient bead nucleation attempts. */
  nucleationInterval: 0.45,
  /** Beads at or below this radius never slide, px. */
  stickRadius: 3.4,
  /** Slide speed scale, px/s. */
  slideSpeed: 120,
  /** Sideways wobble of a running bead, px. */
  wobble: 2.2,
  /** Radius a sliding bead sheds per second, px/s. */
  shedRate: 0.32,
  /** Growth of a bead from fog it absorbs, px radius per (fog * px traveled / diameter). */
  absorb: 0.85,
  /** Growth of a stuck bead from surrounding condensation, px/s at fog 1. */
  condense: 0.045,
  /** Largest bead radius, px. */
  maxRadius: 14,
  /** Fixed timestep ceiling for the sim. */
  fixedDt: 1 / 120,
};

export type FogOptions = typeof FOG_DEFAULTS;

const STRIDE = 4;

export function cellCount(cfg: FogConfig): number {
  'worklet';
  return cfg.cols * cfg.rows;
}

/** Deterministic per-cell noise in [0, 1). */
export function hash01(i: number, salt: number): number {
  'worklet';
  let h = (Math.imul(i, 374761393) + Math.imul(salt, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Seeded generator; advances state.seed. */
export function rand(state: FogState): number {
  'worklet';
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createFog(cfg: FogConfig, opts: FogOptions): FogState {
  'worklet';
  const n = cellCount(cfg);
  const fog = new Float32Array(n);
  for (let i = 0; i < n; i++) fog[i] = opts.fogStart * (0.94 + 0.12 * hash01(i, 5));
  return {
    fog,
    drops: new Float32Array(96 * STRIDE),
    dropCount: 0,
    seed: 20260618,
    time: 0,
    acc: 0,
    squeeze: 0,
    wasWiping: 0,
    lastX: 0,
    lastY: 0,
  };
}

const MAX_DROPS = 96;

export function maxDrops(): number {
  'worklet';
  return MAX_DROPS;
}

export function fogAt(state: FogState, cfg: FogConfig, x: number, y: number): number {
  'worklet';
  const c = Math.max(0, Math.min(cfg.cols - 1, Math.floor((x / cfg.width) * cfg.cols)));
  const r = Math.max(0, Math.min(cfg.rows - 1, Math.floor((y / cfg.height) * cfg.rows)));
  return state.fog[r * cfg.cols + c];
}

function spawnDrop(state: FogState, cfg: FogConfig, x: number, y: number, r: number): number {
  'worklet';
  if (state.dropCount >= MAX_DROPS) return -1;
  for (let s = 0; s < MAX_DROPS; s++) {
    const k = s * STRIDE;
    if (state.drops[k + 3] !== 0) continue;
    state.drops[k] = Math.max(r, Math.min(cfg.width - r, x));
    state.drops[k + 1] = Math.max(r, Math.min(cfg.height - r, y));
    state.drops[k + 2] = r;
    state.drops[k + 3] = 1;
    state.dropCount++;
    return s;
  }
  return -1;
}

function removeDrop(state: FogState, slot: number): void {
  'worklet';
  state.drops[slot * STRIDE + 3] = 0;
  state.dropCount--;
}

/**
 * Clear fog along the segment (x0,y0)-(x1,y1) with a soft circular brush.
 * Returns the average fog removed across touched cells (0..1).
 */
export function clearBand(
  state: FogState,
  cfg: FogConfig,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): number {
  'worklet';
  const cw = cfg.width / cfg.cols;
  const ch = cfg.height / cfg.rows;
  const minX = Math.max(0, Math.floor((Math.min(x0, x1) - radius) / cw));
  const maxX = Math.min(cfg.cols - 1, Math.floor((Math.max(x0, x1) + radius) / cw));
  const minY = Math.max(0, Math.floor((Math.min(y0, y1) - radius) / ch));
  const maxY = Math.min(cfg.rows - 1, Math.floor((Math.max(y0, y1) + radius) / ch));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  const r2 = radius * radius;
  let removed = 0;
  let touched = 0;
  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const px = (col + 0.5) * cw;
      const py = (row + 0.5) * ch;
      let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = px - (x0 + t * dx);
      const qy = py - (y0 + t * dy);
      const d2 = qx * qx + qy * qy;
      if (d2 > r2) continue;
      const f = 1 - Math.sqrt(d2) / radius;
      const soft = f <= 0 ? 0 : f >= 0.55 ? 1 : f / 0.55;
      const i = row * cfg.cols + col;
      const before = state.fog[i];
      const after = Math.max(0, before - soft);
      state.fog[i] = after;
      removed += before - after;
      touched++;
    }
  }
  return touched > 0 ? removed / touched : 0;
}

function nucleate(state: FogState, cfg: FogConfig, opts: FogOptions): void {
  'worklet';
  for (let attempt = 0; attempt < 3; attempt++) {
    const x = rand(state) * cfg.width;
    const y = rand(state) * cfg.height * 0.92;
    if (fogAt(state, cfg, x, y) < 0.8) continue;
    if (rand(state) < 0.55) {
      spawnDrop(state, cfg, x, y, 1.4 + rand(state) * 1.6);
      return;
    }
  }
}

/** Finger wipe: capsule clear along the stroke, plus beads squeezed out at the rim. */
export function applyWipe(state: FogState, cfg: FogConfig, x: number, y: number, opts: FogOptions): void {
  'worklet';
  const x0 = state.wasWiping ? state.lastX : x;
  const y0 = state.wasWiping ? state.lastY : y;
  const cleared = clearBand(state, cfg, x0, y0, x, y, opts.wipeRadius);
  state.lastX = x;
  state.lastY = y;
  state.wasWiping = 1;
  // Cleared water gathers until there is enough for a rim bead.
  state.squeeze += cleared;
  if (cleared > 0.1 && state.squeeze > 0.8) {
    state.squeeze -= 0.8;
    const t = rand(state);
    const side = rand(state) < 0.5 ? -1 : 1;
    const dx = x - x0;
    const dy = y - y0;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = (-dy / len) * side * opts.wipeRadius * (0.75 + 0.35 * rand(state));
    const py = (dx / len) * side * opts.wipeRadius * (0.75 + 0.35 * rand(state));
    spawnDrop(state, cfg, x0 + dx * t + px, y0 + dy * t + py, 2 + rand(state) * 2.8);
  }
}

/** One fixed substep: regrowth, condensation, droplet stick-slip. */
export function stepFog(state: FogState, cfg: FogConfig, dt: number, opts: FogOptions): void {
  'worklet';
  state.time += dt;
  const fog = state.fog;
  const n = cellCount(cfg);
  for (let i = 0; i < n; i++) {
    const target = opts.fogMax * (0.86 + 0.14 * hash01(i, 11));
    fog[i] += (target - fog[i]) * opts.regrowRate * dt;
  }

  state.acc += dt;
  while (state.acc >= opts.nucleationInterval) {
    state.acc -= opts.nucleationInterval;
    nucleate(state, cfg, opts);
  }

  const cw = cfg.width / cfg.cols;
  for (let s = 0; s < MAX_DROPS; s++) {
    const k = s * STRIDE;
    const mode = state.drops[k + 3];
    if (mode === 0) continue;
    let x = state.drops[k];
    let y = state.drops[k + 1];
    let r = state.drops[k + 2];

    if (r <= opts.stickRadius) {
      // Stuck bead: drink the condensation around it until it can run.
      const local = fogAt(state, cfg, x, y);
      r = Math.min(opts.stickRadius + 0.35, r + opts.condense * local * dt);
      state.drops[k + 2] = r;
      continue;
    }

    // Sliding bead: speed grows with size, wobbles on the way down.
    const v = Math.max(10, Math.min(260, (opts.slideSpeed * (r - opts.stickRadius)) / opts.stickRadius));
    const dy = v * dt;
    const wob = Math.sin(state.time * 11 + s * 2.7) * opts.wobble * Math.min(1, v / 60) * dt;
    x += wob;
    if (x < r) x = r;
    if (x > cfg.width - r) x = cfg.width - r;
    const yNext = y + dy;

    // Absorb the fog on the path, then leave a narrow clear trail.
    const bandFog = sampleBand(state, cfg, x, y, x, yNext, r * 0.8);
    clearBand(state, cfg, x, y, x, yNext, r * 0.62);
    r += (opts.absorb * bandFog * dy) / (2 * r);
    r -= opts.shedRate * dt;

    // Swallow smaller beads on the way.
    for (let o = 0; o < MAX_DROPS; o++) {
      if (o === s) continue;
      const ok = o * STRIDE;
      if (state.drops[ok + 3] === 0) continue;
      const ox = state.drops[ok];
      const oy = state.drops[ok + 1];
      const orad = state.drops[ok + 2];
      const ddx = ox - x;
      const ddy = oy - yNext;
      const rr = (r + orad) * 0.72;
      if (ddx * ddx + ddy * ddy < rr * rr) {
        r = Math.sqrt(r * r + orad * orad);
        removeDrop(state, o);
      }
    }

    if (r > opts.maxRadius) r = opts.maxRadius;
    y = yNext;
    if (y - r > cfg.height) {
      removeDrop(state, s);
      continue;
    }
    state.drops[k] = x;
    state.drops[k + 1] = y;
    state.drops[k + 2] = r;
    state.drops[k + 3] = r <= opts.stickRadius ? 1 : 2;
  }
}

/** Average fog along a band without changing it. */
export function sampleBand(
  state: FogState,
  cfg: FogConfig,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
): number {
  'worklet';
  const cw = cfg.width / cfg.cols;
  const ch = cfg.height / cfg.rows;
  const minX = Math.max(0, Math.floor((Math.min(x0, x1) - radius) / cw));
  const maxX = Math.min(cfg.cols - 1, Math.floor((Math.max(x0, x1) + radius) / cw));
  const minY = Math.max(0, Math.floor((Math.min(y0, y1) - radius) / ch));
  const maxY = Math.min(cfg.rows - 1, Math.floor((Math.max(y0, y1) + radius) / ch));
  let sum = 0;
  let touched = 0;
  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const px = (col + 0.5) * cw;
      const py = (row + 0.5) * ch;
      const ddx = px - x0;
      const ddy = py - y0;
      if (ddx * ddx + ddy * ddy > radius * radius) continue;
      sum += state.fog[row * cfg.cols + col];
      touched++;
    }
  }
  return touched > 0 ? sum / touched : 0;
}

/** Advance by a wall-clock frame delta using capped substeps. */
export function stepFogFixed(state: FogState, cfg: FogConfig, frameDt: number, opts: FogOptions): void {
  'worklet';
  let remaining = Math.min(frameDt, 0.1);
  while (remaining > 1e-6) {
    const dt = Math.min(opts.fixedDt, remaining);
    stepFog(state, cfg, dt, opts);
    remaining -= dt;
  }
}

/**
 * Pack the current frame into an RGBA byte texture (cols x rows):
 * R and A carry the fog level with per-cell grain (A is for the Canvas2D
 * mask on web), G carries the droplet dome height. Beads clear the fog
 * beneath their dome.
 */
export function packFrame(state: FogState, cfg: FogConfig, bytes: Uint8Array): Uint8Array {
  'worklet';
  const n = cellCount(cfg);
  for (let i = 0; i < n; i++) {
    const grain = 0.8 + 0.45 * hash01(i, 13);
    const f = Math.max(0, Math.min(1, state.fog[i] * grain));
    const a = i * 4;
    const v = Math.round(f * 255);
    bytes[a] = v;
    bytes[a + 1] = 0;
    bytes[a + 2] = 0;
    bytes[a + 3] = v;
  }
  const cw = cfg.width / cfg.cols;
  const ch = cfg.height / cfg.rows;
  for (let s = 0; s < MAX_DROPS; s++) {
    const k = s * STRIDE;
    if (state.drops[k + 3] === 0) continue;
    const x = state.drops[k];
    const y = state.drops[k + 1];
    const r = state.drops[k + 2];
    const minX = Math.max(0, Math.floor((x - r) / cw));
    const maxX = Math.min(cfg.cols - 1, Math.floor((x + r) / cw));
    const minY = Math.max(0, Math.floor((y - r) / ch));
    const maxY = Math.min(cfg.rows - 1, Math.floor((y + r) / ch));
    for (let row = minY; row <= maxY; row++) {
      for (let col = minX; col <= maxX; col++) {
        const px = (col + 0.5) * cw;
        const py = (row + 0.5) * ch;
        const ddx = px - x;
        const ddy = py - y;
        const d2 = (ddx * ddx + ddy * ddy) / (r * r);
        if (d2 > 1) continue;
        const h = Math.sqrt(1 - d2);
        const a = (row * cfg.cols + col) * 4;
        const clear = d2 < 0.55 ? 1 : 1 - (d2 - 0.55) / 0.45;
        bytes[a] = Math.round(bytes[a] * (1 - clear * 0.97));
        bytes[a + 3] = Math.round(bytes[a + 3] * (1 - clear * 0.97));
        const dome = Math.round(h * 255);
        if (dome > bytes[a + 1]) bytes[a + 1] = dome;
      }
    }
  }
  return bytes;
}

/** Total fog across the pane, for settle checks in tests. */
export function totalFog(state: FogState): number {
  'worklet';
  let s = 0;
  for (let i = 0; i < state.fog.length; i++) s += state.fog[i];
  return s;
}
