// Pure cloth physics for the Cloth Banner. A hanging banner pinned at its two
// top corners: fixed-timestep Verlet integration in 3D, structural and shear
// constraint relaxation, a layered traveling wind, and a finger grab that pins
// one particle to the pointer. Shading comes from per-particle normals against
// a fixed light. Every function is a worklet so Reanimated can step the
// simulation on the UI thread; plain JS (tests, web preview) ignores the tag.
// No randomness anywhere: web, native and tests all agree frame for frame.

export type ClothPointer = { x: number; y: number; active: number };

export type ClothConfig = {
  cols: number;
  rows: number;
  /** Rest distance between neighbors, px. */
  spacingX: number;
  spacingY: number;
  /** Canvas-local position of particle (0, 0), the left pin. */
  originX: number;
  originY: number;
  /** Weak-perspective focal length, px. Larger = flatter. */
  perspective: number;
  /** Vanishing point the projection scales toward (banner center at rest). */
  centerX: number;
  centerY: number;
};

export type ClothState = {
  /** x, y, z per particle, row-major. z > 0 billows toward the viewer. */
  pos: Float32Array;
  prev: Float32Array;
  /** 1 = immovable (the two top corner pins). */
  pinned: Uint8Array;
  /** Wind clock, seconds. */
  time: number;
  /** Fixed-timestep accumulator. */
  acc: number;
  /** Grabbed particle index, or -1. */
  grabbed: number;
  /** z the grabbed particle keeps while dragged. */
  grabZ: number;
};

export const CLOTH_DEFAULTS = {
  damping: 0.982,
  gravity: 1450,
  iterations: 3,
  windStrength: 330,
  fixedDt: 1 / 120,
  /** Shading: flat facing the light reads as `ambient + diffuse`. */
  ambient: 0.4,
  diffuse: 0.72,
  /** The back of the cloth reads darker than the front. */
  backDim: 0.76,
  /** Pointer grab radius in screen px. */
  grabRadius: 30,
};

export type ClothOptions = typeof CLOTH_DEFAULTS;

export function particleCount(cfg: ClothConfig): number {
  'worklet';
  return cfg.cols * cfg.rows;
}

export function createCloth(cfg: ClothConfig): ClothState {
  'worklet';
  const n = particleCount(cfg);
  const pos = new Float32Array(n * 3);
  const prev = new Float32Array(n * 3);
  const pinned = new Uint8Array(n);
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const i = (r * cfg.cols + c) * 3;
      pos[i] = cfg.originX + c * cfg.spacingX;
      pos[i + 1] = cfg.originY + r * cfg.spacingY;
      pos[i + 2] = 0;
      prev[i] = pos[i];
      prev[i + 1] = pos[i + 1];
      prev[i + 2] = 0;
    }
  }
  pinned[0] = 1;
  pinned[cfg.cols - 1] = 1;
  return { pos, prev, pinned, time: 0, acc: 0, grabbed: -1, grabZ: 0 };
}

/** Wind pressure on the z axis at a cloth point, px/s^2. Always breezy, with
 * a slow gust envelope and a ripple that travels along the banner. */
export function windAt(x: number, y: number, t: number, strength: number): number {
  'worklet';
  const gust = 0.55 + 0.45 * Math.sin(t * 0.47 + 1.3) * Math.sin(t * 0.19 + 0.4);
  const wave =
    Math.sin(x * 0.021 + t * 1.9) +
    0.6 * Math.sin(y * 0.033 - t * 1.3 + 1.7) +
    0.4 * Math.sin((x + y) * 0.012 + t * 2.6);
  return strength * gust * (0.35 + 0.325 * wave);
}

/** Sideways breeze on the x axis, much weaker than the billow. */
export function swayAt(y: number, t: number, strength: number): number {
  'worklet';
  return strength * 0.12 * Math.sin(t * 0.8 + y * 0.02);
}

function satisfy(state: ClothState, a: number, b: number, rest: number): void {
  'worklet';
  const pos = state.pos, pinned = state.pinned;
  const ia = a * 3, ib = b * 3;
  let dx = pos[ib] - pos[ia];
  let dy = pos[ib + 1] - pos[ia + 1];
  let dz = pos[ib + 2] - pos[ia + 2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
  const diff = (dist - rest) / dist;
  const pa = pinned[a] === 1, pb = pinned[b] === 1;
  if (pa && pb) return;
  if (pa) {
    pos[ib] -= dx * diff;
    pos[ib + 1] -= dy * diff;
    pos[ib + 2] -= dz * diff;
  } else if (pb) {
    pos[ia] += dx * diff;
    pos[ia + 1] += dy * diff;
    pos[ia + 2] += dz * diff;
  } else {
    const h = diff * 0.5;
    pos[ia] += dx * h;
    pos[ia + 1] += dy * h;
    pos[ia + 2] += dz * h;
    pos[ib] -= dx * h;
    pos[ib + 1] -= dy * h;
    pos[ib + 2] -= dz * h;
  }
}

/** One fixed Verlet substep. `dt` should always be the same fixed value. */
export function stepCloth(
  state: ClothState,
  cfg: ClothConfig,
  dt: number,
  pointer: ClothPointer,
  opts: ClothOptions = CLOTH_DEFAULTS,
): void {
  'worklet';
  state.time += dt;
  const { pos, prev, pinned } = state;
  const n = particleCount(cfg);
  const dt2 = dt * dt;

  for (let i = 0; i < n; i++) {
    if (pinned[i] === 1) continue;
    const k = i * 3;
    const x = pos[k], y = pos[k + 1], z = pos[k + 2];
    const vx = (x - prev[k]) * opts.damping;
    const vy = (y - prev[k + 1]) * opts.damping;
    const vz = (z - prev[k + 2]) * opts.damping;
    prev[k] = x;
    prev[k + 1] = y;
    prev[k + 2] = z;
    pos[k] = x + vx + swayAt(y, state.time, opts.windStrength) * dt2;
    pos[k + 1] = y + vy + opts.gravity * dt2;
    pos[k + 2] = z + vz + windAt(x, y, state.time, opts.windStrength) * dt2;
  }

  for (let it = 0; it < opts.iterations; it++) {
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const i = r * cfg.cols + c;
        if (c + 1 < cfg.cols) satisfy(state, i, i + 1, cfg.spacingX);
        if (r + 1 < cfg.rows) satisfy(state, i, i + cfg.cols, cfg.spacingY);
        if (c + 1 < cfg.cols && r + 1 < cfg.rows) {
          const diag = Math.sqrt(cfg.spacingX * cfg.spacingX + cfg.spacingY * cfg.spacingY);
          satisfy(state, i, i + cfg.cols + 1, diag);
          satisfy(state, i + 1, i + cfg.cols, diag);
        }
      }
    }
  }

  // Finger grab: pin the particle to the pointer after solving, keeping its
  // grabbed z. prev keeps the pre-pin position, so release hands the finger's
  // velocity to the cloth for a natural fling.
  if (pointer.active && state.grabbed >= 0) {
    const k = state.grabbed * 3;
    const s = cfg.perspective / (cfg.perspective + state.grabZ);
    prev[k] = pos[k];
    prev[k + 1] = pos[k + 1];
    prev[k + 2] = pos[k + 2];
    pos[k] = cfg.centerX + (pointer.x - cfg.centerX) / s;
    pos[k + 1] = cfg.centerY + (pointer.y - cfg.centerY) / s;
    pos[k + 2] = state.grabZ;
  }
}

/** Advance the cloth by a wall-clock frame delta using fixed substeps. */
export function stepClothFixed(
  state: ClothState,
  cfg: ClothConfig,
  frameDt: number,
  pointer: ClothPointer,
  opts: ClothOptions = CLOTH_DEFAULTS,
): void {
  'worklet';
  state.acc += Math.min(frameDt, 0.1); // clamp huge gaps (tab was hidden)
  while (state.acc > 1e-6) {
    const dt = Math.min(opts.fixedDt, state.acc);
    stepCloth(state, cfg, dt, pointer, opts);
    state.acc -= dt;
  }
}

/** Weak-perspective projection of one cloth point to screen coords. */
export function projectX(cfg: ClothConfig, x: number, z: number): number {
  'worklet';
  return cfg.centerX + (x - cfg.centerX) * (cfg.perspective / (cfg.perspective + z));
}

export function projectY(cfg: ClothConfig, y: number, z: number): number {
  'worklet';
  return cfg.centerY + (y - cfg.centerY) * (cfg.perspective / (cfg.perspective + z));
}

/** Nearest grabbable (unpinned) particle to a screen point, or -1. */
export function pickParticle(state: ClothState, cfg: ClothConfig, sx: number, sy: number, radius: number): number {
  'worklet';
  const n = particleCount(cfg);
  let best = -1;
  let bestD = radius * radius;
  for (let i = 0; i < n; i++) {
    if (state.pinned[i] === 1) continue;
    const k = i * 3;
    const dx = projectX(cfg, state.pos[k], state.pos[k + 2]) - sx;
    const dy = projectY(cfg, state.pos[k + 1], state.pos[k + 2]) - sy;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Render mesh: projected screen points per particle plus a brightness per
 * particle (0..1, 1 = fully lit) from central-difference normals against a
 * fixed top-left-front light. Writes into caller arrays; returns them.
 */
export function computeMesh(
  state: ClothState,
  cfg: ClothConfig,
  outXY: { x: number; y: number }[],
  outShade: number[],
  opts: ClothOptions = CLOTH_DEFAULTS,
): void {
  'worklet';
  const { pos } = state;
  const { cols, rows } = cfg;
  const n = particleCount(cfg);
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    outXY[i] = { x: projectX(cfg, pos[k], pos[k + 2]), y: projectY(cfg, pos[k + 1], pos[k + 2]) };
  }
  // Fixed key light from top-left-front, normalized.
  const llen = Math.sqrt(0.35 * 0.35 + 0.5 * 0.5 + 0.79 * 0.79);
  const lx = -0.35 / llen, ly = -0.5 / llen, lz = 0.79 / llen;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const l = (r * cols + Math.max(0, c - 1)) * 3;
      const ri = (r * cols + Math.min(cols - 1, c + 1)) * 3;
      const u = (Math.max(0, r - 1) * cols + c) * 3;
      const d = (Math.min(rows - 1, r + 1) * cols + c) * 3;
      const ax = pos[ri] - pos[l], ay = pos[ri + 1] - pos[l + 1], az = pos[ri + 2] - pos[l + 2];
      const bx = pos[d] - pos[u], by = pos[d + 1] - pos[u + 1], bz = pos[d + 2] - pos[u + 2];
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1e-6;
      nx /= len; ny /= len; nz /= len;
      const facing = nz < 0 ? -1 : 1;
      let shade = opts.ambient + opts.diffuse * Math.abs(nx * lx + ny * ly + nz * lz);
      if (facing < 0) shade *= opts.backDim;
      outShade[i] = Math.max(0, Math.min(1, shade));
    }
  }
}

/** Static triangle indices for the grid, reused every frame. */
export function clothIndices(cfg: ClothConfig): number[] {
  'worklet';
  const out: number[] = [];
  for (let r = 0; r < cfg.rows - 1; r++) {
    for (let c = 0; c < cfg.cols - 1; c++) {
      const i = r * cfg.cols + c;
      out.push(i, i + 1, i + cfg.cols, i + 1, i + cfg.cols + 1, i + cfg.cols);
    }
  }
  return out;
}

/** Static texture coordinates for the grid over an image of w x h px. */
export function clothUV(cfg: ClothConfig, w: number, h: number): { x: number; y: number }[] {
  'worklet';
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      out.push({ x: (c / (cfg.cols - 1)) * w, y: (r / (cfg.rows - 1)) * h });
    }
  }
  return out;
}

/** Total motion between pos and prev, for settle checks in tests. */
export function totalMotion(state: ClothState): number {
  'worklet';
  let s = 0;
  for (let i = 0; i < state.pos.length; i++) s += Math.abs(state.pos[i] - state.prev[i]);
  return s;
}
