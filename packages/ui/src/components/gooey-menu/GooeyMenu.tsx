import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Blur, Canvas, Circle, ColorMatrix, Group, Paint } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { clamp, gooMatrix, itemPose, layout, mainRotation, type GooeyGeometry } from './gooeyMath';

export type GooeyMenuItem = { id: string; label: string; glyph: string };
export type GooeyFeedback = 'open' | 'close' | 'select';
export type GooeyMenuProps = {
  items: GooeyMenuItem[];
  onSelect?: (item: GooeyMenuItem) => void;
  onOpenChange?: (open: boolean) => void;
  onFeedback?: (event: GooeyFeedback) => void;
  label?: string;
  color?: string;
  iconColor?: string;
  mainRadius?: number;
  itemRadius?: number;
  distance?: number;
  /** Fan start and end, degrees from +x, -90 is straight up. Limited to -180..0. */
  startAngle?: number;
  endAngle?: number;
  /** Blur sigma. Higher is gooier; keep it near a third of the item radius. */
  blur?: number;
  reducedMotion?: boolean;
};

const PAD = 24;

function Blob({ progress, index, count, geo }: { progress: SharedValue<number>; index: number; count: number; geo: GooeyGeometry }) {
  const cx = useDerivedValue(() => geo.originX + itemPose(progress.value, index, count, geo).x);
  const cy = useDerivedValue(() => geo.originY + itemPose(progress.value, index, count, geo).y);
  const r = useDerivedValue(() => itemPose(progress.value, index, count, geo).radius);
  return <Circle cx={cx} cy={cy} r={r} />;
}

function ItemButton({ item, progress, index, count, geo, open, iconColor, onPress }: { item: GooeyMenuItem; progress: SharedValue<number>; index: number; count: number; geo: GooeyGeometry; open: boolean; iconColor: string; onPress: (item: GooeyMenuItem) => void }) {
  const size = geo.itemRadius * 2;
  const style = useAnimatedStyle(() => {
    const pose = itemPose(progress.value, index, count, geo);
    return { opacity: clamp((pose.t - 0.5) / 0.4, 0, 1), transform: [{ translateX: pose.x }, { translateY: pose.y }, { scale: clamp(pose.radius / geo.itemRadius, 0.01, 1.2) }] };
  });
  return (
    <Animated.View pointerEvents={open ? 'box-none' : 'none'} style={[styles.abs, { left: geo.originX - geo.itemRadius, top: geo.originY - geo.itemRadius, width: size, height: size }, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.label} disabled={!open} onPress={() => onPress(item)} hitSlop={6} style={[styles.fill, { borderRadius: geo.itemRadius }]}>
        <Text style={{ color: iconColor, fontSize: geo.itemRadius * 0.85, textAlign: 'center' }} accessible={false}>{item.glyph}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function GooeyMenu({ items, onSelect, onOpenChange, onFeedback, label = 'Create', color = '#204835', iconColor = '#f4f6ef', mainRadius = 32, itemRadius = 26, distance = 104, startAngle = -165, endAngle = -15, blur = 9, reducedMotion }: GooeyMenuProps) {
  const [open, setOpen] = useState(false);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const progress = useSharedValue(0);
  const latest = useRef({ onSelect, onOpenChange, onFeedback });
  latest.current = { onSelect, onOpenChange, onFeedback };
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  const box = layout(distance, mainRadius, itemRadius, PAD);
  const geo = useMemo<GooeyGeometry>(() => ({ distance, mainRadius, itemRadius, start: startAngle, end: endAngle, stagger: reduce ? 0 : 0.3, originX: box.originX, originY: box.originY }), [distance, mainRadius, itemRadius, startAngle, endAngle, reduce, box.originX, box.originY]);
  const matrix = useMemo(() => gooMatrix(), []);
  const move = useCallback((next: boolean) => {
    setOpen(next);
    progress.value = reduce ? withTiming(next ? 1 : 0, { duration: 140 }) : withSpring(next ? 1 : 0, { stiffness: 170, damping: 14, mass: 1 });
    latest.current.onOpenChange?.(next);
    latest.current.onFeedback?.(next ? 'open' : 'close');
    AccessibilityInfo.announceForAccessibility?.(next ? `${label} menu open` : `${label} menu closed`);
  }, [label, progress, reduce]);
  const choose = useCallback((item: GooeyMenuItem) => { latest.current.onSelect?.(item); latest.current.onFeedback?.('select'); move(false); }, [move]);
  useEffect(() => { if (items.length === 0 && open) move(false); }, [items.length, open, move]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${mainRotation(progress.value)}deg` }] }));
  const keyProps = Platform.OS === 'web' ? { onKeyDown: (event: { key: string; stopPropagation: () => void }) => { if (event.key === 'Escape' && open) { event.stopPropagation(); move(false); } } } : {};
  const mainSize = mainRadius * 2;
  return (
    <View {...keyProps} style={{ width: box.width, height: box.height, alignSelf: 'center' }}>
      <Canvas pointerEvents="none" style={{ position: 'absolute', width: box.width, height: box.height }}>
        <Group layer={<Paint><Blur blur={blur} /><ColorMatrix matrix={matrix} /></Paint>} color={color}>
          <Circle cx={box.originX} cy={box.originY} r={mainRadius} />
          {items.map((item, index) => <Blob key={item.id} progress={progress} index={index} count={items.length} geo={geo} />)}
        </Group>
      </Canvas>
      <View accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} pointerEvents="box-none" style={styles.fill}>
        {items.map((item, index) => <ItemButton key={item.id} item={item} progress={progress} index={index} count={items.length} geo={geo} open={open} iconColor={iconColor} onPress={choose} />)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={label} aria-expanded={open} accessibilityState={{ expanded: open, disabled: items.length === 0 }} accessibilityHint={open ? 'Closes the menu' : 'Opens the menu'} disabled={items.length === 0} onPress={() => move(!open)} hitSlop={6} style={[styles.abs, { left: box.originX - mainRadius, top: box.originY - mainRadius, width: mainSize, height: mainSize, borderRadius: mainRadius, alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View style={[{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }, spin]}>
          <View style={{ position: 'absolute', width: 22, height: 2.5, borderRadius: 2, backgroundColor: iconColor }} />
          <View style={{ position: 'absolute', width: 2.5, height: 22, borderRadius: 2, backgroundColor: iconColor }} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({ abs: { position: 'absolute' }, fill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' } });
