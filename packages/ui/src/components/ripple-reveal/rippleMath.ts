// Pure geometry for the Theme Reveal. Every function is a worklet so Skia and
// Reanimated can call it on the UI thread; plain JS (tests, web preview) ignores the tag.
export type RippleConfig = { width: number; height: number; ringWidth: number; wavelength: number; amplitude: number };
export type RipplePoint = { x: number; y: number };

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
// A tap outside the box (or a keyboard "press" with no coordinates) starts from the centre.
export function originFrom(x: number, y: number, width: number, height: number): RipplePoint {
  'worklet';
  const ok = Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= width && y <= height && !(x === 0 && y === 0);
  return ok ? { x, y } : { x: width / 2, y: height / 2 };
}
// Distance from the origin to the farthest corner: the reveal must pass it to finish.
export function farthestCorner(ox: number, oy: number, width: number, height: number) {
  'worklet';
  const dx = Math.max(ox, width - ox), dy = Math.max(oy, height - oy);
  return Math.sqrt(dx * dx + dy * dy);
}
export function easeOutQuad(t: number) {
  'worklet';
  const u = 1 - clamp(t, 0, 1);
  return 1 - u * u;
}
// Radius of the reveal front. At progress 1 the whole ring (2.5 widths) has left the box.
export function frontRadius(progress: number, maxRadius: number, ringWidth: number) {
  'worklet';
  return easeOutQuad(progress) * (maxRadius + ringWidth * 2.5);
}
// The wave fades out as the front travels, so the settled state is flat and exact.
export function waveAmplitude(progress: number, amplitude: number) {
  'worklet';
  const left = 1 - clamp(progress, 0, 1);
  return amplitude * left * left;
}
// Signed offset applied along the radial direction. `edge` is distance - frontRadius.
export function waveOffset(edge: number, ringWidth: number, wavelength: number, amp: number) {
  'worklet';
  const envelope = Math.exp(-Math.abs(edge) / Math.max(1, ringWidth));
  return Math.sin((edge / Math.max(1, wavelength)) * Math.PI * 2) * envelope * amp;
}
// 0 well inside the revealed area, 1 outside, with a short soft edge so it never aliases.
export function coverage(edge: number, soft: number) {
  'worklet';
  const t = clamp((edge + soft) / (2 * soft), 0, 1);
  return t * t * (3 - 2 * t);
}
// Everything the shader needs, in the order the SkSL declares it.
export function rippleUniforms(progress: number, origin: RipplePoint, oldIsB: boolean, reduce: boolean, cfg: RippleConfig) {
  'worklet';
  const max = farthestCorner(origin.x, origin.y, cfg.width, cfg.height);
  return {
    size: [cfg.width, cfg.height],
    origin: [origin.x, origin.y],
    radius: frontRadius(progress, max, cfg.ringWidth),
    ring: cfg.ringWidth,
    wavelength: cfg.wavelength,
    amp: reduce ? 0 : waveAmplitude(progress, cfg.amplitude),
    oldIsB: oldIsB ? 1 : 0,
    fade: reduce ? clamp(progress, 0, 1) : -1,
  };
}
// One pixel of the reveal, in plain JS. The web preview runs this; the SkSL mirrors it.
export function samplePoint(px: number, py: number, u: ReturnType<typeof rippleUniforms>) {
  'worklet';
  const dx = px - u.origin[0], dy = py - u.origin[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  const edge = d - u.radius;
  const off = waveOffset(edge, u.ring, u.wavelength, u.amp);
  const k = d > 0.0001 ? off / d : 0;
  const mix = u.fade >= 0 ? 1 - u.fade : coverage(edge, 1.5);
  return { x: px + dx * k, y: py + dy * k, over: 1 - mix, crest: Math.abs(off) / Math.max(1e-6, u.amp || 1e-6) };
}
