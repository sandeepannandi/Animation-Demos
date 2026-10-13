export type Rect = { x: number; y: number; w: number; h: number };
export type Anchor = { index: number; v: number };
export const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(Number.isFinite(n) ? n : lo, lo), Math.max(lo, hi));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const cellSize = (width: number, columns: number, gap: number) => Math.max(1, (width - gap * (columns - 1)) / Math.max(1, columns));
export function tileRect(index: number, columns: number, width: number, gap: number): Rect {
  const c = Math.max(1, Math.round(columns)), s = cellSize(width, c, gap);
  return { x: (index % c) * (s + gap), y: Math.floor(index / c) * (s + gap), w: s, h: s };
}
export function contentHeight(count: number, columns: number, width: number, gap: number) {
  if (count <= 0) return 0;
  const c = Math.max(1, Math.round(columns)), s = cellSize(width, c, gap);
  return Math.ceil(count / c) * (s + gap) - gap;
}
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
/** Tile index under a content-space point. Points past the end clamp to the last tile. */
export function tileAtPoint(x: number, y: number, count: number, columns: number, width: number, gap: number) {
  if (count <= 0) return -1;
  const c = Math.max(1, Math.round(columns)), pitch = cellSize(width, c, gap) + gap;
  const col = clamp(Math.floor(x / pitch), 0, c - 1), row = Math.max(0, Math.floor(y / pitch));
  return clamp(row * c + col, 0, count - 1);
}
/** The tile under the fingers and how far down it the focal point sits (0 top, 1 bottom). */
export function anchorAt(y: number, count: number, columns: number, width: number, gap: number, x = 0): Anchor {
  const index = tileAtPoint(x, y, count, columns, width, gap), r = tileRect(index, columns, width, gap);
  return { index: Math.max(0, index), v: clamp((y - r.y) / r.h, 0, 1) };
}
/** Spread (ratio > 1) shows fewer, larger tiles. Pinch in (ratio < 1) shows more, smaller tiles. Returns a steps index. */
export function pinchTarget(stepIndex: number, ratio: number, steps: readonly number[]) {
  if (!(ratio > 0) || Math.abs(ratio - 1) < 0.002) return stepIndex;
  return clamp(stepIndex + (ratio > 1 ? -1 : 1), 0, steps.length - 1);
}
/** 0 at the starting layout, 1 once the finger spread has scaled the tile to the target size. */
export function pinchProgress(ratio: number, sizeFrom: number, sizeTo: number) {
  const full = sizeTo / sizeFrom - 1;
  return Math.abs(full) < 1e-6 ? 0 : clamp((ratio - 1) / full, 0, 1);
}
export const shouldCommit = (progress: number, threshold = 0.4) => progress >= threshold;
/** Scroll offset that keeps the anchor point of the anchor tile under the focal point while layouts blend. */
export function anchorScroll(anchor: Anchor, from: number, to: number, t: number, count: number, width: number, gap: number, focalY: number, viewportHeight: number) {
  const r = lerpRect(tileRect(anchor.index, from, width, gap), tileRect(anchor.index, to, width, gap), t);
  const total = lerp(contentHeight(count, from, width, gap), contentHeight(count, to, width, gap), t);
  return clamp(r.y + anchor.v * r.h - focalY, 0, total - viewportHeight);
}
/** Photos-style range paint: everything between the first and current tile takes the paint mode, the rest keeps its starting state. */
export function rangeSelection(ids: readonly string[], base: readonly string[], a: number, b: number, mode: 'add' | 'remove') {
  const lo = Math.min(a, b), hi = Math.max(a, b), painted = ids.slice(Math.max(0, lo), hi + 1), out = new Set(base);
  painted.forEach(id => { if (mode === 'add') out.add(id); else out.delete(id); });
  return ids.filter(id => out.has(id));
}
// px/sec, quadratic acceleration inside the edge zone.
export function edgeSpeed(y: number, height: number, zone = 56, maximum = 640) {
  if (height <= 0) return 0;
  const z = Math.min(zone, height / 3);
  if (y < z) return -maximum * Math.pow(clamp((z - y) / z, 0, 1), 2);
  if (y > height - z) return maximum * Math.pow(clamp((y - height + z) / z, 0, 1), 2);
  return 0;
}
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
