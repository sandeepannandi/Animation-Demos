/**
 * Light on Painting - pure maths core (renderer-free).
 *
 * Two pieces:
 *  1. A Verlet rope the light bulb hangs from. Fixed-timestep integration so
 *     the motion is identical on web and native and independent of frame rate.
 *  2. A per-pixel relighting pass. A painting is an albedo buffer plus an
 *     authored depth map; each pixel is lit from the bulb position with
 *     lambert + distance falloff, and a short march through the depth map
 *     toward the bulb produces shadows.
 *
 * Everything here is plain TS so it can be unit-tested in Node and shared by
 * the Skia shader (same constants) and the Canvas adapter (same code).
 */

export type Vec = { x: number; y: number };

export interface Rope {
  /** nodes[0] is the fixed anchor; nodes[nodes.length-1] is the bulb. */
  nodes: Vec[];
  prev: Vec[];
  rest: number;
}

export interface RopeOptions {
  anchor: Vec;
  segments: number;
  length: number;
}

export function createRope({ anchor, segments, length }: RopeOptions): Rope {
  const rest = length / segments;
  const nodes: Vec[] = [];
  const prev: Vec[] = [];
  for (let i = 0; i <= segments; i++) {
    nodes.push({ x: anchor.x, y: anchor.y + rest * i });
    prev.push({ x: anchor.x, y: anchor.y + rest * i });
  }
  return { nodes, prev, rest };
}

export interface StepOptions {
  /** Position the bulb is pulled toward while dragging, or null when free. */
  dragTarget: Vec | null;
  /** Verlet damping, 0..1. Lower = more energy kept. */
  damping: number;
  /** Gravity in px/s^2 (scene units). */
  gravity: number;
  /** Constraint solver iterations per substep. */
  iterations: number;
  /**
   * Cord stiffness, 0..1. 1 = inelastic (hard max length). Lower values make
   * a bungee-style cord that stretches past its rest length when dragged and
   * springs back on release.
   */
  elasticity: number;
}

const DEFAULT_STEP: StepOptions = {
  dragTarget: null,
  damping: 0.985,
  gravity: 1400,
  iterations: 40,
  elasticity: 1,
};

/** One fixed Verlet substep. `dt` should always be the same fixed value. */
export function stepRope(rope: Rope, dt: number, opts: Partial<StepOptions> = {}): void {
  const o: StepOptions = { ...DEFAULT_STEP, ...opts };
  const { nodes, prev, rest } = rope;
  const dt2 = dt * dt;

  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    const p = prev[i];
    const vx = (n.x - p.x) * o.damping;
    const vy = (n.y - p.y) * o.damping;
    p.x = n.x;
    p.y = n.y;
    n.x += vx;
    n.y += vy + o.gravity * dt2;
  }

  for (let k = 0; k < o.iterations; k++) {
    nodes[0].x = nodes[0].x; // anchor pinned in place below
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const diff = ((dist - rest) / dist) * o.elasticity;
      if (diff <= 0) continue; // a rope only pulls when taut; slack is free fall
      if (i === 0) {
        // anchor is immovable
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else {
        a.x += dx * diff * 0.5;
        a.y += dy * diff * 0.5;
        b.x -= dx * diff * 0.5;
        b.y -= dy * diff * 0.5;
      }
    }
  }

  if (o.dragTarget) {
    // Pin the bulb to the finger after solving: the cord stretches instead
    // of capping the drag. prev keeps the pre-pin position so release keeps
    // the finger's velocity for a natural fling.
    const bulb = nodes[nodes.length - 1];
    const pb = prev[prev.length - 1];
    pb.x = bulb.x;
    pb.y = bulb.y;
    bulb.x = o.dragTarget.x;
    bulb.y = o.dragTarget.y;
  }
}

/** Advance the rope by a wall-clock frame delta using fixed substeps. */
export function stepRopeFixed(
  rope: Rope,
  frameDt: number,
  opts: Partial<StepOptions> = {},
  fixedDt = 1 / 120,
): void {
  let t = Math.min(frameDt, 0.1); // clamp huge gaps (tab was hidden)
  while (t > 1e-6) {
    const dt = Math.min(fixedDt, t);
    stepRope(rope, dt, opts);
    t -= dt;
  }
}

/** Bulb position = last rope node. */
export function bulbPosition(rope: Rope): Vec {
  return rope.nodes[rope.nodes.length - 1];
}

/* ------------------------------ shading ------------------------------ */

export interface ShadeParams {
  size: number; // buffers are size x size
  albedo: Uint8ClampedArray; // RGBA
  depth: Float32Array; // 0..1, higher = closer to viewer
  bulb: Vec; // pixel coords in buffer space
  bulbZ: number; // bulb height above the painting plane, in depth units
  intensity: number;
  ambient: number;
  /** Light kept in full shadow, 0..1. Default 0.2. */
  shadowFloor?: number;
  out: Uint8ClampedArray; // RGBA, written
}

function sampleDepth(depth: Float32Array, size: number, x: number, y: number): number {
  const xi = x < 0 ? 0 : x >= size ? size - 1 : x | 0;
  const yi = y < 0 ? 0 : y >= size ? size - 1 : y | 0;
  return depth[yi * size + xi];
}

/**
 * Continuous occlusion of the segment pixel -> bulb: 1 = lit, 0 = blocked.
 * Bilinear depth sampling and a soft blocker ramp (instead of a binary step)
 * make shadow edges smooth gradients instead of stair-steps.
 */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function sampleDepthLinear(depth: Float32Array, size: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(size - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(size - 1, Math.floor(y)));
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const a = depth[y0 * size + x0], b = depth[y0 * size + x1];
  const c = depth[y1 * size + x0], d = depth[y1 * size + x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

export function softMarch(
  depth: Float32Array,
  size: number,
  px: number,
  py: number,
  pd: number,
  bulb: Vec,
  bulbZ: number,
  steps = 24,
): number {
  const dx = bulb.x - px;
  const dy = bulb.y - py;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.5) return 1;
  let occ = 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const ray = pd + (bulbZ - pd) * t;
    const dep = sampleDepthLinear(depth, size, px + dx * t, py + dy * t);
    occ = Math.min(occ, 1 - smoothstep(ray - 0.03, ray + 0.05, dep));
  }
  return occ;
}

/**
 * Penumbra: average several marches started at small offsets perpendicular
 * to the light direction. Returns 0 (fully shadowed) .. 1 (fully lit).
 */
export function shadowFactor(
  depth: Float32Array,
  size: number,
  px: number,
  py: number,
  pd: number,
  bulb: Vec,
  bulbZ: number,
): number {
  const dx = bulb.x - px;
  const dy = bulb.y - py;
  const dist = Math.hypot(dx, dy) || 1;
  const ox = (-dy / dist) * 1.1;
  const oy = (dx / dist) * 1.1;
  let lit = 0;
  for (const m of [0, 1, -1, 2, -2]) {
    lit += softMarch(depth, size, px + ox * m, py + oy * m, pd, bulb, bulbZ);
  }
  return lit / 5;
}

/** Relight the whole painting from one bulb position. */
export function shadeBuffer(p: ShadeParams): void {
  const { size, albedo, depth, bulb, bulbZ, intensity, ambient, out } = p;
  const inv = 1 / Math.max(1, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const d = depth[i];
      // surface normal from the depth gradient
      const gx = sampleDepth(depth, size, x + 1, y) - sampleDepth(depth, size, x - 1, y);
      const gy = sampleDepth(depth, size, x, y + 1) - sampleDepth(depth, size, x, y - 1);
      const nz = 1.6;
      const nl = Math.hypot(gx, gy, nz);
      const nx = -gx / nl;
      const ny = -gy / nl;
      const nnz = nz / nl;

      // light direction: pixel sits at depth d, bulb at bulbZ
      const lx = bulb.x - x;
      const ly = bulb.y - y;
      const lz = (bulbZ - d) / inv; // depth units -> pixels
      const ll = Math.hypot(lx, ly, lz);
      const lambert = Math.max(0, (nx * lx + ny * ly + nnz * lz) / ll);
      const falloff = 1 / (1 + (ll * ll) / (size * size * 0.9));
      const floor = p.shadowFloor ?? 0.2;
      const shadow = floor + (1 - floor) * shadowFactor(depth, size, x, y, d, bulb, bulbZ);
      const light = ambient + intensity * lambert * falloff * shadow;

      const a = i * 4;
      out[a] = albedo[a] * light;
      out[a + 1] = albedo[a + 1] * light;
      out[a + 2] = albedo[a + 2] * light;
      out[a + 3] = 255;
    }
  }
}
