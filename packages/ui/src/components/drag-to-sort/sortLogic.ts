export const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(Number.isFinite(n) ? n : lo, lo), Math.max(lo, hi));
export function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (!Number.isInteger(from) || from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1); next.splice(clamp(Math.round(to), 0, next.length), 0, item); return next;
}
export const indexAt = (top: number, step: number, count: number) => step > 0 ? clamp(Math.round(top / step), 0, count - 1) : 0;
// px/sec, quadratic acceleration inside a 64px edge zone.
export function edgeSpeed(y: number, height: number, zone = 64, maximum = 520) {
  if (height <= 0) return 0;
  const z = Math.min(zone, height / 3);
  if (y < z) return -maximum * Math.pow(clamp((z - y) / z, 0, 1), 2);
  if (y > height - z) return maximum * Math.pow(clamp((y - height + z) / z, 0, 1), 2);
  return 0;
}
export function slotFor(index: number, from: number, to: number) {
  if (index === from) return to;
  if (from < to && index > from && index <= to) return index - 1;
  if (from > to && index >= to && index < from) return index + 1;
  return index;
}
