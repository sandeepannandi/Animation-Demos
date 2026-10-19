import { SCREEN_X } from "./prismDesign";

// One shader draws the scene: dark bench, glass triangle, incident beam, the
// path inside the glass, the dispersed fan and a matte screen the fan lands
// on. All angles and wavelengths come from prismMath.ts.
export const PRISM_SHADER = `
uniform float2 size;
uniform float2 beam;      // y and full width
uniform float4 triA;      // v0.xy, v1.xy
uniform float2 triC;      // v2.xy
uniform float4 incident;  // beam start -> entry (or right edge)
uniform float4 seg1;      // internal reference path, first segment
uniform float4 seg2;      // internal reference path, second segment
uniform float2 meta;      // x: segment count, y: hit flag
uniform float4 refl;      // reflected stub at the entry face: point, dir * len
uniform float4 fan;       // exit point, phi red end, phi violet end
uniform float2 fanRef;    // reference exit direction
uniform float2 fanCfg;    // fan on, monochromatic
uniform float4 lut0;
uniform float4 lut1;
uniform float4 lut2;
uniform float4 lut3;

float segDist(float2 p, float2 a, float2 b) {
  float2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * t);
}

float beamSeg(float2 p, float2 a, float2 b, float w) {
  float d = segDist(p, a, b);
  return exp(-(d * d) / (w * w));
}

float3 wavelengthRGB(float l) {
  float r = 0.0;
  float g = 0.0;
  float b = 0.0;
  if (l >= 380.0 && l < 440.0) { r = -(l - 440.0) / 60.0; b = 1.0; }
  else if (l >= 440.0 && l < 490.0) { g = (l - 440.0) / 50.0; b = 1.0; }
  else if (l >= 490.0 && l < 510.0) { g = 1.0; b = -(l - 510.0) / 20.0; }
  else if (l >= 510.0 && l < 580.0) { r = (l - 510.0) / 70.0; g = 1.0; }
  else if (l >= 580.0 && l < 645.0) { r = 1.0; g = -(l - 645.0) / 65.0; }
  else if (l >= 645.0 && l <= 780.0) { r = 1.0; }
  float f = 1.0;
  if (l < 420.0) f = 0.3 + 0.7 * (l - 380.0) / 40.0;
  else if (l > 700.0) f = 0.3 + 0.7 * (780.0 - l) / 80.0;
  return pow(float3(r * f, g * f, b * f), float3(0.8));
}

float lutAt(float s) {
  float x = clamp(s, 0.0, 1.0) * 15.0;
  float f = fract(x);
  int i = int(floor(x));
  if (i == 0) return mix(lut0.x, lut0.y, f);
  if (i == 1) return mix(lut0.y, lut0.z, f);
  if (i == 2) return mix(lut0.z, lut0.w, f);
  if (i == 3) return mix(lut0.w, lut1.x, f);
  if (i == 4) return mix(lut1.x, lut1.y, f);
  if (i == 5) return mix(lut1.y, lut1.z, f);
  if (i == 6) return mix(lut1.z, lut1.w, f);
  if (i == 7) return mix(lut1.w, lut2.x, f);
  if (i == 8) return mix(lut2.x, lut2.y, f);
  if (i == 9) return mix(lut2.y, lut2.z, f);
  if (i == 10) return mix(lut2.z, lut2.w, f);
  if (i == 11) return mix(lut2.w, lut3.x, f);
  if (i == 12) return mix(lut3.x, lut3.y, f);
  if (i == 13) return mix(lut3.y, lut3.z, f);
  if (i == 14) return mix(lut3.z, lut3.w, f);
  return lut3.w;
}

float3 prismColor(float2 p) {
  float t = clamp(p.y / size.y, 0.0, 1.0);
  float3 col = mix(float3(0.016, 0.022, 0.045), float3(0.030, 0.040, 0.075), t);
  float2 vg = (p - size * 0.5) / size;
  col *= 1.0 - 0.5 * dot(vg, vg);

  // Matte screen the spectrum lands on.
  float sx = ${SCREEN_X}.0;
  float scr = smoothstep(2.0, 0.0, abs(p.x - sx) - 3.0) * step(20.0, p.y) * step(p.y, size.y - 20.0);
  col = mix(col, float3(0.62, 0.66, 0.72) * (0.55 + 0.45 * t), scr * 0.85);

  // Glass triangle: faint fill and a bright rim.
  float2 v0 = triA.xy;
  float2 v1 = triA.zw;
  float2 v2 = triC;
  float d0 = segDist(p, v0, v1);
  float d1 = segDist(p, v1, v2);
  float d2 = segDist(p, v2, v0);
  float dE = min(d0, min(d1, d2));
  float c0 = (v1.x - v0.x) * (p.y - v0.y) - (v1.y - v0.y) * (p.x - v0.x);
  float c1 = (v2.x - v1.x) * (p.y - v1.y) - (v2.y - v1.y) * (p.x - v1.x);
  float c2 = (v0.x - v2.x) * (p.y - v2.y) - (v0.y - v2.y) * (p.x - v2.x);
  bool inside = (c0 >= 0.0 && c1 >= 0.0 && c2 >= 0.0) || (c0 <= 0.0 && c1 <= 0.0 && c2 <= 0.0);
  if (inside) {
    col += float3(0.45, 0.60, 0.78) * 0.045;
    col += float3(0.55, 0.75, 1.0) * 0.10 * exp(-dE / 9.0);
  }
  col += float3(0.60, 0.78, 1.0) * 0.30 * exp(-abs(dE) / 2.0);

  float w = beam.y * 0.5;

  // Incident beam, white with a soft halo.
  float bi = beamSeg(p, incident.xy, incident.zw, w);
  col += float3(1.0, 0.99, 0.95) * bi * 0.85;
  col += float3(1.0, 0.98, 0.92) * beamSeg(p, incident.xy, incident.zw, w * 2.6) * 0.10;

  if (meta.y > 0.5) {
    // Faint reflection off the entry face.
    float2 rEnd = refl.xy + refl.zw * 60.0;
    col += float3(1.0, 0.99, 0.95) * beamSeg(p, refl.xy, rEnd, w * 0.55) * 0.14;
    // The reference path inside the glass.
    float i1 = beamSeg(p, seg1.xy, seg1.zw, w * 0.5);
    col += float3(0.92, 0.96, 1.0) * i1 * 0.55;
    if (meta.x > 1.5) {
      float i2 = beamSeg(p, seg2.xy, seg2.zw, w * 0.5);
      col += float3(0.92, 0.96, 1.0) * i2 * 0.45;
    }
  }

  if (fanCfg.x > 0.5) {
    float2 v = p - fan.xy;
    float d = length(v);
    if (d > 2.0) {
      float2 dir = v / d;
      float cs = clamp(dot(dir, fanRef), -1.0, 1.0);
      float sn = fanRef.x * dir.y - fanRef.y * dir.x;
      float phi = atan(sn, cs);
      float fade = exp(-d / 340.0);
      if (fanCfg.y > 0.5) {
        float perp = abs(d * sin(phi));
        float inten = exp(-(perp * perp) / (w * w * 0.55 * 0.55)) * fade;
        col += wavelengthRGB(lut0.x) * inten;
        col += wavelengthRGB(lut0.x) * exp(-(perp * perp) / (w * w * 2.6 * 2.6)) * fade * 0.10;
      } else {
        float spread = fan.w - fan.z;
        float s = (phi - fan.z) / spread;
        float lam = lutAt(s);
        float exc = s < 0.0 ? -s : (s > 1.0 ? s - 1.0 : 0.0);
        float inten = exp(-pow(exc * spread * d / (w * 0.55), 2.0)) * fade;
        col += wavelengthRGB(lam) * inten * 1.1;
      }
    }
    // Glow where the beam leaves the glass.
    col += float3(1.0, 0.98, 0.94) * exp(-d / 7.0) * 0.22;
  }

  col = col / (1.0 + col * 0.30);
  return pow(col, float3(0.95));
}
`;
