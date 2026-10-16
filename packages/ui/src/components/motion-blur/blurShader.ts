import { Skia } from "@shopify/react-native-skia";

// Directional motion blur with a chromatic fringe, as a Skia runtime shader. Twelve taps along the
// motion vector with tent weights (heaviest at the centre) approximate the streak a camera shutter
// would record; red and blue are sampled a little ahead and behind the centre, which is the fringe.
// span is the total blur length in px along dir; fringe is the colour split in px. Both fade to a
// plain draw at zero, so a page at rest costs one tap.
const SOURCE = `
uniform shader image;
uniform float2 origin;
uniform float2 dir;
uniform float span;
uniform float fringe;
half4 main(float2 p) {
  float2 q = p - origin;
  if (span < 0.75 && fringe < 0.25) return image.eval(q);
  const int TAPS = 12;
  float wsum = 0.0;
  half4 acc = half4(0.0);
  for (int i = 0; i < TAPS; i++) {
    float t = float(i) / float(TAPS - 1) - 0.5;
    float w = 1.0 - 2.0 * abs(t);
    float2 at = q + dir * (t * span);
    half4 c = image.eval(at);
    half r = image.eval(at + dir * fringe * 0.5).r;
    half b = image.eval(at - dir * fringe * 0.5).b;
    acc += half4(r, c.g, b, c.a) * half(w);
    wsum += w;
  }
  return acc / half(wsum);
}`;

const effect = Skia.RuntimeEffect.Make(SOURCE);
if (!effect) throw new Error("Motion Blur: the blur shader failed to compile");
export const motionBlurEffect = effect;
