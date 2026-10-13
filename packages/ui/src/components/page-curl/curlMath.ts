export const clamp = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.min(hi, Math.max(lo, v));
};
export function curlGeometry(
  progress: number,
  tilt: number,
  originY: number,
  width: number,
  height = width * 4 / 3,
) {
  "worklet";
  const radius = width * 0.115;
  const t = clamp(tilt, -0.55, 0.55),
    k = Math.sqrt(1 + t * t);
  return {
    axis: [
      width +
        (Math.PI * radius) / 2 + Math.abs(t) * height -
        clamp(progress, 0, 1) * (width + Math.PI * radius + radius + 2 * Math.abs(t) * height),
      originY,
    ],
    normal: [1 / k, t / k],
    radius,
  };
}
export function dragProgress(dx: number, width: number, direction: number) {
  "worklet";
  return clamp((-dx * direction) / (width * 1.15), 0, 1);
}
export function shouldTurn(
  progress: number,
  velocityX: number,
  direction: number,
) {
  "worklet";
  const v = -velocityX * direction;
  return v > 0.45 || (v > -0.45 && progress > 0.38);
}
export function targetPage(index: number, direction: number, count: number) {
  "worklet";
  return clamp(index + direction, 0, Math.max(0, count - 1));
}
// Original inverse projection of a sheet wrapped around a cylinder.
// Distance from the fold axis projects to r*sin(theta). Two inverse angles
// give the front and back. The returning sheet is flat after theta=pi.
// Sampling functions are supplied by SkSL (child shaders) or WebGL (textures).
export const CURL_BODY = `
vec4 shadeBack(vec2 q, float light) {
  vec4 c = sampleBack(q);
  c.rgb = mix(c.rgb, vec3(0.97, 0.95, 0.88), 0.72) * light;
  return c;
}
bool inside(vec2 q) { return q.x >= 0.0 && q.x <= size.x && q.y >= 0.0 && q.y <= size.y; }
vec4 renderCurl(vec2 p) {
  if (progress <= 0.0001) return sampleFront(p);
  if (progress >= 0.9999) return sampleUnder(p);
  float s = dot(p-axis, normal);
  vec2 along = p - normal*s;
  vec4 under = sampleUnder(p);
  // Contact shadow sits beneath the projected cylinder, follows the axis.
  float sh = exp(-abs(s-radius*0.45)/(radius*0.75)) * 0.27;
  under.rgb *= 1.0-sh;
  if (s > radius) return under;
  if (s < 0.0) {
    vec2 back = along + normal*(3.14159265*radius - s);
    if (inside(back)) return shadeBack(back, 0.94);
    return sampleFront(p);
  }
  float theta = asin(clamp(s/radius, 0.0, 1.0));
  vec2 back = along + normal*((3.14159265-theta)*radius);
  float light = 0.70 + 0.27*cos(theta);
  if (inside(back)) return shadeBack(back, light);
  vec2 front = along + normal*(theta*radius);
  if (inside(front)) {
    vec4 c = sampleFront(front);
    c.rgb *= 0.74 + 0.26*cos(theta);
    return c;
  }
  return under;
}`;
export const SKSL = `
uniform shader frontPage;
uniform shader underPage;
uniform shader backPage;
uniform float2 size;
uniform float2 axis;
uniform float2 normal;
uniform float radius;
uniform float progress;
uniform float direction;
float2 sourcePoint(float2 p) { return float2(direction < 0.0 ? size.x-p.x : p.x, p.y); }
float4 sampleFront(float2 p) { return float4(frontPage.eval(sourcePoint(p))); }
float4 sampleUnder(float2 p) { return float4(underPage.eval(sourcePoint(p))); }
float4 sampleBack(float2 p) { return float4(backPage.eval(sourcePoint(p))); }
${CURL_BODY.replace(/vec2/g, "float2").replace(/vec3/g, "float3").replace(/vec4/g, "float4")}
half4 main(float2 p) { return half4(renderCurl(sourcePoint(p))); }
`;
