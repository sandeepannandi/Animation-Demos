// Pure maths for Orbit QR. No React Native imports, so it runs on the UI thread,
// on the site and in Node tests. Every function that runs per frame is a worklet.

export type Modules = ReadonlyArray<ReadonlyArray<boolean>>;
export const QUIET_ZONE = 4;
export const WAVE_SPREAD = 0.42;
export const SEAM = 0.8;

export type OrbitData = {
  count: number;
  /** Sphere unit vector for each tile: x, y (down is positive), z (toward viewer). */
  sphere: number[];
  /** Module column and row of each tile. */
  cols: number[];
  rows: number[];
  size: number;
};

export type OrbitConfig = {
  canvas: number;
  radius: number;
  cell: number;
  origin: number;
  focal: number;
  tile: number;
  spread: number;
};

export function darkCells(modules: Modules) {
  const cols: number[] = [];
  const rows: number[] = [];
  modules.forEach((line, r) =>
    line.forEach((on, c) => {
      if (on) {
        cols.push(c);
        rows.push(r);
      }
    }),
  );
  return { cols, rows };
}

export function fibonacciSphere(n: number) {
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * golden;
    out.push(Math.sin(a) * ring, y, Math.cos(a) * ring);
  }
  return out;
}

/**
 * Pair every dark module with a sphere point. Rows of the code become latitude
 * bands of the sphere, and columns follow longitude, so the picture stays
 * coherent while it unfolds. Returns sphere vectors ordered by module.
 */
export function matchSphere(cols: number[], rows: number[]) {
  const n = cols.length;
  const sphere = fibonacciSphere(n);
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => sphere[a * 3 + 1] - sphere[b * 3 + 1],
  );
  const modules = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => rows[a] - rows[b] || cols[a] - cols[b],
  );
  const matched = new Array<number>(n * 3);
  let at = 0;
  while (at < n) {
    let end = at;
    while (end < n && rows[modules[end]] === rows[modules[at]]) end += 1;
    const band = order
      .slice(at, end)
      .sort(
        (a, b) =>
          Math.atan2(sphere[a * 3], sphere[a * 3 + 2]) -
          Math.atan2(sphere[b * 3], sphere[b * 3 + 2]),
      );
    const line = modules.slice(at, end);
    for (let k = 0; k < line.length; k += 1) {
      const m = line[k];
      const s = band[k];
      matched[m * 3] = sphere[s * 3];
      matched[m * 3 + 1] = sphere[s * 3 + 1];
      matched[m * 3 + 2] = sphere[s * 3 + 2];
    }
    at = end;
  }
  return matched;
}

export function buildData(modules: Modules): OrbitData {
  const { cols, rows } = darkCells(modules);
  return {
    count: cols.length,
    sphere: matchSphere(cols, rows),
    cols,
    rows,
    size: modules.length,
  };
}

export function makeConfig(
  canvas: number,
  size: number,
  count: number,
  reduced = false,
): OrbitConfig {
  const total = size + QUIET_ZONE * 2;
  const cell = canvas / total;
  const radius = canvas * 0.34;
  const tile =
    Math.sqrt((4 * Math.PI * radius * radius) / Math.max(1, count)) * 0.82;
  return {
    canvas,
    radius,
    cell,
    origin: cell * QUIET_ZONE,
    focal: canvas * 2.4,
    tile,
    spread: reduced ? 0 : WAVE_SPREAD,
  };
}

export function clamp01(v: number) {
  "worklet";
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function ease(t: number) {
  "worklet";
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function wrapAngle(a: number) {
  "worklet";
  const t = a % (Math.PI * 2);
  return t > Math.PI ? t - Math.PI * 2 : t < -Math.PI ? t + Math.PI * 2 : t;
}

/** Local progress of one tile, delayed by how far down the sphere it starts. */
export function tileProgress(progress: number, y: number, spread: number) {
  "worklet";
  const delay = spread * (y + 1) * 0.5;
  return clamp01((progress - delay) / (1 - spread));
}

export const SPHERE_FROM = [0.62, 0.84, 0.7];
export const SPHERE_TO = [0.1, 0.43, 0.3];
export const INK = [0.07, 0.14, 0.1];

/**
 * Writes five numbers per tile into `out`: centre x, centre y, side, landing
 * progress and depth. Fills `order` back to front. At progress 1
 * every tile sits exactly on its module cell.
 */
export function layoutTiles(
  progress: number,
  yaw: number,
  pitch: number,
  data: OrbitData,
  cfg: OrbitConfig,
  out: number[],
  order: number[],
) {
  "worklet";
  const half = cfg.canvas / 2;
  for (let i = 0; i < data.count; i += 1) {
    const sx0 = data.sphere[i * 3];
    const sy0 = data.sphere[i * 3 + 1];
    const sz0 = data.sphere[i * 3 + 2];
    const t = tileProgress(progress, sy0, cfg.spread);
    const e = ease(t);
    const turn = 1 - e;
    // Rotate by yaw then pitch, both unwinding to zero as the tile lands.
    const yawC = Math.cos(wrapAngle(yaw) * turn);
    const yawS = Math.sin(wrapAngle(yaw) * turn);
    const pitC = Math.cos(wrapAngle(pitch) * turn);
    const pitS = Math.sin(wrapAngle(pitch) * turn);
    const rx = sx0 * yawC + sz0 * yawS;
    const rz0 = -sx0 * yawS + sz0 * yawC;
    const ry = sy0 * pitC - rz0 * pitS;
    const rz = sy0 * pitS + rz0 * pitC;
    const qx = cfg.origin + (data.cols[i] + 0.5) * cfg.cell - half;
    const qy = cfg.origin + (data.rows[i] + 0.5) * cfg.cell - half;
    const lift = Math.sin(Math.PI * e) * cfg.radius * 0.28;
    const x = rx * cfg.radius * turn + qx * e;
    const y = ry * cfg.radius * turn + qy * e;
    const z = rz * cfg.radius * turn + lift;
    const persp = cfg.focal / (cfg.focal - z);
    const scale = persp * turn + e;
    out[i * 5] = half + x * scale;
    out[i * 5 + 1] = half + y * scale;
    // A little overlap at landing hides anti-aliasing seams between neighbours.
    out[i * 5 + 2] =
      (cfg.tile * turn + cfg.cell * e) * (persp * turn + e) + e * SEAM;
    out[i * 5 + 3] = e;
    out[i * 5 + 4] = z / cfg.radius;
    order[i] = i;
  }
  order.length = data.count;
  order.sort((a, b) => out[a * 5 + 4] - out[b * 5 + 4]);
}

/** Paper behind the code fades in late so contrast is full at the end. */
export function paperAlpha(progress: number) {
  "worklet";
  return clamp01((progress - 0.55) / 0.4);
}

export function tileColor(e: number, depth: number, out: number[]) {
  "worklet";
  const d = clamp01((depth + 1) / 2);
  for (let k = 0; k < 3; k += 1) {
    const sphere = SPHERE_TO[k] + (SPHERE_FROM[k] - SPHERE_TO[k]) * d;
    out[k] = sphere + (INK[k] - sphere) * e;
  }
}
