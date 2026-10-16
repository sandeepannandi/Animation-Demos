// GL Transitions pager geometry and physics. Pure functions shared by the React Native Skia
// component and the web preview, so both compute the same scrub, snapping and effect mapping.
export const clamp = (v: number, lo = 0, hi = 1) => {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
};

// Rubber band past the ends while dragging: overshoot counts at 0.38, like a stretched spring.
export function rubber(v: number, lo: number, hi: number) {
  "worklet";
  if (v < lo) return lo + (v - lo) * 0.38;
  if (v > hi) return hi + (v - hi) * 0.38;
  return v;
}

// Finger drag dx (px, positive right) maps to scroll: dragging left moves forward through pages.
export function dragScroll(start: number, dx: number, stride: number, last: number) {
  "worklet";
  return rubber(start - dx / Math.max(1, stride), 0, last);
}

// Where a released finger leaves the pager. A fast flick moves one page in the flick direction,
// even from just past the current page; a slow release settles to the nearest page.
export function snapTarget(scroll: number, velocityPages: number, last: number) {
  "worklet";
  const threshold = 0.5;
  let target: number;
  if (velocityPages > threshold) target = Math.floor(scroll + 0.02) + 1;
  else if (velocityPages < -threshold) target = Math.ceil(scroll - 0.02) - 1;
  else target = Math.round(scroll);
  return clamp(Math.round(target), 0, last);
}

// The four transition effects, in the order page hops cycle through them.
export const EFFECTS = ["ripple", "slices", "zoom", "melt"] as const;
export type TransitionEffect = (typeof EFFECTS)[number];
export const EFFECT_LABELS: Record<TransitionEffect, string> = {
  ripple: "Ripple",
  slices: "Slices",
  zoom: "Zoom",
  melt: "Melt",
};

// Each page-to-page hop uses the next effect in the cycle, so a long gallery sees them all.
export function effectForTransition(i: number): TransitionEffect {
  "worklet";
  return EFFECTS[((i % EFFECTS.length) + EFFECTS.length) % EFFECTS.length];
}

// Decompose a continuous scroll into the active hop: page `from`, page `to`, progress t in 0..1.
// At rest on the last page there is no hop: from == to == last, t == 0.
export function scrub(scroll: number, last: number) {
  "worklet";
  const s = clamp(scroll, 0, last);
  const from = Math.min(Math.floor(s), Math.max(0, last - 1));
  const t = last === 0 ? 0 : clamp(s - from, 0, 1);
  return { from, to: Math.min(from + 1, last), t };
}

// Slices effect: slice i of n starts `stagger` late; its local progress eases smoothstep.
export const SLICES = 7;
export const SLICE_STAGGER = 0.07;
export function sliceProgress(t: number, i: number, n = SLICES, stagger = SLICE_STAGGER) {
  "worklet";
  const local = clamp((t - i * stagger) / Math.max(1e-4, 1 - stagger * (n - 1)));
  return local * local * (3 - 2 * local);
}

// Melt effect: a deterministic per-column delay in [0, maxDelay), so the drip pattern never moves.
export const MELT_COLUMNS = 24;
export const MELT_MAX_DELAY = 0.45;
export function columnDelay(col: number, maxDelay = MELT_MAX_DELAY) {
  "worklet";
  const s = Math.sin(col * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * maxDelay;
}
export function meltProgress(t: number, col: number) {
  "worklet";
  const local = clamp((t - columnDelay(col)) / (1 - MELT_MAX_DELAY));
  return local * local * (3 - 2 * local);
}

// Zoom effect: the channel split peaks exactly mid-transition and vanishes at both ends.
export function channelSplit(t: number) {
  "worklet";
  return Math.sin(clamp(t) * Math.PI);
}

// Ripple effect: the wavefront eases out of and into the ends, 0..1 of the cover diagonal.
export function rippleFront(t: number) {
  "worklet";
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

// The settle spring. Slow motion stretches the same spring in time: k = 4 plays it four times
// slower (stiffness / k^2, damping / k, and the initial velocity handed to it / k).
export function springConfig(slow: boolean) {
  const k = slow ? 4 : 1;
  return { damping: 26 / k, stiffness: 320 / (k * k), mass: 1 };
}
