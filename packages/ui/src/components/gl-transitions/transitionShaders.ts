import { Skia, type SkRuntimeEffect } from "@shopify/react-native-skia";
import type { TransitionEffect } from "./transitionMath";

// Six original transition effects as Skia runtime shaders. Every shader crossfades two page
// textures (`fromI` -> `toI`) on a 0..1 `progress` that the drag scrubs directly. Each returns
// exactly `fromI` at progress 0 and exactly `toI` at progress 1, so a page at rest is pixel-clean.

// Ripple: a wavefront grows from the touch point, revealing the next page inside it, with a faint
// light catch riding the front. The radius covers the worst-case corner so the page fully turns.
const RIPPLE = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
uniform float2 touch;
half4 main(float2 p) {
  float2 uv = p / size;
  float aspect = size.x / size.y;
  float2 d = uv - touch;
  d.x *= aspect;
  float dist = length(d);
  float maxR = length(float2(aspect, 1.0)) + 0.08;
  float e = progress * progress * (3.0 - 2.0 * progress);
  float r = e * maxR;
  float edge = 0.09;
  float m = smoothstep(r, r - edge, dist);
  half4 a = fromI.eval(p);
  half4 b = toI.eval(p);
  float ring = exp(-4.0 * pow((dist - r) / edge, 2.0));
  half glow = half(ring * 0.22 * (1.0 - abs(2.0 * progress - 1.0)));
  half4 c = mix(a, b, half(m));
  return half4(c.rgb + glow * half3(0.95, 0.85, 1.0), c.a);
}`;

// Slices: seven vertical bands of the next page slide in behind the drag direction, each starting
// a beat after its neighbour and bobbing slightly as it lands.
const SLICES = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
uniform float dir;
half4 main(float2 p) {
  float i = floor(p.x / size.x * 7.0);
  float local = clamp((progress - i * 0.07) / (1.0 - 0.07 * 6.0), 0.0, 1.0);
  local = local * local * (3.0 - 2.0 * local);
  float2 shift = float2(
    (1.0 - local) * 0.30 * dir * size.x,
    (mod(i, 2.0) - 0.5) * (1.0 - local) * size.y * 0.10
  );
  half4 a = fromI.eval(p);
  half4 b = toI.eval(p + shift);
  return mix(a, b, half(local));
}`;

// Zoom: the outgoing page leans in and fades while the incoming page settles from a slight zoom,
// its colour channels split radially - widest exactly mid-transition, closed at both ends.
const ZOOM = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
half4 main(float2 p) {
  float2 c = size * 0.5;
  float2 pa = c + (p - c) * (1.0 - 0.18 * progress);
  half4 a = fromI.eval(pa);
  float2 pb = c + (p - c) * (1.18 - 0.18 * progress);
  float2 d = (p - c) / size;
  float split = sin(progress * 3.14159265) * 0.012;
  half r = toI.eval(pb - d * split * size.x).r;
  half4 b = toI.eval(pb);
  half bl = toI.eval(pb + d * split * size.x).b;
  float m = smoothstep(0.2, 0.8, progress);
  return mix(a, half4(r, b.g, bl, b.a), half(m));
}`;

// Melt: columns of the old page slide down and let go one by one in a fixed shuffled order, like
// the picture slipping off the glass.
const MELT = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
half4 main(float2 p) {
  float col = floor(p.x / size.x * 24.0);
  float rnd = fract(sin(col * 12.9898) * 43758.5453);
  float local = clamp((progress - rnd * 0.45) / 0.55, 0.0, 1.0);
  local = local * local * (3.0 - 2.0 * local);
  half4 b = toI.eval(p);
  half4 a = fromI.eval(p + float2(0.0, local * size.y * 0.5));
  return mix(b, a, half(1.0 - local));
}`;

// Vortex: the outgoing page twists down a whirlpool and grows while the incoming page untwists
// from the opposite spin - the drain is strongest at the centre, so the middle lets go first.
const VORTEX = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
half4 main(float2 p) {
  float2 c = size * 0.5;
  float2 d = p - c;
  float dist = length(d) / length(c);
  float ta = progress * 5.0 * exp(-2.5 * dist);
  float sa = sin(ta), ca = cos(ta);
  float2 ra = float2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
  half4 a = fromI.eval(c + ra * (1.0 + progress * 0.35));
  float tb = (1.0 - progress) * -5.0 * exp(-2.5 * dist);
  float sb = sin(tb), cb = cos(tb);
  float2 rb = float2(d.x * cb - d.y * sb, d.x * sb + d.y * cb);
  half4 b = toI.eval(c + rb * (1.0 + (1.0 - progress) * 0.35));
  float m = smoothstep(0.25, 0.75, progress);
  return mix(a, b, half(m));
}`;

// Wave: a traveling wavy front rips across the page, and both pictures shear along the wave while
// it passes - most bent mid-transition, flat again at both ends.
const WAVE = `
uniform shader fromI;
uniform shader toI;
uniform float progress;
uniform float2 size;
half4 main(float2 p) {
  float2 uv = p / size;
  float amp = 0.06;
  float wob = sin(uv.y * 14.0 + progress * 5.0);
  float edge = progress * (1.0 + 2.0 * amp) - amp + amp * wob;
  float m = smoothstep(edge + 0.04, edge - 0.04, uv.x);
  float bend = (1.0 - abs(2.0 * progress - 1.0)) * 0.05 * wob;
  half4 a = fromI.eval(p + float2(bend * size.x, 0.0));
  half4 b = toI.eval(p + float2(bend * 0.5 * size.x, 0.0));
  return mix(a, b, half(m));
}`;

function compile(name: string, source: string): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(source);
  if (!effect) throw new Error(`GL Transitions: the ${name} shader failed to compile`);
  return effect;
}

const compiled: Record<TransitionEffect, SkRuntimeEffect> = {
  ripple: compile("ripple", RIPPLE),
  slices: compile("slices", SLICES),
  zoom: compile("zoom", ZOOM),
  melt: compile("melt", MELT),
  vortex: compile("vortex", VORTEX),
  wave: compile("wave", WAVE),
};

export function transitionEffect(name: TransitionEffect): SkRuntimeEffect {
  return compiled[name];
}
