// The dish is 130 mm wide and drawn 320 px wide (FERRO_W and FERRO_DISH_MM in ferroDesign.ts).
export const FERRO_PX_PER_MM = 320 / 130;

// Ferrofluid physics for the Rosensweig (normal-field) instability.
// Units: SI unless a name ends in Px or Mm.

export const MU0 = 4e-7 * Math.PI;
export const FERRO_DEFAULTS = {
  surfaceTension: 0.028, // N/m, typical oil-based ferrofluid
  density: 1190, // kg/m^3
  gravity: 9.81,
  relativePermeability: 2.0, // linear-response permeability at onset
  magnetDepthMm: 40, // magnet centre below the fluid surface
  peakRatio: 2.8, // M/Mc straight above the magnet at full strength
  maxHeightPx: 42, // saturated spike height
  baseRadiusFactor: 0.47, // spike base radius as a fraction of spacing
  strengthOmega: 13, // field ramp spring, rad/s
  strengthDamping: 0.45, // under-damped, so the spikes overshoot a little
  followOmega: 15, // magnet follows the finger with this spring
  followDamping: 0.9,
  fixedDt: 1 / 240,
};
export type FerroOptions = typeof FERRO_DEFAULTS;

// Capillary length: the scale where gravity and surface tension balance.
export function capillaryLength(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  return Math.sqrt(o.surfaceTension / (o.density * o.gravity));
}
// Critical wavelength of the instability: 2 pi times the capillary length.
export function criticalWavelength(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  return 2 * Math.PI * capillaryLength(o);
}
// Spikes sit on a hexagonal lattice. For a hexagonal pattern with wavenumber k
// the nearest-neighbour distance is 4 pi / (sqrt(3) k) = 2 lambda / sqrt(3).
export function latticeSpacingMm(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  return ((2 * criticalWavelength(o)) / Math.sqrt(3)) * 1000;
}
export function latticeSpacingPx(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  return latticeSpacingMm(o) * FERRO_PX_PER_MM;
}
// Cowley-Rosensweig onset: mu0 Mc^2 = 2 (1 + 1/mu_r) sqrt(rho g sigma).
export function criticalMagnetization(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  const p = Math.sqrt(o.density * o.gravity * o.surfaceTension);
  return Math.sqrt((2 * (1 + 1 / o.relativePermeability) * p) / MU0);
}

// |B| of a point dipole pointing up, at lateral distance r from the axis and
// depth d below the surface point: sqrt(4 d^4 + 5 d^2 r^2 + r^4) / R^5 with
// R^2 = r^2 + d^2 (times mu0 m / 4 pi). Normalised so r = 0 gives 1.
export function dipoleShape(r: number, d: number) {
  "worklet";
  const z2 = d * d;
  const r2 = r * r;
  const R2 = r2 + z2;
  return (0.5 * d * d * d * Math.sqrt(4 * z2 * z2 + 5 * z2 * r2 + r2 * r2)) / (R2 * R2 * Math.sqrt(R2));
}
// M / Mc at lateral distance rPx from the magnet at full strength.
export function fieldRatio(rPx: number, o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  return o.peakRatio * dipoleShape(rPx, o.magnetDepthMm * FERRO_PX_PER_MM);
}
// Spike height for field ratio m = M/Mc. Zero below onset; grows like the
// square root of the distance above onset (supercritical pitchfork), then
// saturates.
export function spikeHeight(m: number, o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  const eps = m * m - 1;
  if (eps <= 0) return 0;
  return o.maxHeightPx * (1 - 2 / (Math.exp(1.6 * Math.sqrt(eps)) + 1));
}
// Radius (px) inside which spikes stand at full magnet strength.
export function spikeRadiusPx(o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  let lo = 0;
  let hi = 600;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fieldRatio(mid, o) > 1) lo = mid;
    else hi = mid;
  }
  return lo;
}

export type FerroState = {
  mx: number;
  my: number;
  mvx: number;
  mvy: number;
  tx: number;
  ty: number;
  s: number;
  sv: number;
  down: number;
  seq: number;
};

export function createFerro(x: number, y: number): FerroState {
  "worklet";
  return { mx: x, my: y, mvx: 0, mvy: 0, tx: x, ty: y, s: 0, sv: 0, down: 0, seq: 0 };
}
export function ferroDown(st: FerroState, x: number, y: number) {
  "worklet";
  st.down = 1;
  st.tx = x;
  st.ty = y;
  if (st.s < 0.05) {
    st.mx = x;
    st.my = y;
    st.mvx = 0;
    st.mvy = 0;
  }
}
export function ferroMove(st: FerroState, x: number, y: number) {
  "worklet";
  st.tx = x;
  st.ty = y;
}
export function ferroRelease(st: FerroState) {
  "worklet";
  st.down = 0;
}
// Advance the magnet and the field strength. Returns true while anything moves.
export function ferroStep(st: FerroState, dt: number, o: FerroOptions = FERRO_DEFAULTS) {
  "worklet";
  const n = Math.max(1, Math.ceil(dt / o.fixedDt));
  const h = dt / n;
  const target = st.down ? 1 : 0;
  const ws = o.strengthOmega;
  const wf = o.followOmega;
  for (let i = 0; i < n; i++) {
    st.sv += (ws * ws * (target - st.s) - 2 * o.strengthDamping * ws * st.sv) * h;
    st.s += st.sv * h;
    if (st.s < 0) {
      st.s = 0;
      if (st.sv < 0) st.sv = 0;
    }
    st.mvx += (wf * wf * (st.tx - st.mx) - 2 * o.followDamping * wf * st.mvx) * h;
    st.mvy += (wf * wf * (st.ty - st.my) - 2 * o.followDamping * wf * st.mvy) * h;
    st.mx += st.mvx * h;
    st.my += st.mvy * h;
  }
  return (
    st.down === 1 ||
    Math.abs(st.s) > 1e-3 ||
    Math.abs(st.sv) > 1e-3 ||
    Math.abs(st.tx - st.mx) > 0.05 ||
    Math.abs(st.ty - st.my) > 0.05
  );
}
