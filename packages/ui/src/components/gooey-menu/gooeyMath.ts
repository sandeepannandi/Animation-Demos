// Pure geometry for the Gooey Menu. Every function is a worklet so Skia and
// Reanimated can call it on the UI thread; plain JS (tests, web preview) ignores the tag.
export type GooeyGeometry = {
  distance: number; mainRadius: number; itemRadius: number;
  start: number; end: number; stagger: number; originX: number; originY: number;
};
export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
// Angles are degrees from the +x axis, screen coordinates (-90 is straight up).
// The fan is limited to the upper half so items never open off the bottom edge.
export function fanAngles(start: number, end: number) {
  'worklet';
  const a = clamp(start, -180, 0), b = clamp(end, -180, 0);
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}
export function itemAngle(index: number, count: number, start: number, end: number) {
  'worklet';
  const fan = fanAngles(start, end);
  return count < 2 ? (fan.start + fan.end) / 2 : fan.start + ((fan.end - fan.start) * index) / (count - 1);
}
// Staggered per-item progress. `stagger` is the share of the timeline (0 to 0.6) over which
// item starts are spread. Every item still reaches 1 at progress 1. Spring overshoot is
// allowed up to 1.3.
export function itemProgress(progress: number, index: number, count: number, stagger: number) {
  'worklet';
  const spread = clamp(stagger, 0, 0.6), delay = count < 2 ? 0 : (spread * index) / (count - 1);
  return clamp((progress - delay) / (1 - delay), 0, 1.3);
}
export function itemPose(progress: number, index: number, count: number, g: GooeyGeometry) {
  'worklet';
  const t = itemProgress(progress, index, count, g.stagger);
  const angle = (itemAngle(index, count, g.start, g.end) * Math.PI) / 180;
  // Items start as a point inside the main circle and grow while they travel, so the
  // blur threshold pulls them out of it like a drop.
  const grow = clamp(t * 1.7, 0, 1);
  return { t, x: Math.cos(angle) * g.distance * t, y: Math.sin(angle) * g.distance * t, radius: g.itemRadius * grow * (1 + (t > 1 ? (t - 1) * 0.4 : 0)) };
}
export function mainRotation(progress: number) {
  'worklet';
  return clamp(progress, 0, 1.3) * 45;
}
export function layout(distance: number, mainRadius: number, itemRadius: number, pad: number) {
  const d = Math.max(0, distance), m = Math.max(1, mainRadius), r = Math.max(1, itemRadius), p = Math.max(0, pad);
  const originY = p + d + Math.max(r, m);
  return { width: 2 * (d + r + p), height: originY + m + p, originX: d + r + p, originY };
}
// Goo colour matrix: alpha' = gain * alpha - cut. Blurred circles that overlap rise past
// the threshold and merge; lone edges fall away to a crisp outline.
export function gooMatrix(gain = 24, cut = 11) {
  return [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, gain, -cut];
}
