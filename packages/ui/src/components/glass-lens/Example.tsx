import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Shader, Skia } from '@shopify/react-native-skia';
import { GlassLens, type LensFeedback, type LensSize } from './GlassLens';

// An original "poster" drawn by one small SkSL shader: a gradient, a dot grid, fine rules and a few big rings.
// It is deliberately detailed so the lens has something to magnify and bend.
const ART = `
uniform float2 size;
half4 main(float2 p) {
  float2 uv = p / size;
  float3 c = mix(float3(0.06, 0.16, 0.2), float3(0.32, 0.2, 0.55), uv.x * 0.7 + uv.y * 0.5);
  c = mix(c, float3(0.98, 0.62, 0.38), smoothstep(0.65, 0.0, distance(uv, float2(0.85, 0.15))) * 0.8);
  float2 g = fract(p / 14.0) - 0.5;
  c = mix(c, float3(1.0), smoothstep(0.2, 0.12, length(g)) * 0.5);
  float rule = max(smoothstep(1.0, 0.0, abs(fract(p.x / 56.0 + 0.5) - 0.5) * 56.0), smoothstep(1.0, 0.0, abs(fract(p.y / 56.0 + 0.5) - 0.5) * 56.0));
  c = mix(c, float3(0.6, 0.95, 0.85), rule * 0.55);
  float ring = abs(distance(p, size * float2(0.3, 0.6)) - 46.0);
  c = mix(c, float3(1.0, 0.92, 0.6), smoothstep(2.5, 0.8, ring));
  float ring2 = abs(distance(p, size * float2(0.7, 0.75)) - 28.0);
  c = mix(c, float3(1.0, 0.5, 0.65), smoothstep(2.5, 0.8, ring2));
  return half4(half3(c), 1.0);
}`;
const art = Skia.RuntimeEffect.Make(ART);

export default function Example({ onFeedback }: { onFeedback?: (event: LensFeedback) => void }) {
  const [at, setAt] = useState({ x: 186, y: 84 });
  const backdrop = useMemo(() => ({ width, height }: LensSize) => art ? <Shader source={art} uniforms={{ size: [width, height] }} /> : null, []);
  return (
    <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 12 }}>Lens at {Math.round(at.x)}, {Math.round(at.y)}</Text>
      <GlassLens
        width={300}
        height={200}
        backdrop={backdrop}
        label="Glass lens. Drag to move it over the poster."
        onMove={setAt}
        onFeedback={onFeedback}
        overlay={<View style={{ flex: 1, padding: 16, justifyContent: 'flex-end' }}><Text style={{ color: '#f4f1ff', fontSize: 13 }}>Drag the lens over the poster</Text></View>}
      />
    </View>
  );
}
