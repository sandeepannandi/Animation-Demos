// Motion Blur pager geometry and physics. Pure functions shared by the React Native Skia component and the
// web preview, so both compute the same layout, snapping and blur mapping.
export const clamp = (v: number, lo = 0, hi = 1) => {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
};

// Pages sit side by side. scroll is in page units: scroll 2 means page 2 is centered.
// The x offset of page i from the viewport centre, in strides (multiply by stride for px).
export function pageOffset(index: number, scroll: number) {
  "worklet";
  return index - scroll;
}

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

// Blur span from content speed (px/s). Below ~150 px/s the picture stays sharp; a hard flick
// (~3400 px/s) reaches maxBlur. The curve is slightly eased so mid-speed swipes still read.
export function blurSpan(speed: number, maxBlur: number) {
  "worklet";
  const t = clamp((Math.abs(speed) - 150) / (3400 - 150));
  return maxBlur * Math.pow(t, 0.85);
}

// Chromatic fringe grows with the blur: red and blue split along the motion direction.
export function fringeSpan(blur: number) {
  "worklet";
  return blur > 2 ? Math.min(blur * 0.3, 12) : 0;
}

// The settle spring. Slow motion stretches the same spring in time: k = 4 plays it four times
// slower (stiffness / k^2, damping / k, and the initial velocity handed to it / k).
export function springConfig(slow: boolean) {
  const k = slow ? 4 : 1;
  return { damping: 26 / k, stiffness: 320 / (k * k), mass: 1 };
}
