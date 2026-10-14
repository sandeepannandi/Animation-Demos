import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Shader, Skia } from '@shopify/react-native-skia';
import { RippleReveal, type RippleFeedback, type RippleSize } from './RippleReveal';

// Two original "artworks", each a small SkSL shader: soft colour blobs on a gradient.
const ART = `
uniform float2 size;
uniform float3 top;
uniform float3 bottom;
uniform float3 blobA;
uniform float3 blobB;
half4 main(float2 p) {
  float2 uv = p / size;
  float3 c = mix(top, bottom, uv.y);
  float a = smoothstep(0.55, 0.0, distance(uv, float2(0.22, 0.28)));
  float b = smoothstep(0.62, 0.0, distance(uv, float2(0.82, 0.78)));
  c = mix(c, blobA, a * 0.85);
  c = mix(c, blobB, b * 0.8);
  return half4(half3(c), 1.0);
}`;
const art = Skia.RuntimeEffect.Make(ART);
const dusk = { top: [0.07, 0.09, 0.2], bottom: [0.16, 0.1, 0.3], blobA: [0.35, 0.3, 0.85], blobB: [0.9, 0.4, 0.55] };
const dawn = { top: [1.0, 0.93, 0.8], bottom: [0.99, 0.8, 0.62], blobA: [1.0, 0.65, 0.35], blobB: [0.55, 0.78, 0.7] };
const make = (colors: typeof dusk) => ({ width, height }: RippleSize) => art ? <Shader source={art} uniforms={{ size: [width, height], ...colors }} /> : null;

export default function Example({ onFeedback }: { onFeedback?: (event: RippleFeedback) => void }) {
  const [showing, setShowing] = useState<'a' | 'b'>('a');
  const [reduce, setReduce] = useState<boolean | undefined>();
  const themeA = useMemo(() => make(dusk), []);
  const themeB = useMemo(() => make(dawn), []);
  return (
    <View style={{ paddingVertical: 24, width: '100%', alignItems: 'center' }}>
      <Text accessibilityLiveRegion="polite" style={{ color: '#31513b', fontSize: 13, marginBottom: 12 }}>Theme: {showing === 'a' ? 'Dusk' : 'Dawn'}</Text>
      <RippleReveal
        reducedMotion={reduce}
        width={300}
        height={200}
        themeA={themeA}
        themeB={themeB}
        label="Switch between Dusk and Dawn"
        onChange={setShowing}
        onFeedback={onFeedback}
        overlay={current => <View style={{ flex: 1, padding: 20, justifyContent: 'flex-end' }}><Text style={{ color: current === 'a' ? '#f1eefc' : '#3d2a14', fontSize: 22, fontWeight: '700' }}>{current === 'a' ? 'Dusk' : 'Dawn'}</Text><Text style={{ color: current === 'a' ? '#c9c2ee' : '#7a5a35', fontSize: 13 }}>Tap anywhere to switch</Text></View>}
      />
      <Text style={{ color: '#4b6053', fontSize: 12, marginTop: 12 }}>Tap anywhere on the card.</Text>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduce === true }} accessibilityLabel="Reduced motion" onPress={() => setReduce(reduce === true ? undefined : true)} style={{ marginTop: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#e6edde', justifyContent: 'center' }}><Text style={{ color: '#31513b', fontSize: 13 }}>Motion: {reduce === true ? 'reduced' : 'system'}</Text></Pressable>
    </View>
  );
}
