export const COIN_SHADER = `
uniform float2 size;
uniform float2 center;
uniform float ppu;
uniform float camD;
uniform float3 ax;
uniform float3 ay;
uniform float3 az;
uniform float3 metal;
uniform float3 bgTop;
uniform float3 bgBottom;

const float RB = 0.045;
const float HALF = 0.1;

float3 toBody(float3 v) {
  return float3(dot(v, ax), dot(v, ay), dot(v, az));
}

float3 toWorld(float3 v) {
  return ax * v.x + ay * v.y + az * v.z;
}

float relief(float2 q) {
  float rho = length(q);
  float ang = atan(q.y, q.x);
  float rim = smoothstep(0.80, 0.84, rho) * (1.0 - smoothstep(0.93, 0.97, rho));
  float inner = 1.0 - smoothstep(0.64, 0.68, rho);
  float lobe = 0.5 + 0.5 * cos(ang * 6.0);
  float starR = 0.16 + 0.34 * lobe * lobe;
  float emblem = 1.0 - smoothstep(starR - 0.02, starR + 0.02, rho);
  float dd = (rho - 0.56) / 0.012;
  float ring = exp(-dd * dd);
  return 0.022 * rim - 0.010 * inner + 0.018 * emblem + 0.006 * ring;
}

float baseSdf(float3 p) {
  float2 q = float2(length(p.xy) - (1.0 - RB), abs(p.z) - (HALF - RB));
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - RB;
}

float map(float3 p) {
  float d = baseSdf(p);
  if (d < 0.06) {
    float rho = length(p.xy);
    float az1 = abs(p.z);
    float faceMask = smoothstep(HALF - 0.06, HALF - 0.02, az1);
    float sideMask = smoothstep(1.0 - RB - 0.02, 1.0 - RB + 0.01, rho) * (1.0 - smoothstep(HALF - RB - 0.02, HALF - RB + 0.005, az1));
    float reed = 0.5 + 0.5 * cos(atan(p.y, p.x) * 72.0);
    d = d - relief(p.xy) * faceMask - reed * 0.007 * sideMask;
  }
  return d;
}

float3 calcNormal(float3 p) {
  float e = 0.0035;
  return normalize(float3(
    map(p + float3(e, 0.0, 0.0)) - map(p - float3(e, 0.0, 0.0)),
    map(p + float3(0.0, e, 0.0)) - map(p - float3(0.0, e, 0.0)),
    map(p + float3(0.0, 0.0, e)) - map(p - float3(0.0, 0.0, e))));
}

float3 env(float3 d) {
  float up = d.y * 0.5 + 0.5;
  float3 col = mix(float3(0.2, 0.21, 0.24), float3(0.6, 0.65, 0.74), smoothstep(0.0, 1.0, up));
  float3 key = normalize(float3(-0.55, 0.75, 0.55));
  col += float3(1.7, 1.62, 1.5) * smoothstep(0.8, 0.95, dot(d, key));
  float3 strip = normalize(float3(0.9, 0.15, 0.3));
  col += float3(0.45, 0.6, 0.9) * smoothstep(0.7, 0.96, dot(d, strip));
  float3 front = normalize(float3(0.15, 0.3, 1.0));
  col += float3(0.5, 0.52, 0.58) * smoothstep(0.7, 0.99, dot(d, front));
  float3 fill = normalize(float3(0.1, -0.8, 0.4));
  col += float3(0.5, 0.32, 0.18) * 0.25 * smoothstep(0.6, 0.95, dot(d, fill));
  col += float3(0.12, 0.12, 0.13) * exp(-abs(d.y) * 14.0);
  return col;
}

float3 backdrop(float2 p) {
  float t = clamp(p.y / size.y, 0.0, 1.0);
  float3 col = mix(bgTop, bgBottom, t);
  float2 g = (p - center) / (size.y * 0.55);
  col += float3(0.05, 0.06, 0.09) * exp(-dot(g, g) * 1.4);
  float2 s = float2((p.x - center.x) / (1.05 * ppu), (p.y - (center.y + 1.5 * ppu)) / (0.5 * ppu));
  col *= 1.0 - 0.3 * exp(-dot(s, s));
  return col;
}

float4 coinColor(float2 p) {
  float3 bg = backdrop(p);
  float2 uv = (p - center) / ppu;
  uv.y = -uv.y;
  float3 ro = float3(0.0, 0.0, camD);
  float3 rd = normalize(float3(uv.x, uv.y, -camD));
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.2544;
  float disc = b * b - c;
  if (disc < 0.0) return float4(bg, 1.0);
  float root = sqrt(disc);
  float t = -b - root;
  float tEnd = -b + root;
  float pix = 1.0 / ppu;
  float minN = 1000.0;
  float tMin = t;
  float hit = 0.0;
  for (int i = 0; i < 64; i++) {
    float3 pb = toBody(ro + rd * t);
    float d = map(pb);
    float dn = d / (pix * t / camD);
    if (dn < minN) {
      minN = dn;
      tMin = t;
    }
    if (d < 0.0008) {
      hit = 1.0;
      tMin = t;
      break;
    }
    t += d * 0.85;
    if (t > tEnd) break;
  }
  float cover = hit > 0.5 ? 1.0 : 1.0 - smoothstep(0.0, 1.2, minN);
  if (cover <= 0.0) return float4(bg, 1.0);
  float3 pb = toBody(ro + rd * tMin);
  float3 nb = calcNormal(pb);
  float3 n = toWorld(nb);
  float3 v = -rd;
  float ndv = max(dot(n, v), 0.0);
  float3 f = metal + (1.0 - metal) * pow(1.0 - ndv, 5.0);
  float3 r = reflect(rd, n);
  float3 sharp = env(r);
  float3 soft = env(normalize(r + 0.18 * n));
  float3 col = (sharp * 0.65 + soft * 0.35) * f;
  col += metal * 0.04 * env(n);
  float h = relief(pb.xy);
  float onFace = smoothstep(HALF - 0.04, HALF - 0.01, abs(pb.z));
  col *= 1.0 + 12.0 * clamp(h, -0.012, 0.0) * onFace;
  float groove = 0.5 + 0.5 * cos(length(pb.xy) * 260.0);
  col *= 1.0 - 0.05 * groove * onFace;
  col = 1.0 - exp(-col * 1.5);
  return float4(mix(bg, col, cover), 1.0);
}
`;
