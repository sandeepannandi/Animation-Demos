import { FERRO_DEFAULTS, FERRO_PX_PER_MM, latticeSpacingPx } from "./ferroMath";

const O = FERRO_DEFAULTS;
const f = (n: number) => n.toFixed(5);

// One shader draws the whole thing. The spike lattice, the dipole field and the
// spike heights are the same formulas as ferroMath.ts. The surface is ray
// marched from a camera tilted toward the bottom of the screen, and shaded as
// black glossy metal reflecting a small studio.
export const FERRO_SHADER = `
uniform float2 size;
uniform float4 mag;

const float A = ${f(latticeSpacingPx())};
const float RB = ${f(O.baseRadiusFactor * latticeSpacingPx())};
const float HMAX = ${f(O.maxHeightPx)};
const float DEPTH = ${f(O.magnetDepthMm * FERRO_PX_PER_MM)};
const float PEAK = ${f(O.peakRatio)};
const float ROW = ${f(Math.sqrt(3) / 2)};

float hash21(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float fieldRatio(float2 c) {
  float2 d = c - mag.xy;
  float r2 = dot(d, d);
  float z2 = DEPTH * DEPTH;
  float R2 = r2 + z2;
  float b = sqrt(4.0 * z2 * z2 + 5.0 * z2 * r2 + r2 * r2) / (R2 * R2 * sqrt(R2));
  return PEAK * b * DEPTH * DEPTH * DEPTH * 0.5;
}

float spikeAt(float2 c, float jitter) {
  float m = mag.z * fieldRatio(c);
  float eps = m * m - 1.0;
  if (eps <= 0.0) return 0.0;
  return jitter * HMAX * (1.0 - 2.0 / (exp(1.6 * sqrt(eps)) + 1.0));
}

float heightAt(float2 q) {
  float2 o = size * 0.5;
  float2 u = q - o;
  float j = u.y / (A * ROW);
  float i = (u.x - j * A * 0.5) / A;
  float i0 = floor(i);
  float j0 = floor(j);
  float z = 0.0;
  for (int k = 0; k < 4; k++) {
    float di = float(k - (k / 2) * 2);
    float dj = float(k / 2);
    float ci = i0 + di;
    float cj = j0 + dj;
    float2 c = o + float2(ci * A + cj * A * 0.5, cj * A * ROW);
    float jit = 0.95 + 0.1 * hash21(float2(ci, cj));
    float h = spikeAt(c, jit);
    if (h > 0.0) {
      float2 toMag = mag.xy - c;
      float lm = length(toMag);
      float2 lean = toMag / max(lm, 1.0) * (0.22 * min(lm / 70.0, 1.0));
      float u0 = max(1.0 - length(q - c) / RB, 0.0);
      float2 dq = q - c - lean * h * u0 * u0;
      float uu = max(1.0 - length(dq) / RB, 0.0);
      z = max(z, h * uu * uu);
    }
  }
  return z;
}

float3 studio(float3 r) {
  float3 L1 = normalize(float3(-0.28, -0.55, 0.78));
  float3 L2 = normalize(float3(0.85, 0.15, 0.5));
  float3 L3 = normalize(float3(-0.7, 0.5, 0.45));
  float d1 = max(dot(r, L1), 0.0);
  float d2 = max(dot(r, L2), 0.0);
  float d3 = max(dot(r, L3), 0.0);
  float3 col = float3(0.05, 0.06, 0.08);
  col += float3(0.22, 0.26, 0.32) * pow(1.0 - clamp(r.z, 0.0, 1.0), 1.6);
  float band = exp(-pow((r.z - 0.30) / 0.14, 2.0));
  col += float3(0.5, 0.58, 0.72) * band * (0.35 + 0.35 * r.x + 0.2 * r.y);
  col += float3(1.0, 0.98, 0.94) * (0.7 * pow(d1, 24.0) + 3.5 * pow(d1, 220.0));
  float strip1 = pow(max(1.0 - abs(r.x + 0.38) * 5.5, 0.0), 2.0) * smoothstep(0.1, 0.35, r.z);
  float strip2 = pow(max(1.0 - abs(r.x - 0.52) * 7.0, 0.0), 2.0) * smoothstep(0.1, 0.35, r.z);
  col += float3(1.0, 0.97, 0.92) * strip1 * 1.5 + float3(0.6, 0.78, 1.0) * strip2 * 1.1;
  col += float3(0.55, 0.75, 1.0) * (0.25 * pow(d2, 30.0) + 0.9 * pow(d2, 160.0));
  col += float3(1.0, 0.8, 0.6) * (0.15 * pow(d3, 40.0) + 0.5 * pow(d3, 200.0));
  return col;
}

float3 ferrofluidColor(float2 p) {
  float2 o = size * 0.5;
  float3 V = normalize(float3(0.0, 0.6, 1.0));
  float3 vp = normalize(float3((o.x - p.x) * 0.0012, (o.y - p.y) * 0.0012 + 0.6, 1.0));

  float2 q = p;
  float zHit = 0.0;
  float2 dm = p - mag.xy;
  float len = length(dm);
  float2 pn = mag.xy + dm * (max(len - (RB + A + HMAX * 0.6), 0.0) / max(len, 0.001));
  float3 n = float3(0.0, 0.0, 1.0);
  float3 view = vp;
  if (mag.z * fieldRatio(pn) > 1.0) {
    float zPrev = HMAX;
    float2 qPrev = p + float2(0.0, 0.6 * HMAX);
    float hPrev = heightAt(qPrev);
    bool hit = false;
    for (int s = 1; s <= 16; s++) {
      float z = HMAX * (1.0 - float(s) / 16.0);
      float2 qs = p + float2(0.0, 0.6 * z);
      float hh = heightAt(qs);
      if (!hit && z <= hh) {
        float a = zPrev - hPrev;
        float b = zPrev - z - (hPrev - hh);
        float t = clamp(a / max(b, 0.0001), 0.0, 1.0);
        q = mix(qPrev, qs, t);
        zHit = mix(zPrev, z, t);
        hit = true;
      }
      zPrev = z;
      qPrev = qs;
      hPrev = hh;
    }
    if (hit) {
      float e = 0.75;
      float hx = heightAt(q + float2(e, 0.0)) - heightAt(q - float2(e, 0.0));
      float hy = heightAt(q + float2(0.0, e)) - heightAt(q - float2(0.0, e));
      n = normalize(float3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));
      view = normalize(float3(vp.xy, vp.z));
    } else {
      q = p;
      zHit = 0.0;
    }
  }
  float3 r = reflect(-view, n);
  float cosT = clamp(dot(n, view), 0.0, 1.0);
  float fres = 0.30 + 0.70 * pow(1.0 - cosT, 5.0);
  float3 col = studio(r) * fres + float3(0.004, 0.005, 0.008);
  col *= 0.6 + 0.4 * clamp(zHit / (HMAX * 0.4), 0.0, 1.0);
  float2 vg = (p - o) / size;
  col *= 1.0 - 0.55 * dot(vg, vg);
  col = col / (1.0 + col * 0.5);
  return pow(col, float3(0.92));
}
`;
