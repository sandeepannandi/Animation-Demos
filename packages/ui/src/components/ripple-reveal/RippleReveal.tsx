import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { originFrom, rippleUniforms, type RippleConfig } from './rippleMath';

export type RippleSize = { width: number; height: number };
export type RippleFeedback = 'start' | 'settle';
export type RippleRevealProps = {
  width: number;
  height: number;
  /** Each theme is a Skia shader node, for example <LinearGradient /> or <ImageShader />. Sized by the box. */
  themeA: (size: RippleSize) => ReactNode;
  themeB: (size: RippleSize) => ReactNode;
  /** RN content drawn above the canvas, such as a title. It never receives touches. */
  overlay?: (showing: 'a' | 'b') => ReactNode;
  initial?: 'a' | 'b';
  label?: string;
  durationMs?: number;
  /** Wave height in pixels at the start of the reveal. */
  amplitude?: number;
  wavelength?: number;
  ringWidth?: number;
  onChange?: (showing: 'a' | 'b') => void;
  onFeedback?: (event: RippleFeedback) => void;
  reducedMotion?: boolean;
};

// The same maths as rippleMath.ts: a front that grows from the tap, with a decaying wave around it.
// Two child shaders arrive as `a` and `b`. `oldIsB` says which one the front is replacing.
const SOURCE = `
uniform shader a;
uniform shader b;
uniform float2 size;
uniform float2 origin;
uniform float radius;
uniform float ring;
uniform float wavelength;
uniform float amp;
uniform float oldIsB;
uniform float fade;
half4 main(float2 p) {
  float2 delta = p - origin;
  float d = length(delta);
  float edge = d - radius;
  float off = sin(edge / max(wavelength, 1.0) * 6.2831853) * exp(-abs(edge) / max(ring, 1.0)) * amp;
  float2 q = p + (d > 0.0001 ? delta / d * off : float2(0.0));
  half4 ca = a.eval(q);
  half4 cb = b.eval(q);
  half4 oldC = oldIsB > 0.5 ? cb : ca;
  half4 newC = oldIsB > 0.5 ? ca : cb;
  float cover = fade >= 0.0 ? 1.0 - fade : smoothstep(-1.5, 1.5, edge);
  half4 c = mix(newC, oldC, half(cover));
  float crest = amp > 0.0 ? abs(off) / amp : 0.0;
  float lit = fade >= 0.0 ? 0.0 : crest * (1.0 - smoothstep(0.0, ring, abs(edge))) * 0.16;
  c.rgb = min(c.rgb + half3(lit), half3(1.0));
  return c;
}`;
const effect = Skia.RuntimeEffect.Make(SOURCE);

export function RippleReveal({ width, height, themeA, themeB, overlay, initial = 'a', label = 'Switch theme', durationMs = 1100, amplitude = 14, wavelength = 38, ringWidth = 64, onChange, onFeedback, reducedMotion }: RippleRevealProps) {
  const [showing, setShowing] = useState<'a' | 'b'>(initial);
  // The overlay switches once the front is about halfway, so text stays readable over both themes.
  const [overlayShowing, setOverlayShowing] = useState<'a' | 'b'>(initial);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const progress = useSharedValue(1);
  const originX = useSharedValue(width / 2);
  const originY = useSharedValue(height / 2);
  const oldIsB = useSharedValue(initial === 'a' ? 1 : 0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef({ onChange, onFeedback });
  latest.current = { onChange, onFeedback };
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); if (timer.current) clearTimeout(timer.current); if (overlayTimer.current) clearTimeout(overlayTimer.current); };
  }, []);
  const cfg = useMemo<RippleConfig>(() => ({ width, height, ringWidth, wavelength, amplitude }), [width, height, ringWidth, wavelength, amplitude]);
  const uniforms = useDerivedValue(() => rippleUniforms(progress.value, { x: originX.value, y: originY.value }, oldIsB.value > 0.5, reduce, cfg));
  const reveal = useCallback((x: number, y: number) => {
    if (busy.current) return;
    busy.current = true;
    const next = showing === 'a' ? 'b' : 'a';
    const o = originFrom(x, y, width, height);
    originX.value = o.x;
    originY.value = o.y;
    oldIsB.value = showing === 'b' ? 1 : 0;
    const ms = reduce ? 180 : durationMs;
    progress.value = 0;
    progress.value = withTiming(1, { duration: ms, easing: Easing.linear });
    setShowing(next);
    overlayTimer.current = setTimeout(() => setOverlayShowing(next), ms * 0.4);
    latest.current.onChange?.(next);
    latest.current.onFeedback?.('start');
    AccessibilityInfo.announceForAccessibility?.(`${label}: showing theme ${next === 'a' ? 'one' : 'two'}`);
    timer.current = setTimeout(() => { busy.current = false; latest.current.onFeedback?.('settle'); }, ms);
  }, [showing, width, height, reduce, durationMs, label, originX, originY, oldIsB, progress]);
  const onPress = useCallback((event: GestureResponderEvent) => reveal(event.nativeEvent.locationX, event.nativeEvent.locationY), [reveal]);
  const size = { width, height };
  return (
    <View style={{ width, height, borderRadius: 22, overflow: 'hidden', alignSelf: 'center' }}>
      <Canvas pointerEvents="none" style={styles.fill}>
        <Fill>
          {effect ? <Shader source={effect} uniforms={uniforms}>{themeA(size)}{themeB(size)}</Shader> : null}
        </Fill>
      </Canvas>
      <View pointerEvents="none" style={styles.fill}>{overlay?.(overlayShowing)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Reveals the other theme from where you tap" accessibilityState={{ selected: showing === 'b' }} onPress={onPress} style={styles.fill} {...(Platform.OS === 'web' ? { focusable: true } : {})} />
    </View>
  );
}
const styles = StyleSheet.create({ fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } });
