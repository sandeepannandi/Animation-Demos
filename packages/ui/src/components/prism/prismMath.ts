// A light beam through a glass prism. Snell's law per wavelength, dispersion
// from Cauchy's equation. Geometry in pixels, wavelengths in nanometres.

export const PRISM_DEFAULTS = {
  cauchyA: 1.5046, // crown glass, close to BK7
  cauchyB: 0.0042, // um^2
  lambdaMinNm: 380,
  lambdaMaxNm: 700,
  lambdaRefNm: 550,
  monoLambdaNm: 589, // sodium, roughly the middle of the eye's range
  fanSamples: 16,
  followOmega: 14,
  followDamping: 0.85,
  tiltOmega: 9,
  tiltDamping: 0.7,
  tiltPerVelocity: 0.0011,
  tiltMax: 0.05, // rad, about 3 degrees of lean while dragging
  restTilt: 0.0436, // rad, about +2.5 degrees: a wide fan, short of TIR
  fixedDt: 1 / 240,
};
export type PrismOptions = typeof PRISM_DEFAULTS;

// Cauchy's equation: n = A + B / lambda^2, lambda in micrometres.
export function cauchyN(lambdaNm: number, o: PrismOptions = PRISM_DEFAULTS) {
  "worklet";
  const um = lambdaNm / 1000;
  return o.cauchyA + o.cauchyB / (um * um);
}

// Vector Snell refraction. I is the unit incident direction, N the unit normal
// with dot(I, N) < 0. Returns the unit transmitted direction, or null on total
// internal reflection.
export function refractVec(
  ix: number, iy: number, nx: number, ny: number, n1: number, n2: number,
): [number, number] | null {
  "worklet";
  const eta = n1 / n2;
  const cosI = -(ix * nx + iy * ny);
  const k = 1 - eta * eta * (1 - cosI * cosI);
  if (k < 0) return null;
  const c = eta * cosI - Math.sqrt(k);
  return [eta * ix + c * nx, eta * iy + c * ny];
}

export function reflectVec(ix: number, iy: number, nx: number, ny: number): [number, number] {
  "worklet";
  const d = 2 * (ix * nx + iy * ny);
  return [ix - d * nx, iy - d * ny];
}

// Approximate RGB for a spectral wavelength (Bruton's mapping, gamma 0.8).
export function wavelengthToRGB(lambdaNm: number): [number, number, number] {
  "worklet";
  let r = 0;
  let g = 0;
  let b = 0;
  const l = lambdaNm;
  if (l >= 380 && l < 440) { r = -(l - 440) / 60; b = 1; }
  else if (l >= 440 && l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l >= 490 && l < 510) { g = 1; b = -(l - 510) / 20; }
  else if (l >= 510 && l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l >= 580 && l < 645) { r = 1; g = -(l - 645) / 65; }
  else if (l >= 645 && l <= 780) { r = 1; }
  else return [0, 0, 0];
  let f = 1;
  if (l < 420) f = 0.3 + (0.7 * (l - 380)) / 40;
  else if (l > 700) f = 0.3 + (0.7 * (780 - l)) / 80;
  const gam = 0.8;
  return [Math.pow(r * f, gam), Math.pow(g * f, gam), Math.pow(b * f, gam)];
}

// Vertices of an equilateral triangle, apex up at angle 0, k = 0 apex then
// counterclockwise in screen coordinates (y down).
export function prismVertices(cx: number, cy: number, angle: number, side: number): number[] {
  "worklet";
  const R = side / Math.sqrt(3);
  const out: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = angle - Math.PI / 2 + (k * 2 * Math.PI) / 3;
    out.push(cx + R * Math.cos(a), cy + R * Math.sin(a));
  }
  return out;
}

// t of the first hit of ray o + t d on segment a-b with u in [0,1], else -1.
function raySegment(
  ox: number, oy: number, dx: number, dy: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  "worklet";
  const ex = bx - ax;
  const ey = by - ay;
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-12) return -1;
  const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
  if (t > 1e-6 && u >= 0 && u <= 1) return t;
  return -1;
}

function signedAngle(ax: number, ay: number, bx: number, by: number) {
  "worklet";
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

export type PrismTrace = {
  hit: boolean;
  entryX: number;
  entryY: number;
  reflX: number;
  reflY: number;
  internal: number[]; // flat polyline of the reference path inside the glass
  fanOn: boolean;
  mono: boolean;
  fanX: number;
  fanY: number;
  refDX: number;
  refDY: number;
  phi0: number; // exit angle of the red end, relative to the reference ray
  phi1: number; // exit angle of the violet end
  lut: number[]; // wavelength at s = i/15 between phi0 and phi1
  bounces: number; // internal reflections of the reference path
};

// Trace a beam through the prism per wavelength. The entry point is geometric
// and shared by all wavelengths; inside, each wavelength refracts on its own.
// On total internal reflection the ray reflects once and tries the next face.
export function tracePrism(
  ox: number, oy: number, dx: number, dy: number,
  cx: number, cy: number, angle: number, side: number,
  mono: boolean,
  o: PrismOptions = PRISM_DEFAULTS,
): PrismTrace {
  "worklet";
  const none: PrismTrace = {
    hit: false, entryX: 0, entryY: 0, reflX: 1, reflY: 0, internal: [],
    fanOn: false, mono, fanX: 0, fanY: 0, refDX: 1, refDY: 0,
    phi0: 0, phi1: 0, lut: [], bounces: 0,
  };
  const v = prismVertices(cx, cy, angle, side);
  const gx = (v[0] + v[2] + v[4]) / 3;
  const gy = (v[1] + v[3] + v[5]) / 3;
  // Edges with outward normals.
  const ex: number[] = [];
  const ey: number[] = [];
  const nx: number[] = [];
  const ny: number[] = [];
  for (let k = 0; k < 3; k++) {
    const ax = v[2 * k];
    const ay = v[2 * k + 1];
    const bx = v[2 * ((k + 1) % 3)];
    const by = v[2 * ((k + 1) % 3) + 1];
    let ux = -(by - ay);
    let uy = bx - ax;
    const mx = (ax + bx) / 2 - gx;
    const my = (ay + by) / 2 - gy;
    if (ux * mx + uy * my < 0) {
      ux = -ux;
      uy = -uy;
    }
    const len = Math.hypot(ux, uy);
    ex.push(ax, ay, bx, by);
    nx.push(ux / len);
    ny.push(uy / len);
  }
  // Entry: nearest edge the beam hits from outside.
  let tBest = -1;
  let eBest = -1;
  for (let k = 0; k < 3; k++) {
    if (dx * nx[k] + dy * ny[k] >= 0) continue;
    const t = raySegment(ox, oy, dx, dy, ex[4 * k], ex[4 * k + 1], ex[4 * k + 2], ex[4 * k + 3]);
    if (t > 0 && (tBest < 0 || t < tBest)) {
      tBest = t;
      eBest = k;
    }
  }
  if (eBest < 0) return none;
  const px = ox + tBest * dx;
  const py = oy + tBest * dy;
  const refl = reflectVec(dx, dy, nx[eBest], ny[eBest]);

  const lambdas: number[] = [];
  if (mono) {
    lambdas.push(o.monoLambdaNm);
  } else {
    for (let i = 0; i <= 32; i++) lambdas.push(o.lambdaMinNm + ((o.lambdaMaxNm - o.lambdaMinNm) * i) / 32);
  }
  type Exit = { lam: number; ok: boolean; x: number; y: number; dx: number; dy: number };
  const exits: Exit[] = [];
  let refInternal: number[] = [];
  let bounces = 0;
  for (const lam of lambdas) {
    const n = cauchyN(lam, o);
    const tin = refractVec(dx, dy, nx[eBest], ny[eBest], 1, n);
    if (!tin) continue; // cannot happen entering glass
    let rx = tin[0];
    let ry = tin[1];
    let sx = px;
    let sy = py;
    let fromEdge = eBest;
    const path = [px, py];
    let out: [number, number] | null = null;
    let ox2 = sx;
    let oy2 = sy;
    let bounce = 0;
    for (let step = 0; step < 2 && !out; step++) {
      let tN = -1;
      let eN = -1;
      for (let k = 0; k < 3; k++) {
        if (k === fromEdge) continue;
        if (rx * nx[k] + ry * ny[k] <= 0) continue;
        const t = raySegment(sx, sy, rx, ry, ex[4 * k], ex[4 * k + 1], ex[4 * k + 2], ex[4 * k + 3]);
        if (t > 0 && (tN < 0 || t < tN)) {
          tN = t;
          eN = k;
        }
      }
      if (eN < 0) break;
      ox2 = sx + tN * rx;
      oy2 = sy + tN * ry;
      path.push(ox2, oy2);
      out = refractVec(rx, ry, -nx[eN], -ny[eN], n, 1);
      if (out) {
        exits.push({ lam, ok: true, x: ox2, y: oy2, dx: out[0], dy: out[1] });
      } else {
        const r = reflectVec(rx, ry, nx[eN], ny[eN]);
        rx = r[0];
        ry = r[1];
        sx = ox2;
        sy = oy2;
        fromEdge = eN;
        bounce++;
      }
    }
    if (!out) exits.push({ lam, ok: false, x: ox2, y: oy2, dx: rx, dy: ry });
    if (Math.abs(lam - (mono ? o.monoLambdaNm : o.lambdaRefNm)) < 1e-9) {
      refInternal = path;
      bounces = bounce;
    }
  }

  const okExits = exits.filter((e) => e.ok);
  const refLam = mono ? o.monoLambdaNm : o.lambdaRefNm;
  let ref = okExits.find((e) => Math.abs(e.lam - refLam) < 1e-9) ?? okExits[0];
  const base: PrismTrace = {
    ...none,
    hit: true,
    entryX: px,
    entryY: py,
    reflX: refl[0],
    reflY: refl[1],
    internal: refInternal,
    bounces,
  };
  if (!ref) return base;

  // Angles of the exiting rays relative to the reference ray.
  const withPhi = okExits.map((e) => ({
    lam: e.lam,
    phi: signedAngle(ref.dx, ref.dy, e.dx, e.dy),
  }));
  let phi0 = 0;
  let phi1 = 0;
  const lut: number[] = [];
  if (mono) {
    for (let i = 0; i < o.fanSamples; i++) lut.push(refLam);
  } else {
    const red = withPhi.reduce((a, b) => (a.lam > b.lam ? a : b));
    const violet = withPhi.reduce((a, b) => (a.lam < b.lam ? a : b));
    phi0 = red.phi;
    phi1 = violet.phi;
    const sorted = [...withPhi].sort((a, b) => a.phi - b.phi);
    for (let i = 0; i < o.fanSamples; i++) {
      const target = phi0 + ((phi1 - phi0) * i) / (o.fanSamples - 1);
      let lam = sorted[0].lam;
      for (let j = 0; j < sorted.length - 1; j++) {
        const a = sorted[j];
        const b2 = sorted[j + 1];
        const lo = Math.min(a.phi, b2.phi);
        const hi = Math.max(a.phi, b2.phi);
        if (target >= lo && target <= hi) {
          const f = (target - a.phi) / (b2.phi - a.phi || 1e-12);
          lam = a.lam + (b2.lam - a.lam) * f;
          break;
        }
        lam = target < lo ? sorted[0].lam : sorted[sorted.length - 1].lam;
      }
      lut.push(lam);
    }
  }
  return {
    ...base,
    fanOn: true,
    fanX: ref.x,
    fanY: ref.y,
    refDX: ref.dx,
    refDY: ref.dy,
    phi0,
    phi1,
    lut,
  };
}

export type PrismState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  gx: number;
  gy: number;
  tilt: number;
  tiltv: number;
  down: number;
  seq: number;
};

export function createPrism(x: number, y: number): PrismState {
  "worklet";
  return { x, y, vx: 0, vy: 0, tx: x, ty: y, gx: 0, gy: 0, tilt: PRISM_DEFAULTS.restTilt, tiltv: 0, down: 0, seq: 0 };
}
export function prismDown(st: PrismState, x: number, y: number) {
  "worklet";
  if (!st.down) {
    st.gx = st.x - x;
    st.gy = st.y - y;
  }
  st.down = 1;
  st.tx = x;
  st.ty = y;
}
export function prismMove(st: PrismState, x: number, y: number) {
  "worklet";
  st.tx = x;
  st.ty = y;
}
export function prismRelease(st: PrismState) {
  "worklet";
  st.down = 0;
}
// Advance the follow and tilt springs. Returns true while anything moves.
export function prismStep(st: PrismState, dt: number, o: PrismOptions = PRISM_DEFAULTS) {
  "worklet";
  const n = Math.max(1, Math.ceil(dt / o.fixedDt));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (st.down) {
      const tx2 = st.tx + st.gx;
      const ty2 = st.ty + st.gy;
      st.vx += (o.followOmega * o.followOmega * (tx2 - st.x) - 2 * o.followDamping * o.followOmega * st.vx) * h;
      st.vy += (o.followOmega * o.followOmega * (ty2 - st.y) - 2 * o.followDamping * o.followOmega * st.vy) * h;
      st.x += st.vx * h;
      st.y += st.vy * h;
    } else {
      const decay = Math.exp(-2 * o.followDamping * o.followOmega * h);
      st.vx *= decay;
      st.vy *= decay;
      st.x += st.vx * h;
      st.y += st.vy * h;
    }
    let target = o.restTilt;
    if (st.down) {
      const lean = st.vx * o.tiltPerVelocity;
      target += Math.max(-o.tiltMax, Math.min(o.tiltMax, lean));
    }
    st.tiltv += (o.tiltOmega * o.tiltOmega * (target - st.tilt) - 2 * o.tiltDamping * o.tiltOmega * st.tiltv) * h;
    st.tilt += st.tiltv * h;
  }
  return (
    st.down === 1 ||
    Math.abs(st.vx) > 0.05 ||
    Math.abs(st.vy) > 0.05 ||
    Math.abs(st.tiltv) > 1e-4 ||
    Math.abs(st.tilt - o.restTilt) > 1e-4
  );
}
