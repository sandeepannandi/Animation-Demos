export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export const clamp = (v: number) => {
  "worklet";
  return Math.max(0, Math.min(1, v));
};
const smooth = (v: number) => {
  "worklet";
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export function makeGrid(columns = 12, rows = 24) {
  const uv: Point[] = [],
    indices: number[] = [];
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) uv.push({ x: x / columns, y: y / rows });
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + 1,
        c = a + columns + 1,
        d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  return { uv, indices };
}
// A bottom-first narrowing wave, followed by transport down the funnel.
// Texture coordinates never change. The two endpoints are exact.
export function warpPoint(
  uv: Point,
  progress: number,
  card: Rect,
  target: Point,
): Point {
  "worklet";
  const p = clamp(progress),
    v = uv.y;
  if (p === 0)
    return { x: card.x + uv.x * card.width, y: card.y + v * card.height };
  if (p === 1) return { x: target.x, y: target.y };
  const transport = smooth((p - 0.28) / 0.72);
  const wave = smooth((p * 1.55 - (1 - v) * 0.52) / 0.72);
  const center = card.x + card.width / 2;
  const bend = wave * (1 - transport);
  const rowCenter = center + (target.x - center) * (bend + transport);
  const width = card.width * (1 - wave * 0.92) * (1 - transport);
  return {
    x: rowCenter + (uv.x - 0.5) * width,
    y: (card.y + v * card.height) * (1 - transport) + target.y * transport,
  };
}
export function meshPoints(uv: Point[], p: number, card: Rect, target: Point) {
  "worklet";
  return uv.map((point) => warpPoint(point, p, card, target));
}
export function releaseTarget(p: number, velocityY: number) {
  "worklet";
  return Math.abs(velocityY) > 0.35 ? velocityY > 0 : p >= 0.5;
}
export function scrub(start: number, dy: number, distance: number) {
  "worklet";
  return clamp(start + dy / Math.max(1, distance));
}
