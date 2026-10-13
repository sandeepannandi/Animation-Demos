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
}

const DEFAULT_STEP: StepOptions = {
  dragTarget: null,
  damping: 0.985,
  gravity: 1400,
  iterations: 40,
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

  if (o.dragTarget) {
    const bulb = nodes[nodes.length - 1];
    // Follow with lag; cap the per-substep pull so a fast drag tugs the rope
    // instead of teleporting the bulb and overstretching the anchor link.
    let mx = (o.dragTarget.x - bulb.x) * 0.45;
    let my = (o.dragTarget.y - bulb.y) * 0.45;
    const mag = Math.hypot(mx, my);
    const cap = rest * 0.4;
    if (mag > cap) {
      mx *= cap / mag;
      my *= cap / mag;
    }
    bulb.x += mx;
    bulb.y += my;
  }

  for (let k = 0; k < o.iterations; k++) {
    nodes[0].x = nodes[0].x; // anchor pinned in place below
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const diff = (dist - rest) / dist;
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
  out: Uint8ClampedArray; // RGBA, written
}

function sampleDepth(depth: Float32Array, size: number, x: number, y: number): number {
  const xi = x < 0 ? 0 : x >= size ? size - 1 : x | 0;
  const yi = y < 0 ? 0 : y >= size ? size - 1 : y | 0;
  return depth[yi * size + xi];
}

/**
 * Is the segment pixel -> bulb blocked by raised geometry? March toward the
 * bulb; if any depth sample pokes above the light ray, the pixel is shadowed.
 */
export function inShadow(
  depth: Float32Array,
  size: number,
  px: number,
  py: number,
  pd: number,
  bulb: Vec,
  bulbZ: number,
  steps = 24,
): boolean {
  const dx = bulb.x - px;
  const dy = bulb.y - py;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.5) return false;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = px + dx * t;
    const y = py + dy * t;
    const ray = pd + (bulbZ - pd) * t; // ray height above the plane
    if (sampleDepth(depth, size, x, y) > ray + 0.012) return true;
  }
  return false;
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
      const falloff = 1 / (1 + (ll * ll) / (size * size * 0.55));
      const shadow = inShadow(depth, size, x, y, d, bulb, bulbZ) ? 0.12 : 1;
      const light = ambient + intensity * lambert * falloff * shadow;

      const a = i * 4;
      out[a] = albedo[a] * light;
      out[a + 1] = albedo[a + 1] * light;
      out[a + 2] = albedo[a + 2] * light;
      out[a + 3] = 255;
    }
  }
}
