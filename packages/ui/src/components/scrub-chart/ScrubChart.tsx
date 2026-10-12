import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, Platform, Text, View, type AccessibilityActionEvent } from 'react-native';
import { Canvas, Circle, Group, Line, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { bubbleLeft, chartGeometry, clamp, curveY, nearestIndex, type ChartDatum } from './chartMath';

export type ScrubChartProps = {
  data: readonly ChartDatum[];
  width: number;
  height?: number;
  label?: string;
  color?: string;
  formatValue?: (value: number) => string;
  onSelect?: (datum: ChartDatum, index: number) => void;
  reducedMotion?: boolean;
  /** Change to replay the draw-in without changing the data. */
  animationKey?: number;
};
export function ScrubChart({ data, width, height = 220, label = 'Line chart', color = '#57dfb6', formatValue = String, onSelect, reducedMotion, animationKey = 0 }: ScrubChartProps) {
  const geometry = useMemo(() => chartGeometry(data, width, height), [data, width, height]);
  const { points, segments } = geometry;
  const [systemReduce, setSystemReduce] = useState(false), [index, setIndex] = useState(0);
  const reduce = reducedMotion ?? systemReduce;
  const cursor = useSharedValue(points[0]?.x ?? 0), progress = useSharedValue(0);
  const selectedRef = useRef(0), origin = useRef(0);
  const latest = useRef({ points, reduce, onSelect }); latest.current = { points, reduce, onSelect };
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    selectedRef.current = 0; setIndex(0); cursor.value = points[0]?.x ?? 0;
    progress.value = 0;
    progress.value = withTiming(1, { duration: reduce ? 0 : 1100, easing: Easing.out(Easing.cubic) });
  }, [geometry, animationKey, reduce, cursor, progress, points]);
  const choose = useCallback((next: number) => {
    const p = latest.current.points;
    if (!p.length) return;
    const i = Math.round(clamp(next, 0, p.length - 1));
    cursor.value = latest.current.reduce ? p[i].x : withSpring(p[i].x, { stiffness: 260, damping: 28, overshootClamping: true });
    if (i !== selectedRef.current) { selectedRef.current = i; setIndex(i); latest.current.onSelect?.(p[i], i); }
  }, [cursor]);
  const pickX = useCallback((x: number) => choose(nearestIndex(x, latest.current.points)), [choose]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => { origin.current = e.nativeEvent.locationX; pickX(origin.current); },
    onPanResponderMove: (_e, g) => pickX(origin.current + g.dx),
    onPanResponderTerminationRequest: () => true,
  }), [pickX]);
  const onAction = useCallback((e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') choose(selectedRef.current + 1);
    if (e.nativeEvent.actionName === 'decrement') choose(selectedRef.current - 1);
  }, [choose]);
  const onKey = useCallback((e: { key?: string; nativeEvent?: { key?: string }; preventDefault?: () => void }) => {
    const key = e.key ?? e.nativeEvent?.key;
    if (key === 'ArrowRight' || key === 'ArrowUp') { e.preventDefault?.(); choose(selectedRef.current + 1); }
    else if (key === 'ArrowLeft' || key === 'ArrowDown') { e.preventDefault?.(); choose(selectedRef.current - 1); }
    else if (key === 'Home' || key === 'End') { e.preventDefault?.(); choose(key === 'Home' ? 0 : latest.current.points.length - 1); }
  }, [choose]);
  const cy = useDerivedValue(() => curveY(cursor.value, points, segments));
  const lineStart = useDerivedValue(() => ({ x: cursor.value, y: geometry.top }));
  const lineEnd = useDerivedValue(() => ({ x: cursor.value, y: geometry.bottom }));
  const clip = useDerivedValue(() => ({ x: 0, y: 0, width: width * progress.value, height }));
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bubbleLeft(cursor.value, width) }] }));
  const selected = points[Math.min(index, points.length - 1)];
  const text = selected ? `${selected.label} · ${formatValue(selected.value)}` : 'No data';
  const web = Platform.OS === 'web' ? ({ tabIndex: 0, onKeyDown: onKey, style: { position: 'absolute', inset: 0, touchAction: 'none' } } as object) : {};
  return <View style={{ width, height, backgroundColor: '#132d2b', borderRadius: 22, overflow: 'hidden' }}>
    <Canvas pointerEvents="none" style={{ width, height }}>
      {[0, 0.5, 1].map(t => <Line key={t} p1={vec(geometry.left, geometry.top + t * (geometry.bottom - geometry.top))} p2={vec(geometry.right, geometry.top + t * (geometry.bottom - geometry.top))} color="#294641" strokeWidth={1} />)}
      <Group clip={clip}>
        {geometry.area ? <Path path={geometry.area}><LinearGradient start={vec(0, geometry.top)} end={vec(0, geometry.bottom)} colors={[color, '#132d2b00']} /></Path> : null}
      </Group>
      {geometry.line ? <Path path={geometry.line} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" color={color} end={progress} /> : null}
      {selected ? <Group opacity={progress}><Line p1={lineStart} p2={lineEnd} color="#a5cec4" strokeWidth={1} /><Circle cx={cursor} cy={cy} r={10} color="#57dfb633" /><Circle cx={cursor} cy={cy} r={4.5} color={color} /><Circle cx={cursor} cy={cy} r={2} color="#132d2b" /></Group> : null}
    </Canvas>
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 9, width: 96, height: 30, backgroundColor: '#e0f7eb', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, bubbleStyle]}><Text numberOfLines={1} style={{ color: '#173c31', fontSize: 12, fontWeight: '600' }}>{text}</Text></Animated.View>
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 9, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 11, color: '#accec3' }}>{points[0]?.label}</Text><Text style={{ fontSize: 11, color: '#accec3' }}>{points[points.length - 1]?.label}</Text></View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: Math.max(0, points.length - 1), now: selected ? Math.min(index, points.length - 1) : 0, text }} accessibilityHint="Drag to explore readings. Swipe up or down to select the next or previous reading." accessibilityActions={[{ name: 'increment', label: 'Next reading' }, { name: 'decrement', label: 'Previous reading' }]} onAccessibilityAction={onAction} style={{ position: 'absolute', inset: 0 }} {...pan.panHandlers} {...web} />
  </View>;
}
