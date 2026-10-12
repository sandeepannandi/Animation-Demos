import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, PanResponder, Platform, StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { lensTarget, lensUniforms, type LensConfig } from './lensMath';

export type LensSize = { width: number; height: number };
export type LensFeedback = 'grab' | 'release';
export type GlassLensProps = {
  width: number;
  height: number;
  /** The scene the lens looks through: a Skia shader node such as <LinearGradient />, <ImageShader /> or your own <Shader />. Sized by the box. */
  backdrop: (size: LensSize) => ReactNode;
  /** RN content drawn above the canvas. It never receives touches and is not bent by the lens. */
  overlay?: ReactNode;
  radius?: number;
  /** Magnification at the centre, 0 to 0.7. 0.45 is about 1.8x. */
  strength?: number;
  /** Colour fringing at the rim, 0 to 0.06. */
  aberration?: number;
  label?: string;
  onMove?: (point: { x: number; y: number }) => void;
  onFeedback?: (event: LensFeedback) => void;
  reducedMotion?: boolean;
};

// The same maths as lensMath.ts. The lens is a dome with a bevel: inside it the backdrop is sampled closer to the
// centre (magnified), the red and blue channels are sampled at slightly different scales (colour fringe), and the
// rim gets a light from the upper left. The lens stretches along the way it is moving.
const SOURCE = `
uniform shader src;
uniform float2 center;
uniform float radius;
uniform float strength;
uniform float aberration;
uniform float2 axis;
uniform float stretch;
half4 main(float2 p) {
  half4 base = src.eval(p);
  if (radius < 0.5) return base;
  float2 delta = p - center;
  float along = dot(delta, axis) / (1.0 + stretch);
  float across = (-delta.x * axis.y + delta.y * axis.x) * (1.0 + stretch * 0.5);
  float d = sqrt(along * along + across * across);
  float n = d / radius;
  float nc = min(n, 1.0);
  float cover = 1.0 - smoothstep(radius - 1.5, radius, d);
  float shadow = n > 1.0 ? exp(-(d - radius) / (0.28 * radius)) * 0.22 : 0.0;
  float bevel = smoothstep(0.78, 1.0, nc);
  float s = 1.0 - strength * (1.0 - nc * nc) + bevel * 0.18;
  float fringe = aberration * (0.4 + nc);
  half4 cr = src.eval(center + delta * (s * (1.0 - fringe)));
  half4 cg = src.eval(center + delta * s);
  half4 cb = src.eval(center + delta * (s * (1.0 + fringe)));
  half3 glass = half3(cr.r, cg.g, cb.b);
  float len = max(length(delta), 0.0001);
  float facing = dot(delta / len, float2(-0.6, -0.8));
  float rim = bevel * (pow(max(0.0, facing), 2.0) * 0.55 + pow(max(0.0, -facing), 3.0) * 0.25);
  float gloss = smoothstep(0.45, 0.0, distance(delta / radius, float2(-0.35, -0.4))) * 0.12;
  glass = min(glass + half3(half(n <= 1.0 ? rim + gloss : 0.0)), half3(1.0));
  half3 outside = base.rgb * half(1.0 - shadow);
  return half4(mix(outside, glass, half(cover)), 1.0);
}`;
const effect = Skia.RuntimeEffect.Make(SOURCE);
const STEP = 24;

export function GlassLens({ width, height, backdrop, overlay, radius = 62, strength = 0.45, aberration = 0.03, label = 'Glass lens', onMove, onFeedback, reducedMotion }: GlassLensProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const cx = useSharedValue(width * 0.62), cy = useSharedValue(height * 0.42);
  const tx = useSharedValue(width * 0.62), ty = useSharedValue(height * 0.42);
  const grow = useSharedValue(1);
  const origin = useRef({ x: 0, y: 0 });
  const latest = useRef({ onMove, onFeedback, reduce, width, height });
  latest.current = { onMove, onFeedback, reduce, width, height };
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  const cfg = useMemo<LensConfig>(() => ({ width, height, radius, strength, aberration }), [width, height, radius, strength, aberration]);
  const uniforms = useDerivedValue(() => lensUniforms(cx.value, cy.value, tx.value, ty.value, grow.value, reduce, cfg));
  // The target is where the finger is. The visible lens follows it on a spring, so quick moves lag, overshoot and stretch.
  const goTo = useCallback((x: number, y: number) => {
    const t = lensTarget(x, y, latest.current.width, latest.current.height);
    tx.value = t.x;
    ty.value = t.y;
    if (latest.current.reduce) { cx.value = withTiming(t.x, { duration: 90 }); cy.value = withTiming(t.y, { duration: 90 }); }
    else { cx.value = withSpring(t.x, { stiffness: 170, damping: 15, mass: 1 }); cy.value = withSpring(t.y, { stiffness: 170, damping: 15, mass: 1 }); }
    latest.current.onMove?.(t);
  }, [cx, cy, tx, ty]);
  const setGrow = useCallback((value: number) => {
    grow.value = latest.current.reduce ? withTiming(value, { duration: 90 }) : withSpring(value, { stiffness: 220, damping: 14, mass: 1 });
  }, [grow]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => {
      const e = event.nativeEvent;
      origin.current = { x: e.locationX, y: e.locationY };
      goTo(e.locationX, e.locationY);
      setGrow(1.14);
      latest.current.onFeedback?.('grab');
    },
    onPanResponderMove: (_event, g) => goTo(origin.current.x + g.dx, origin.current.y + g.dy),
    onPanResponderRelease: () => { setGrow(1); latest.current.onFeedback?.('release'); },
    onPanResponderTerminate: () => setGrow(1),
  }), [goTo, setGrow]);
  // Screen readers and the keyboard nudge the lens in steps.
  const nudge = useCallback((dx: number, dy: number) => goTo(tx.value + dx, ty.value + dy), [goTo, tx, ty]);
  const onAction = useCallback((event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'left') nudge(-STEP, 0); else if (name === 'right') nudge(STEP, 0); else if (name === 'up') nudge(0, -STEP); else if (name === 'down') nudge(0, STEP);
  }, [nudge]);
  const onKey = useCallback((event: { key?: string; nativeEvent?: { key?: string }; preventDefault?: () => void }) => {
    const key = event.key ?? event.nativeEvent?.key;
    const map: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    if (key && map[key]) { event.preventDefault?.(); nudge(map[key][0], map[key][1]); }
  }, [nudge]);
  const onLayout = useCallback((_e: LayoutChangeEvent) => {}, []);
  const size = { width, height };
  const webProps = Platform.OS === 'web' ? ({ focusable: true, tabIndex: 0, onKeyDown: onKey } as object) : {};
  return (
    <View style={{ width, height, borderRadius: 22, overflow: 'hidden', alignSelf: 'center' }} onLayout={onLayout}>
      <Canvas pointerEvents="none" style={styles.fill}>
        <Fill>
          {effect ? <Shader source={effect} uniforms={uniforms}>{backdrop(size)}</Shader> : null}
        </Fill>
      </Canvas>
      <View pointerEvents="none" style={styles.fill}>{overlay}</View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="Drag to move the lens. Swipe up or down with a screen reader to nudge it."
        accessibilityActions={[{ name: 'left', label: 'Move lens left' }, { name: 'right', label: 'Move lens right' }, { name: 'up', label: 'Move lens up' }, { name: 'down', label: 'Move lens down' }]}
        onAccessibilityAction={onAction}
        style={styles.fill}
        {...pan.panHandlers}
        {...webProps}
      />
    </View>
  );
}
const styles = StyleSheet.create({ fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } });
