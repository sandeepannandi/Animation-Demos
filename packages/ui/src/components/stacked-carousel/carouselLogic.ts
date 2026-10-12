export function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)); }
// Velocity is in pixels per millisecond, matching PanResponder.vx.
export function snap(position: number, velocity: number, start: number, count: number, stride = 120) {
  if (count < 2) return 0;
  const projected = position - clamp(velocity, -2, 2) * 180 / Math.max(1, stride);
  return clamp(Math.round(projected), Math.max(0, start - 1), Math.min(count - 1, start + 1));
}
export function dragPosition(start: number, dx: number, count: number, stride = 120) {
  const raw = start - dx / Math.max(1, stride);
  const end = Math.max(0, count - 1);
  return raw < 0 ? Math.max(-0.35, raw * 0.2) : raw > end ? Math.min(end + 0.35, end + (raw - end) * 0.2) : raw;
}
export function depth(distance: number) {
  const d = clamp(distance, -3, 3), a = Math.abs(d);
  return { x: d * 66, y: a * 15, scale: Math.max(0.72, 1 - a * 0.12), opacity: Math.max(0, 1 - a * 0.32), tilt: -d * 14 };
}
