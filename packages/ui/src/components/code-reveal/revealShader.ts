export const REVEAL_SHADER = `
uniform float2 size;
uniform float mode;
${Array.from({ length: 40 }, (_, i) => `uniform float4 s${i};`).join("\n")}

const float CELL = 9.0;

float hash21(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float ridgeLine(float x, float seed, float freq, float amp, float base) {
  float n = vnoise(float2(x * freq + seed, seed)) * 0.65 + vnoise(float2(x * freq * 2.3 + seed * 1.7, seed * 3.0)) * 0.35;
  return base - amp * n;
}

float3 layer(float3 col, float py, float y, float yref, float3 top, float3 bottom, float depth) {
  float m = smoothstep(-1.2, 1.2, py - y);
  float k = clamp((py - yref) / depth, 0.0, 1.0);
  float3 body = mix(top, bottom, k);
  body = mix(body, float3(1.0, 0.75, 0.7), 0.3 * (1.0 - smoothstep(0.0, 3.0, py - y)));
  return mix(col, body, m);
}

float3 scene(float2 p) {
  float H = size.y;
  float t = clamp(p.y / (0.64 * H), 0.0, 1.0);
  float3 col = mix(float3(0.10, 0.05, 0.30), float3(0.92, 0.22, 0.52), smoothstep(0.0, 0.62, t));
  col = mix(col, float3(1.0, 0.66, 0.22), smoothstep(0.55, 1.0, t));
  float2 sf = fract(p / 7.0) - 0.5;
  float star = step(0.987, hash21(floor(p / 7.0))) * (1.0 - smoothstep(0.0, 0.4, t)) * (1.0 - smoothstep(0.1, 0.24, length(sf)));
  col += float3(0.8, 0.8, 0.9) * star;
  float2 sc = float2(0.5 * size.x, 0.45 * H);
  float R = 0.19 * size.x;
  float d = length(p - sc);
  col += float3(1.0, 0.4, 0.3) * 0.35 * exp(-d / (R * 1.8));
  float disc = 1.0 - smoothstep(R - 1.2, R + 1.2, d);
  float bi = (p.y - sc.y) / R;
  float keep = bi > 0.1 ? step(fract(bi * 6.0), 0.85 - 0.6 * bi) : 1.0;
  float3 sun = mix(float3(1.0, 0.93, 0.45), float3(1.0, 0.35, 0.55), clamp((p.y - (sc.y - R)) / (2.0 * R), 0.0, 1.0));
  col = mix(col, sun, disc * keep);
  float y1 = ridgeLine(p.x, 1.0, 0.012, 0.13 * H, 0.60 * H);
  float y2 = ridgeLine(p.x, 7.0, 0.016, 0.12 * H, 0.69 * H);
  float y3 = ridgeLine(p.x, 13.0, 0.022, 0.10 * H, 0.80 * H);
  col = layer(col, p.y, y1, 0.52 * H, float3(0.78, 0.30, 0.50), float3(0.30, 0.10, 0.42), 0.22 * H);
  col = layer(col, p.y, y2, 0.60 * H, float3(0.42, 0.16, 0.50), float3(0.14, 0.06, 0.30), 0.22 * H);
  col = layer(col, p.y, y3, 0.72 * H, float3(0.20, 0.08, 0.34), float3(0.05, 0.02, 0.14), 0.28 * H);
  return col;
}

float bar(float2 q, float hx, float hy) {
  float2 d = abs(q) - float2(hx, hy);
  return 1.0 - smoothstep(-0.05, 0.05, max(d.x, d.y));
}

float glyph(float k, float2 q) {
  if (k < 0.5) return 0.0;
  if (k < 1.5) return 1.0 - smoothstep(0.07, 0.14, length(q));
  if (k < 2.5) {
    float a = 1.0 - smoothstep(0.06, 0.12, length(q - float2(0.0, -0.18)));
    float b = 1.0 - smoothstep(0.06, 0.12, length(q - float2(0.0, 0.18)));
    return max(a, b);
  }
  if (k < 3.5) return bar(q, 0.26, 0.055);
  if (k < 4.5) return max(bar(q - float2(0.0, -0.13), 0.26, 0.05), bar(q - float2(0.0, 0.13), 0.26, 0.05));
  float plus = max(bar(q, 0.27, 0.055), bar(q, 0.055, 0.27));
  float a = abs(q.x - q.y) * 0.7071;
  float b = abs(q.x + q.y) * 0.7071;
  float xg = bar(q, 0.3, 0.3) * (1.0 - smoothstep(0.04, 0.1, min(a, b)));
  if (k < 5.5) return plus;
  if (k < 6.5) return xg;
  if (k < 7.5) return max(plus, xg);
  if (k < 8.5) {
    float v = max(bar(q - float2(-0.12, 0.0), 0.045, 0.3), bar(q - float2(0.12, 0.0), 0.045, 0.3));
    float h = max(bar(q - float2(0.0, -0.12), 0.3, 0.045), bar(q - float2(0.0, 0.12), 0.3, 0.045));
    return max(v, h);
  }
  float ring = 1.0 - smoothstep(0.0, 0.06, abs(length(q) - 0.3) - 0.07);
  float dot0 = 1.0 - smoothstep(0.12, 0.18, length(q));
  return max(ring, dot0);
}

float stampAt(float4 s, float2 q) {
  if (s.w <= 0.0) return 0.0;
  return (1.0 - smoothstep(0.3, 1.0, length(q - s.xy) / s.z)) * s.w;
}

float3 codeRevealColor(float2 p) {
  float rp = 0.0;
  float2 cc = floor(p / CELL) * CELL + CELL * 0.5;
  float rc = 0.0;
${Array.from({ length: 40 }, (_, i) => `  rp = max(rp, stampAt(s${i}, p));\n  rc = max(rc, stampAt(s${i}, cc));`).join("\n")}
  float3 img = scene(p);
  if (rp <= 0.002) return img;
  float h = CELL * 0.25;
  float3 c0 = scene(cc + float2(-h, -h));
  float3 c1 = scene(cc + float2(h, -h));
  float3 c2 = scene(cc + float2(-h, h));
  float3 c3 = scene(cc + float2(h, h));
  float3 avg = (c0 + c1 + c2 + c3) * 0.25;
  float L = dot(avg, float3(0.3, 0.59, 0.11));
  float dens = clamp(L * 1.2, 0.0, 1.0) * (0.3 + 0.7 * smoothstep(0.0, 0.8, rc));
  float k = clamp(floor(dens * 9.0 + 0.0001), 0.0, 9.0);
  float2 q = (p - (cc - CELL * 0.5)) / CELL - 0.5;
  float ink = glyph(k, q);
  float m = max(avg.r, max(avg.g, avg.b));
  float3 tint = avg / max(m, 0.05) * (0.55 + 0.45 * m);
  float3 inkCol = mode > 0.5 ? tint : float3(0.97, 0.95, 0.9);
  float3 layerCol = mix(float3(0.03, 0.035, 0.05), inkCol, ink);
  return mix(img, layerCol, smoothstep(0.0, 0.5, rp));
}
`;
