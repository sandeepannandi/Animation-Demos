// Pure 2D granular physics for the Sand Hourglass. Every function is a
// worklet so Reanimated can step the simulation on the UI thread; plain JS
// (tests, web preview) ignores the tag. Deterministic: spawn positions, radii
// and shades come from a seeded generator, so tests, native and web agree.
//
// Model: position-based dynamics (Müller et al., "Unified Particle Physics in
// Real-Time Applications"). Grains are predicted forward under gravity, then
// overlaps are solved positionally through a spatial hash; friction is a
// tangential position correction limited by the normal correction (Coulomb
// cone), which is what lets the sand heap hold its angle of repose instead of
// spreading flat. Velocity is re-derived from the displacement, so contacts
// are inelastic like real sand.

export const HOUR_CX = 160;
export const HOUR_TOP = 30;
export const HOUR_MID = 190;
export const HOUR_BOT = 350;
export const HOUR_TOP_HALF = 104;
export const HOUR_BOT_HALF = 104;
export const HOUR_NECK_HALF = 8;
export const HOUR_NECK_TUBE = 0;
// Bulb silhouette: how rounded the glass is. The profile is a rational
// curve, (1+a)t / (1+a t): 0 at the neck, 1 at the cap, concave (wide upper
// bulb) with a finite slope at the neck, so the funnel still converges
// steeply enough for sand to flow - a pure power curve flares into a shelf
// there and the sand arches and jams. Shared by the walls, the spawn
// lattice, the escape test and both renderers, so they can never disagree.
export const HOUR_BULB_CURVE = 0.86;
// Wall segments per bulb slope (a smooth curve needs several short chords).
export const HOUR_SLOPE_STEPS = 24;
// Number of straight walls: top cap, bottom cap, 2 x 2 segmented slopes.
export const HOUR_WALL_COUNT = 2 + HOUR_SLOPE_STEPS * 4;

/** Silhouette profile: half-width fraction along one bulb, t=1 at the wide
 *  cap and t=0 at the neck. */
export function hourProfile(t: number) {
  'worklet';
  const tt = clampNum(t, 0, 1);
  return ((1 + HOUR_BULB_CURVE) * tt) / (1 + HOUR_BULB_CURVE * tt);
}
export const GRAIN_COUNT = 2400;

export type SandOptions = {
  gravity: number;      // px/s^2 along the gravity angle
  airDrag: number;      // exponential velocity damping, 1/s
  friction: number;     // grain-grain Coulomb coefficient (positional)
  wallFriction: number; // grain-glass Coulomb coefficient (positional)
  stiffness: number;    // fraction of overlap corrected per iteration
  iterations: number;   // constraint passes per substep
  rolling: number;      // extra damping on contacting grains, 1/s
  maxSpeed: number;     // px/s, stability cap
  fixedDt: number;      // fixed substep, s
  throatCap: number;    // max speed along gravity inside the neck, px/s
  collimate: number;    // damping of across-gravity motion in the neck, 1/s
};

export const SAND_DEFAULTS: SandOptions = {
  gravity: 1500,
  airDrag: 0.35,
  friction: 0.55,
  wallFriction: 0.18,
  stiffness: 0.75,
  iterations: 2,
  rolling: 2.4,
  maxSpeed: 1600,
  fixedDt: 1 / 120,
  throatCap: 22,
  collimate: 9,
};

// A real hourglass meters sand through a tiny orifice: grains exit slowly
// (Beverloo) and the stream below contracts as it accelerates. The wide V
// neck alone would flood, so inside the throat band we cap velocity along
// gravity (the orifice meters the flow) and damp the across-stream motion
// (the hole collimates it). Grains queue above the neck like a real funnel.
export const HOUR_THROAT = 12;

// Gravity-direction spring: the hourglass "turns" with a little inertia.
const ANGLE_SPRING = { k: 120, c: 17 };
// A drag can tilt gravity at most this far from the committed down direction;
// turning the glass over is the flip's job.
const DRAG_RANGE = 1.75;

export type SandState = {
  n: number;
  x: Float32Array;
  y: Float32Array;
  ox: Float32Array; // position at substep start (for velocity + friction)
  oy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  r: Float32Array;
  shade: Uint8Array;   // index into the design palette
  big: Uint8Array;     // 1 = larger visual bucket
  contact: Uint8Array; // touched something this substep
  walls: Float32Array; // 8 segments x [x1,y1,x2,y2,nx,ny], n points inward
  heads: Int32Array;   // spatial hash buckets
  next: Int32Array;
  cell: number;
  gridW: number;
  gridH: number;
  angle: number;     // current gravity direction, rad (PI/2 = screen down)
  angleV: number;
  downAngle: number; // committed down; flip adds PI
  dragAngle: number; // active drag target, or NaN when not dragging
  dragging: number;
  acc: number;       // fixed-timestep accumulator
  time: number;
  seq: number;       // last applied pointer event sequence (component-local)
  settled: number;   // 1 when spawned already settled in the lower bulb
};

export function clampNum(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

// mulberry32: small seeded generator, stable across platforms.
export function sandRandom(seed: number) {
  'worklet';
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wallSegment(out: Float32Array, slot: number, x1: number, y1: number, x2: number, y2: number, refX: number, refY: number) {
  'worklet';
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Two candidate normals; keep the one aimed at the interior reference point.
  let nx = -dy / len, ny = dx / len;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  if ((refX - mx) * nx + (refY - my) * ny < 0) { nx = -nx; ny = -ny; }
  const o = slot * 6;
  out[o] = x1; out[o + 1] = y1; out[o + 2] = x2; out[o + 3] = y2; out[o + 4] = nx; out[o + 5] = ny;
}

function buildWalls(): Float32Array {
  'worklet';
  const w = new Float32Array(HOUR_WALL_COUNT * 6);
  const cx = HOUR_CX, top = HOUR_TOP, mid = HOUR_MID, bot = HOUR_BOT;
  const th = HOUR_TOP_HALF, bh = HOUR_BOT_HALF;
  const upY = (top + mid) / 2, loY = (mid + bot) / 2;
  let slot = 0;
  wallSegment(w, slot++, cx - th, top, cx + th, top, cx, upY); // top cap
  // Segmented curved slopes, following the silhouette profile.
  for (let k = 0; k < HOUR_SLOPE_STEPS; k++) {
    // t = 0 at the neck, 1 at the wide cap; k climbs away from the neck.
    const t0 = k / HOUR_SLOPE_STEPS, t1 = (k + 1) / HOUR_SLOPE_STEPS;
    const y0 = mid - (mid - top) * t0;
    const y1 = mid - (mid - top) * t1;
    const h0 = HOUR_NECK_HALF + (th - HOUR_NECK_HALF) * hourProfile(t0);
    const h1 = HOUR_NECK_HALF + (th - HOUR_NECK_HALF) * hourProfile(t1);
    wallSegment(w, slot++, cx - h0, y0, cx - h1, y1, cx, upY); // upper left
    wallSegment(w, slot++, cx + h0, y0, cx + h1, y1, cx, upY); // upper right
    const ly0 = mid + (bot - mid) * t0;
    const ly1 = mid + (bot - mid) * t1;
    const l0 = HOUR_NECK_HALF + (bh - HOUR_NECK_HALF) * hourProfile(t0);
    const l1 = HOUR_NECK_HALF + (bh - HOUR_NECK_HALF) * hourProfile(t1);
    wallSegment(w, slot++, cx - l0, ly0, cx - l1, ly1, cx, loY); // lower left
    wallSegment(w, slot++, cx + l0, ly0, cx + l1, ly1, cx, loY); // lower right
  }
  wallSegment(w, slot++, cx - bh, bot, cx + bh, bot, cx, loY); // bottom cap
  return w;
}

/** Interior half-width of the upper bulb at height y (curved silhouette). */
export function upperHalfWidth(y: number) {
  'worklet';
  const t = clampNum((HOUR_MID - y) / (HOUR_MID - HOUR_TOP), 0, 1);
  return HOUR_NECK_HALF + (HOUR_TOP_HALF - HOUR_NECK_HALF) * hourProfile(t);
}

/** Interior half-width of the lower bulb at height y. */
export function lowerHalfWidth(y: number) {
  'worklet';
  const t = clampNum((y - HOUR_MID) / (HOUR_BOT - HOUR_MID), 0, 1);
  return HOUR_NECK_HALF + (HOUR_BOT_HALF - HOUR_NECK_HALF) * hourProfile(t);
}

export function createSand(opts: SandOptions = SAND_DEFAULTS, n: number = GRAIN_COUNT, seed = 20261020, settled = false): SandState {
  'worklet';
  const rand = sandRandom(seed);
  const x = new Float32Array(n), y = new Float32Array(n);
  const ox = new Float32Array(n), oy = new Float32Array(n);
  const vx = new Float32Array(n), vy = new Float32Array(n);
  const r = new Float32Array(n);
  const shade = new Uint8Array(n), big = new Uint8Array(n);
  // Jittered lattice filling the upper bulb from just above the neck upward
  // (or the lower bulb from the floor upward when `settled`). Spacing must
  // exceed the largest grain diameter, or the first frame is a pressure
  // explosion instead of a settled pile.
  const spacing = 2.3;
  let i = 0;
  for (let row = 0; i < n; row++) {
    const yy = settled ? HOUR_BOT - 4 - row * spacing : HOUR_MID - HOUR_NECK_TUBE - 4 - row * spacing;
    if (settled ? yy < HOUR_MID + HOUR_NECK_TUBE + 2 : yy < HOUR_TOP + 4) break; // bulb full
    const half = (settled ? lowerHalfWidth(yy) : upperHalfWidth(yy)) - 3;
    const offset = (row % 2) * (spacing / 2);
    for (let xx = HOUR_CX - half + offset; xx <= HOUR_CX + half && i < n; xx += spacing) {
      x[i] = xx + (rand() - 0.5) * 0.5;
      y[i] = yy + (rand() - 0.5) * 0.5;
      r[i] = 0.74 + rand() * 0.33; // 0.74 .. 1.07 px: fine sand
      // Real sand is mostly mid-tones with a few dark grains mixed in, not
      // an even four-way split.
      const sh = rand();
      shade[i] = sh < 0.34 ? 0 : sh < 0.67 ? 1 : sh < 0.9 ? 2 : 3;
      big[i] = rand() < 0.55 ? 1 : 0;
      i++;
    }
  }
  const placed = i;
  const cell = 3.2;
  const gridW = Math.ceil(340 / cell), gridH = Math.ceil(400 / cell);
  return {
    n: placed,
    x, y, ox, oy, vx, vy, r, shade, big,
    contact: new Uint8Array(placed),
    walls: buildWalls(),
    heads: new Int32Array(gridW * gridH),
    next: new Int32Array(Math.max(placed, 1)),
    cell, gridW, gridH,
    angle: Math.PI / 2,
    angleV: 0,
    downAngle: Math.PI / 2,
    dragAngle: NaN,
    dragging: 0,
    acc: 0,
    time: 0,
    seq: 0,
    settled: settled ? 1 : 0,
  };
}

/** Finger down or moved: tilt gravity toward the pointer, clamped near down. */
export function sandDragTo(s: SandState, px: number, py: number) {
  'worklet';
  let a = Math.atan2(py - HOUR_MID, px - HOUR_CX);
  // Shortest-arc offset from the committed down direction, clamped.
  let d = a - s.downAngle;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  d = clampNum(d, -DRAG_RANGE, DRAG_RANGE);
  s.dragAngle = s.downAngle + d;
  s.dragging = 1;
}

/** Finger up: gravity eases back to the committed down direction. */
export function sandReleaseDrag(s: SandState) {
  'worklet';
  s.dragging = 0;
  s.dragAngle = NaN;
}

/** Turn the hourglass over: the down direction rotates 180 degrees. */
export function sandFlip(s: SandState) {
  'worklet';
  s.downAngle += Math.PI;
}

function hashIndex(s: SandState, px: number, py: number) {
  'worklet';
  const cx = clampNum(Math.floor(px / s.cell), 0, s.gridW - 1);
  const cy = clampNum(Math.floor(py / s.cell), 0, s.gridH - 1);
  return cy * s.gridW + cx;
}

function solveSubstep(s: SandState, h: number, o: SandOptions) {
  'worklet';
  const n = s.n;
  const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
  const gx = ca * o.gravity;
  const gy = sa * o.gravity;
  const dragF = Math.exp(-o.airDrag * h);
  // Integrate: remember the substep-start position, then predict forward.
  for (let i = 0; i < n; i++) {
    s.contact[i] = 0;
    s.ox[i] = s.x[i];
    s.oy[i] = s.y[i];
    let vx = (s.vx[i] + gx * h) * dragF;
    let vy = (s.vy[i] + gy * h) * dragF;
    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > o.maxSpeed) { vx = (vx / sp) * o.maxSpeed; vy = (vy / sp) * o.maxSpeed; }
    s.vx[i] = vx;
    s.vy[i] = vy;
    s.x[i] += vx * h;
    s.y[i] += vy * h;
  }
  const stiff = o.stiffness, mu = o.friction, muW = o.wallFriction;
  for (let iter = 0; iter < o.iterations; iter++) {
    // Rebuild the spatial hash (linked lists per cell).
    s.heads.fill(-1);
    for (let i = 0; i < n; i++) {
      const c = hashIndex(s, s.x[i], s.y[i]);
      s.next[i] = s.heads[c];
      s.heads[c] = i;
    }
    // Grain-grain contacts, each unordered pair once (j > i).
    for (let i = 0; i < n; i++) {
      const xi = s.x[i], yi = s.y[i], ri = s.r[i];
      const cxi = clampNum(Math.floor(xi / s.cell), 0, s.gridW - 1);
      const cyi = clampNum(Math.floor(yi / s.cell), 0, s.gridH - 1);
      const x0 = Math.max(0, cxi - 1), x1 = Math.min(s.gridW - 1, cxi + 1);
      const y0 = Math.max(0, cyi - 1), y1 = Math.min(s.gridH - 1, cyi + 1);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          let j = s.heads[cy * s.gridW + cx];
          while (j >= 0) {
            if (j > i) {
              const xi2 = s.x[i], yi2 = s.y[i];
              const dx = s.x[j] - xi2, dy = s.y[j] - yi2;
              const min = ri + s.r[j];
              const d2 = dx * dx + dy * dy;
              if (d2 < min * min && d2 > 1e-12) {
                const d = Math.sqrt(d2);
                const nx = dx / d, ny = dy / d;
                const pen = (min - d) * 0.5 * stiff;
                s.x[i] -= nx * pen; s.y[i] -= ny * pen;
                s.x[j] += nx * pen; s.y[j] += ny * pen;
                // Coulomb friction: cancel tangential relative displacement,
                // capped by the normal correction just applied.
                const rvx = (s.x[j] - s.ox[j]) - (s.x[i] - s.ox[i]);
                const rvy = (s.y[j] - s.oy[j]) - (s.y[i] - s.oy[i]);
                const rt = rvx * -ny + rvy * nx;
                const lim = mu * pen;
                const c = clampNum(rt * 0.5, -lim, lim);
                s.x[i] += -ny * c; s.y[i] += nx * c;
                s.x[j] -= -ny * c; s.y[j] -= nx * c;
                s.contact[i] = 1;
                s.contact[j] = 1;
              }
            }
            j = s.next[j];
          }
        }
      }
    }
    // Glass walls: push back along the inward normal, with the same
    // tangential friction cap so sand can grip the glass.
    for (let i = 0; i < n; i++) {
      const ri = s.r[i];
      for (let w = 0; w < HOUR_WALL_COUNT; w++) {
        const b = w * 6;
        const ax = s.walls[b], ay = s.walls[b + 1], bx = s.walls[b + 2], by = s.walls[b + 3];
        const nx = s.walls[b + 4], ny = s.walls[b + 5];
        const abx = bx - ax, aby = by - ay;
        const len2 = abx * abx + aby * aby;
        if (len2 < 1e-9) continue;
        let t = ((s.x[i] - ax) * abx + (s.y[i] - ay) * aby) / len2;
        t = clampNum(t, 0, 1);
        const px = s.x[i] - (ax + abx * t), py = s.y[i] - (ay + aby * t);
        const dn = px * nx + py * ny;
        // Gate on Euclidean proximity: grains far behind this wall (e.g. in the
        // other bulb) are ignored, but a fast grain that tunneled up to one
        // substep of travel past the glass is still restored. The reach is
        // deliberately short: a long reach from both bulbs' slopes meets at the
        // neck midline and parks grains there.
        const reach = ri + 7;
        if (dn < ri && px * px + py * py < reach * reach) {
          const push = ri - dn;
          s.x[i] += nx * push;
          s.y[i] += ny * push;
          const rvx = s.x[i] - s.ox[i], rvy = s.y[i] - s.oy[i];
          const rt = rvx * -ny + rvy * nx;
          const lim = muW * push;
          const c = clampNum(rt, -lim, lim);
          s.x[i] -= -ny * c;
          s.y[i] -= nx * c;
          s.contact[i] = 1;
        }
      }
    }
  }
  // Orifice metering: inside the neck band, cap each grain's per-substep
  // travel along gravity and damp its across-stream travel. Velocity caps
  // alone cannot hold back the queue - the positional solver would just
  // shove grains through the neck - so the limit is applied to the accepted
  // displacement itself, and the velocity re-derivation below inherits it.
  // Grains above the band queue up like sand pressing on a real orifice;
  // below it they free-fall and the stream contracts as it accelerates.
  const capStep = o.throatCap * h;
  for (let i = 0; i < n; i++) {
    if (Math.abs(s.y[i] - HOUR_MID) >= HOUR_THROAT) continue;
    const dx = s.x[i] - s.ox[i], dy = s.y[i] - s.oy[i];
    const along = dx * ca + dy * sa;
    const perp = dx * -sa + dy * ca;
    const a2 = Math.min(along, capStep);
    const p2 = perp * 0.35;
    s.x[i] = s.ox[i] + a2 * ca + p2 * -sa;
    s.y[i] = s.oy[i] + a2 * sa + p2 * ca;
    s.contact[i] = 1;
  }
  // Re-derive velocities from the accepted displacements (inelastic, like
  // sand), then a touch of rolling resistance on grains that touched.
  const invH = 1 / h;
  const rollF = Math.exp(-o.rolling * h);
  for (let i = 0; i < n; i++) {
    let vx = (s.x[i] - s.ox[i]) * invH;
    let vy = (s.y[i] - s.oy[i]) * invH;
    if (s.contact[i]) { vx *= rollF; vy *= rollF; }
    const sp2 = vx * vx + vy * vy;
    if (sp2 > o.maxSpeed * o.maxSpeed) { const f = o.maxSpeed / Math.sqrt(sp2); vx *= f; vy *= f; }
    if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.y[i])) {
      // Never let one bad grain spread NaNs through the hash.
      s.x[i] = HOUR_CX;
      s.y[i] = HOUR_MID - 12;
      vx = 0;
      vy = 0;
    }
    s.vx[i] = vx;
    s.vy[i] = vy;
  }
}

/** Advance the sim by a wall-clock frame delta using fixed substeps. */
export function stepSandFrame(s: SandState, frameDt: number, o: SandOptions = SAND_DEFAULTS) {
  'worklet';
  // Gravity direction spring (once per frame): drag wins, otherwise rest.
  const target = s.dragging ? s.dragAngle : s.downAngle;
  s.angleV += (ANGLE_SPRING.k * (target - s.angle) - ANGLE_SPRING.c * s.angleV) * frameDt;
  s.angle += s.angleV * frameDt;
  s.acc += Math.min(frameDt, 0.06);
  let steps = 0;
  while (s.acc >= o.fixedDt && steps < 6) {
    solveSubstep(s, o.fixedDt, o);
    s.acc -= o.fixedDt;
    steps++;
  }
  if (steps === 6) s.acc = 0; // dropped time after a long stall
  s.time += frameDt;
}

/** The glass outline as a flat [x0,y0, x1,y1, ...] polygon, clockwise from
 *  the top-left corner. Both renderers draw exactly this, so the visible
 *  glass always matches the walls the physics uses. */
export function hourGlassOutline(): number[] {
  'worklet';
  const cx = HOUR_CX;
  const steps = HOUR_SLOPE_STEPS;
  const poly: number[] = [cx - HOUR_TOP_HALF, HOUR_TOP, cx + HOUR_TOP_HALF, HOUR_TOP];
  for (let k = steps - 1; k >= 0; k--) {
    const y = HOUR_MID - (HOUR_MID - HOUR_TOP) * (k / steps);
    poly.push(cx + upperHalfWidth(y), y);
  }
  for (let k = 1; k <= steps; k++) {
    const y = HOUR_MID + (HOUR_BOT - HOUR_MID) * (k / steps);
    poly.push(cx + lowerHalfWidth(y), y);
  }
  poly.push(cx - HOUR_BOT_HALF, HOUR_BOT);
  for (let k = steps - 1; k >= 1; k--) {
    const y = HOUR_MID + (HOUR_BOT - HOUR_MID) * (k / steps);
    poly.push(cx - lowerHalfWidth(y), y);
  }
  for (let k = 0; k <= steps - 1; k++) {
    const y = HOUR_MID - (HOUR_MID - HOUR_TOP) * (k / steps);
    poly.push(cx - upperHalfWidth(y), y);
  }
  return poly;
}

// --- Test / debug helpers -------------------------------------------------

/** Highest |velocity| of any grain, px/s. */
export function sandMaxSpeed(s: SandState) {
  'worklet';
  let m = 0;
  for (let i = 0; i < s.n; i++) {
    const sp = Math.abs(s.vx[i]) + Math.abs(s.vy[i]);
    if (sp > m) m = sp;
  }
  return m;
}

/** Grains whose center is above the neck (in the upper bulb or the neck). */
export function sandCountAbove(s: SandState, y: number = HOUR_MID) {
  'worklet';
  let c = 0;
  for (let i = 0; i < s.n; i++) if (s.y[i] < y) c++;
  return c;
}

/** Grains that ended up outside the glass by more than a small tolerance.
 *  Point-in-polygon over the hourglass silhouette, then a boundary-distance
 *  margin, so grains resting against a corner are not false positives. */
export function sandEscaped(s: SandState, tol = 2) {
  'worklet';
  // Silhouette polygon (clockwise), sampled along the curved profile.
  const poly = hourGlassOutline();
  const m = poly.length / 2;
  let bad = 0;
  for (let i = 0; i < s.n; i++) {
    const xi = s.x[i], yi = s.y[i];
    let inside = false;
    for (let a = 0, b = m - 1; a < m; b = a++) {
      const ax = poly[a * 2], ay = poly[a * 2 + 1], bx = poly[b * 2], by = poly[b * 2 + 1];
      if (ay > yi !== by > yi && xi < ((bx - ax) * (yi - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) continue;
    let best = 1e9;
    for (let w = 0; w < HOUR_WALL_COUNT; w++) {
      const b = w * 6;
      const abx = s.walls[b + 2] - s.walls[b], aby = s.walls[b + 3] - s.walls[b + 1];
      const len2 = abx * abx + aby * aby;
      if (len2 < 1e-9) continue;
      let t = ((xi - s.walls[b]) * abx + (yi - s.walls[b + 1]) * aby) / len2;
      t = clampNum(t, 0, 1);
      const px = xi - (s.walls[b] + abx * t), py = yi - (s.walls[b + 1] + aby * t);
      const d2 = px * px + py * py;
      if (d2 < best) best = d2;
    }
    if (Math.sqrt(best) - s.r[i] > tol) bad++;
  }
  return bad;
}

/** Mean |velocity| across grains, px/s (L1). */
export function sandAvgSpeed(s: SandState) {
  'worklet';
  let sum = 0;
  for (let i = 0; i < s.n; i++) sum += Math.abs(s.vx[i]) + Math.abs(s.vy[i]);
  return sum / s.n;
}

/**
 * Surface slope of the settled pile in the lower bulb: |rise/run| of a linear
 * fit over the topmost grain in 6 px columns on one flank. ~tan(angle of
 * repose). Returns 0 when there is nothing to measure.
 */
export function sandPileSlope(s: SandState) {
  'worklet';
  const bin = 6;
  const cols = Math.ceil((HOUR_BOT_HALF * 2) / bin);
  const top = new Float32Array(cols).fill(1e9);
  for (let i = 0; i < s.n; i++) {
    if (s.y[i] < HOUR_MID) continue;
    const c = clampNum(Math.floor((s.x[i] - (HOUR_CX - HOUR_BOT_HALF)) / bin), 0, cols - 1);
    if (s.y[i] < top[c]) top[c] = s.y[i];
  }
  // Use the left flank: columns from the wall to the heap apex.
  let apex = 0;
  for (let c = 0; c < cols; c++) if (top[c] < top[apex]) apex = c;
  if (apex < 3) return 0;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
  for (let c = 0; c <= apex; c++) {
    if (top[c] > 1e8) continue;
    const px = c * bin + bin / 2;
    sx += px; sy += top[c]; sxx += px * px; sxy += px * top[c]; m++;
  }
  if (m < 3) return 0;
  const slope = (m * sxy - sx * sy) / (m * sxx - sx * sx);
  return Math.abs(slope);
}

/** Polylines for the glass's specular streaks, as flat [x, y, ...] arrays:
 *  a bright line running down the left of each bulb, inset from the wall. */
export function hourSheen(): number[][] {
  'worklet';
  const lines: number[][] = [];
  const up: number[] = [];
  for (let k = 0; k <= 10; k++) {
    const y = HOUR_TOP + 20 + ((HOUR_MID - HOUR_TOP - 48) * k) / 10;
    up.push(HOUR_CX - upperHalfWidth(y) + 9, y);
  }
  lines.push(up);
  const lo: number[] = [];
  for (let k = 0; k <= 10; k++) {
    const y = HOUR_MID + 26 + ((HOUR_BOT - HOUR_MID - 46) * k) / 10;
    lo.push(HOUR_CX - lowerHalfWidth(y) + 9, y);
  }
  lines.push(lo);
  return lines;
}
