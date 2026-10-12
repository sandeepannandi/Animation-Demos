// Pure geometry for the Glass Lens. Every function is a worklet so Skia and
// Reanimated can call it on the UI thread; plain JS (tests, web preview) ignores the tag.
export type LensConfig = { width: number; height: number; radius: number; strength: number; aberration: number };
export type LensPoint = { x: number; y: number };

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
// The lens centre stays inside the box. A bad point falls back to the middle.
export function lensTarget(x: number, y: number, width: number, height: number): LensPoint {
  'worklet';
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: width / 2, y: height / 2 };
  return { x: clamp(x, 0, width), y: clamp(y, 0, height) };
}
// The lens trails the finger on a spring. The gap between the two stretches it along the way it travels.
export const MAX_STRETCH = 0.38;
export function stretchFrom(cx: number, cy: number, tx: number, ty: number, reduce: boolean) {
  'worklet';
  const dx = tx - cx, dy = ty - cy, lag = Math.sqrt(dx * dx + dy * dy);
  if (reduce || lag < 0.5) return { stretch: 0, ax: 1, ay: 0 };
  return { stretch: Math.min(MAX_STRETCH, lag / 240), ax: dx / lag, ay: dy / lag };
}
// Everything the shader needs, in the order the SkSL declares it. `grow` is 0 (hidden) to 1 (full size).
export function lensUniforms(cx: number, cy: number, tx: number, ty: number, grow: number, reduce: boolean, cfg: LensConfig) {
  'worklet';
  const s = stretchFrom(cx, cy, tx, ty, reduce);
  return {
    center: [cx, cy],
    radius: cfg.radius * clamp(grow, 0, 1.3),
    strength: cfg.strength,
    aberration: reduce ? 0 : cfg.aberration,
    axis: [s.ax, s.ay],
    stretch: s.stretch,
  };
}
// Distance in the lens's own (stretched) space. 1 is the rim.
export function lensDistance(px: number, py: number, u: ReturnType<typeof lensUniforms>) {
  'worklet';
  const dx = px - u.center[0], dy = py - u.center[1];
  const along = dx * u.axis[0] + dy * u.axis[1];
  const across = -dx * u.axis[1] + dy * u.axis[0];
  const a = along / (1 + u.stretch), b = across * (1 + u.stretch * 0.5);
  return Math.sqrt(a * a + b * b);
}
export function smoothstep(a: number, b: number, x: number) {
  'worklet';
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
// Scale applied to the offset from the centre when sampling the backdrop.
// Below 1 magnifies. The dome is strongest in the middle and eases to 1 at the rim, where a bevel bends the view back out.
export function sampleScale(n: number, strength: number) {
  'worklet';
  const dome = strength * (1 - n * n);
  const bevel = smoothstep(0.78, 1, n) * 0.18;
  return 1 - dome + bevel;
}
// One pixel of the lens in plain JS. The web preview runs this; the SkSL mirrors it.
// r, g and b are the three sample positions (colour fringes), `cover` is how much of the lens is here, `light` the rim highlight, `shadow` the soft drop shadow outside.
export function samplePoint(px: number, py: number, u: ReturnType<typeof lensUniforms>) {
  'worklet';
  const R = u.radius;
  if (R < 0.5) return { r: { x: px, y: py }, g: { x: px, y: py }, b: { x: px, y: py }, cover: 0, light: 0, shadow: 0 };
  const dx = px - u.center[0], dy = py - u.center[1];
  const d = lensDistance(px, py, u);
  const n = d / R;
  const cover = 1 - smoothstep(R - 1.5, R, d);
  const shadow = n > 1 ? Math.exp(-(d - R) / (0.28 * R)) * 0.22 : 0;
  const s = sampleScale(Math.min(n, 1), u.strength);
  const fringe = u.aberration * (0.4 + Math.min(n, 1));
  const at = (k: number) => ({ x: u.center[0] + dx * k, y: u.center[1] + dy * k });
  const bevel = smoothstep(0.78, 1, Math.min(n, 1));
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const lx = -0.6, ly = -0.8;
  const facing = (dx / len) * lx + (dy / len) * ly;
  const rim = bevel * (Math.pow(Math.max(0, facing), 2) * 0.55 + Math.pow(Math.max(0, -facing), 3) * 0.25);
  const gloss = smoothstep(0.45, 0, Math.hypot(dx / R + 0.35, dy / R + 0.4)) * 0.12;
  return { r: at(s * (1 - fringe)), g: at(s), b: at(s * (1 + fringe)), cover, light: n <= 1 ? rim + gloss : 0, shadow };
}
// A spring step for the web preview and tests (the native side uses Reanimated withSpring). Semi-implicit Euler.
export function springStep(pos: number, vel: number, target: number, dt: number, stiffness = 170, damping = 15) {
  'worklet';
  const steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
  let p = pos, v = vel;
  for (let i = 0; i < steps; i++) { v += (stiffness * (target - p) - damping * v) * h; p += v * h; }
  return { pos: p, vel: v };
}
