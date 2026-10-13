// Pure maths for Blossom QR. No React Native imports, so it runs on the UI
// thread, on the site and in Node tests. Per-frame functions are worklets.

export type Modules = ReadonlyArray<ReadonlyArray<boolean>>;
export const QUIET_ZONE = 4;
export const SEAM = 0.7;

export type Scene = {
  size: number;
  /** Column and row of every module, row-major (all modules, dark and light). */
  cols: number[];
  rows: number[];
  /** Height in module units while the scene is a tree. */
  height: number[];
  /** Height of the underside. Canopy columns float above the trunk. */
  base: number[];
  /** r, g, b (0..1) per module as a tree and as a flat code. */
  tree: number[];
  flat: number[];
};

export type BlossomConfig = {
  canvas: number;
  cell: number;
  isoScale: number;
  lift: number;
  heightScale: number;
};

// Palette. Flat colours keep strong contrast against the cream ground.
export const CREAM = [0.97, 0.95, 0.89];
export const ROSE_DARK = [0.5, 0.12, 0.29];
export const GREEN_DARK = [0.05, 0.22, 0.12];
export const BARK_DARK = [0.2, 0.12, 0.08];
const ROSE_TREE = [0.86, 0.36, 0.55];
const BLOSSOM_PALE = [0.97, 0.76, 0.84];
const GRASS_TREE = [0.45, 0.72, 0.36];
const GROUND_TREE = [0.93, 0.89, 0.8];
const BARK_TREE = [0.43, 0.27, 0.17];

function hash(c: number, r: number) {
  let h = (c * 374761393 + r * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Turn a QR matrix into a blossom tree. Every module becomes a column. Inside
 * the canopy circle both dark and light modules rise (dark ones deeper rose),
 * the centre becomes a trunk, dark modules outside become low grass, and the
 * rest is flat ground. Flattening returns every module to its true colour.
 */
export function buildScene(modules: Modules): Scene {
  const n = modules.length;
  const mid = (n - 1) / 2;
  const canopy = n * 0.36;
  const scene: Scene = { size: n, cols: [], rows: [], height: [], base: [], tree: [], flat: [] };
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const dark = modules[r][c];
      const d = Math.hypot(c - mid, r - mid);
      let h = 0;
      let b = 0;
      let tree = dark ? GRASS_TREE : GROUND_TREE;
      if (d <= 1.5) {
        h = 17;
        tree = BARK_TREE;
      } else if (d <= canopy) {
        const t = 1 - d / canopy;
        b = 13 - 3.5 * (d / canopy);
        h = b + 2 + 6 * Math.pow(t, 0.6) + (hash(c, r) - 0.5) * 2;
        tree = dark ? ROSE_TREE : BLOSSOM_PALE;
      } else if (dark) {
        h = 0.5;
      }
      const flat = dark ? (d <= 1.5 ? BARK_DARK : d <= canopy ? ROSE_DARK : GREEN_DARK) : CREAM;
      scene.cols.push(c);
      scene.rows.push(r);
      scene.height.push(Math.max(0, h));
      scene.base.push(b);
      scene.tree.push(tree[0], tree[1], tree[2]);
      scene.flat.push(flat[0], flat[1], flat[2]);
    }
  }
  return scene;
}

export function makeConfig(canvas: number, size: number): BlossomConfig {
  const cell = canvas / (size + QUIET_ZONE * 2);
  return { canvas, cell, isoScale: (canvas * 0.72) / (size * 1.4142), lift: canvas * 0.06, heightScale: 1 };
}

export function clamp01(v: number) {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function ease(t: number) {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const ISO_YAW = Math.PI / 4;
// True isometric elevation is 35.26 degrees; top-down is 90.
export const ISO_PITCH = (35.26 * Math.PI) / 180;
export const FLAT_PITCH = Math.PI / 2;

export function wrapAngle(a: number) {
  'worklet';
  const t = a % (Math.PI * 2);
  return t > Math.PI ? t - Math.PI * 2 : t < -Math.PI ? t + Math.PI * 2 : t;
}

/** Local progress of one column: tall columns settle first, short ones last. */
export function columnProgress(progress: number, height: number, spread: number) {
  'worklet';
  const delay = spread * (1 - Math.min(1, height / 24));
  return clamp01((progress - delay) / (1 - spread));
}

/**
 * Builds the triangle list for one frame, back to front. `pos` gets x, y pairs
 * and `rgb` gets r, g, b per vertex. Returns the vertex count. At progress 1
 * the camera is top-down, every height is 0 and every module is one flat quad.
 */
export function layoutScene(progress: number, yaw: number, scene: Scene, cfg: BlossomConfig, spread: number, pos: number[], rgb: number[], shadow: number[]) {
  'worklet';
  const n = scene.size;
  const mid = (n - 1) / 2;
  const camera = ease(clamp01(progress));
  const theta = (ISO_YAW + wrapAngle(yaw - ISO_YAW)) * (1 - camera);
  const phi = ISO_PITCH + (FLAT_PITCH - ISO_PITCH) * camera;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const sp = Math.sin(phi);
  const cp = Math.cos(phi);
  const scale = cfg.isoScale + (cfg.cell - cfg.isoScale) * camera;
  const cx = cfg.canvas / 2;
  const cy = cfg.canvas / 2 + cfg.lift * (1 - camera) * 3.2;
  const total = n * n;
  const order: number[] = new Array(total);
  const depth: number[] = new Array(total);
  for (let i = 0; i < total; i += 1) {
    const x = scene.cols[i] - mid;
    const y = scene.rows[i] - mid;
    depth[i] = x * st + y * ct;
    order[i] = i;
  }
  order.sort((a, b) => depth[a] - depth[b]);
  // Soft ground shadow footprint: centre and radius for the caller.
  shadow[0] = cx;
  shadow[1] = cy + scale * n * 0.12 * (1 - camera);
  shadow[2] = scale * n * 0.42;
  shadow[3] = (1 - camera) * 0.28;
  let v = 0;
  const half = 0.5;
  const push = (px: number, py: number, r: number, g: number, b: number) => {
    pos[v * 2] = px;
    pos[v * 2 + 1] = py;
    rgb[v * 3] = r;
    rgb[v * 3 + 1] = g;
    rgb[v * 3 + 2] = b;
    v += 1;
  };
  for (let k = 0; k < total; k += 1) {
    const i = order[k];
    const x = scene.cols[i] - mid;
    const y = scene.rows[i] - mid;
    const h0 = scene.height[i];
    const t = columnProgress(progress, h0, spread);
    const e = ease(t);
    const h = h0 * (1 - e) * cfg.heightScale;
    const b0 = scene.base[i] * (1 - e) * cfg.heightScale;
    const tr = scene.tree[i * 3] + (scene.flat[i * 3] - scene.tree[i * 3]) * e;
    const tg = scene.tree[i * 3 + 1] + (scene.flat[i * 3 + 1] - scene.tree[i * 3 + 1]) * e;
    const tb = scene.tree[i * 3 + 2] + (scene.flat[i * 3 + 2] - scene.tree[i * 3 + 2]) * e;
    // Corner (dx, dy) at height z to screen. Seams are hidden by growing flat quads slightly.
    const grow = e >= 1 ? SEAM / scale : 0;
    const proj = (dx: number, dy: number, z: number, out: number[]) => {
      const gx = x + dx * (half + grow);
      const gy = y + dy * (half + grow);
      const rx = gx * ct - gy * st;
      const ry = gx * st + gy * ct;
      out[0] = cx + rx * scale;
      out[1] = cy + (ry * sp - z * cp) * scale;
    };
    const a = [0, 0];
    const b = [0, 0];
    const c = [0, 0];
    const d = [0, 0];
    proj(-1, -1, h, a);
    proj(1, -1, h, b);
    proj(1, 1, h, c);
    proj(-1, 1, h, d);
    if (h - b0 > 0.02 && cp > 0.02) {
      // Side faces that point toward the camera: rotated normal has a positive screen-down part.
      const sides: number[][] = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      for (let s = 0; s < 4; s += 1) {
        const nx = sides[s][0];
        const ny = sides[s][1];
        const rnx = nx * ct - ny * st;
        const rny = nx * st + ny * ct;
        if (rny <= 0.001) continue;
        // Light comes from the upper left. Faces turning right are darker.
        const shade = 0.78 - 0.24 * rnx - 0.1 * rny;
        const p0 = [0, 0];
        const p1 = [0, 0];
        const q0 = [0, 0];
        const q1 = [0, 0];
        const ax = nx !== 0 ? nx : -1;
        const ay = ny !== 0 ? ny : -1;
        const bx = nx !== 0 ? nx : 1;
        const by = ny !== 0 ? ny : 1;
        proj(ax, ay, h, p0);
        proj(bx, by, h, p1);
        proj(ax, ay, b0, q0);
        proj(bx, by, b0, q1);
        push(p0[0], p0[1], tr * shade, tg * shade, tb * shade);
        push(p1[0], p1[1], tr * shade, tg * shade, tb * shade);
        push(q1[0], q1[1], tr * shade, tg * shade, tb * shade);
        push(p0[0], p0[1], tr * shade, tg * shade, tb * shade);
        push(q1[0], q1[1], tr * shade, tg * shade, tb * shade);
        push(q0[0], q0[1], tr * shade, tg * shade, tb * shade);
      }
    }
    const lift = 1 + Math.min(0.12, h * 0.012);
    const R = Math.min(1, tr * lift);
    const G = Math.min(1, tg * lift);
    const B = Math.min(1, tb * lift);
    push(a[0], a[1], R, G, B);
    push(b[0], b[1], R, G, B);
    push(c[0], c[1], R, G, B);
    push(a[0], a[1], R, G, B);
    push(c[0], c[1], R, G, B);
    push(d[0], d[1], R, G, B);
  }
  return v;
}

/**
 * Axis-aligned squares for the finished code. The prism mesh draws each
 * module as two triangles, which leaves a faint anti-aliased seam along the
 * diagonal; solid squares keep the end state reliably scannable.
 * Fills rects with x, y (top left) and rgb with the module colour.
 */
export function flatSquares(scene: Scene, cfg: BlossomConfig, rects: number[], rgb: number[]) {
  'worklet';
  const n = scene.size;
  const mid = (n - 1) / 2;
  const half = cfg.cell / 2 + SEAM / 2;
  const cx = cfg.canvas / 2;
  const cy = cfg.canvas / 2;
  for (let i = 0; i < n * n; i += 1) {
    rects[i * 2] = cx + (scene.cols[i] - mid) * cfg.cell - half;
    rects[i * 2 + 1] = cy + (scene.rows[i] - mid) * cfg.cell - half;
    rgb[i * 3] = scene.flat[i * 3];
    rgb[i * 3 + 1] = scene.flat[i * 3 + 1];
    rgb[i * 3 + 2] = scene.flat[i * 3 + 2];
  }
  return n * n;
}
