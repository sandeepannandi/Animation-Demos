export type ChartDatum = { label: string; value: number };
export type ChartPoint = ChartDatum & { x: number; y: number };
export type ChartSegment = { a: ChartPoint; b: ChartPoint; c1: { x: number; y: number }; c2: { x: number; y: number } };
export const DEMO_DATA: ChartDatum[] = [
  { label: 'Mon', value: 42 }, { label: 'Tue', value: 58 }, { label: 'Wed', value: 51 },
  { label: 'Thu', value: 76 }, { label: 'Fri', value: 69 }, { label: 'Sat', value: 94 }, { label: 'Sun', value: 88 },
];
export function clamp(n: number, lo: number, hi: number) {
  'worklet';
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
// Evenly spaced categories, not a time scale. Ignore non-finite readings.
export function chartGeometry(data: readonly ChartDatum[], width: number, height: number) {
  const valid = data.filter(d => Number.isFinite(d.value));
  const left = 18, right = Math.max(left + 1, width - 18), top = 52, bottom = Math.max(top + 1, height - 30);
  if (!valid.length) return { points: [] as ChartPoint[], segments: [] as ChartSegment[], line: '', area: '', left, right, top, bottom };
  let low = Math.min(...valid.map(d => d.value)), high = Math.max(...valid.map(d => d.value));
  const pad = (high - low || Math.max(Math.abs(high) * 0.1, 1)) * 0.12;
  low -= pad; high += pad;
  const points = valid.map((d, i) => ({ ...d, x: valid.length === 1 ? (left + right) / 2 : left + i * (right - left) / (valid.length - 1), y: bottom - (d.value - low) / (high - low) * (bottom - top) }));
  // Shape-preserving Hermite tangents: flat at a turning point, harmonic mean elsewhere.
  // This keeps a chart honest: the curve never invents peaks beyond adjacent readings.
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_p, i) => {
    if (!slopes.length) return 0;
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[slopes.length - 1];
    const a = slopes[i - 1], b = slopes[i];
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  });
  const segments = points.slice(1).map((b, i) => {
    const a = points[i], dx = (b.x - a.x) / 3;
    return { a, b, c1: { x: a.x + dx, y: a.y + tangents[i] * dx }, c2: { x: b.x - dx, y: b.y - tangents[i + 1] * dx } };
  });
  const line = `M ${points[0].x} ${points[0].y}` + segments.map(s => ` C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.b.x} ${s.b.y}`).join('');
  const area = points.length < 2 ? '' : `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
  return { points, segments, line, area, left, right, top, bottom };
}
export function nearestIndex(x: number, points: readonly ChartPoint[]) {
  'worklet';
  if (!points.length) return -1;
  let best = 0;
  for (let i = 1; i < points.length; i++) if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i;
  return best;
}
export function curveY(x: number, points: readonly ChartPoint[], segments: readonly ChartSegment[]) {
  'worklet';
  if (!points.length) return 0;
  if (!segments.length) return points[0].y;
  const safe = clamp(x, points[0].x, points[points.length - 1].x);
  const s = segments.find(seg => safe <= seg.b.x) ?? segments[segments.length - 1];
  const t = (safe - s.a.x) / (s.b.x - s.a.x), u = 1 - t;
  return u * u * u * s.a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.b.y;
}
export function bubbleLeft(x: number, width: number, bubbleWidth = 96) {
  'worklet';
  return clamp(x - bubbleWidth / 2, 0, Math.max(0, width - bubbleWidth));
}

// A shared clock keeps RN and the SVG adapter on the same staged reveal.
export function revealPhase(clock: number, start: number, end: number) {
  'worklet';
  const t = clamp((clock - start) / Math.max(0.001, end - start), 0, 1);
  return t * t * (3 - 2 * t);
}
