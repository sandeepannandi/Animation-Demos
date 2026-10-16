import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Group, Path, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { breathPhase, clamp, deformation, hexToRgb, insetBounds, pickBody, popKick, shade, spawnBodies, stepBodies, withAlpha, DEFAULT_PHYSICS, type BubbleBody, type BubblePointer } from './physicsMath';

export type BubbleItem = { id: string; label: string; color?: string };
export type BubbleFeedback = 'grab' | 'fling' | 'select' | 'deselect';
export type BubblePickerProps = {
  items: BubbleItem[];
  /** Controlled selection. Omit (with defaultSelectedIds) for uncontrolled. */
  selectedIds?: readonly string[];
  defaultSelectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  onFeedback?: (event: BubbleFeedback, id: string) => void;
  multiSelect?: boolean;
  width?: number;
  height?: number;
  label?: string;
  reducedMotion?: boolean;
  /** Steps the simulation about four times slower so you can watch the collisions. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
};

const PALETTE = ['#e2725b', '#f2a65a', '#7fb069', '#5ca4a9', '#8e7cc3', '#d6679a', '#f0c05a', '#5b8e7d', '#588b8b', '#c8553d'];
const PAD = 10;

export function itemColor(item: BubbleItem, index: number) {
  return item.color ?? PALETTE[index % PALETTE.length];
}

// One bubble's Skia half: shaded water balloon - drop shadow, gradient body,
// rim light and a soft gradient body - plus the selection glow and burst.
function BubbleBall({ bodies, index, initial, color, clock, reduceM }: { bodies: SharedValue<BubbleBody[]>; index: number; initial: BubbleBody; color: string; clock: SharedValue<number>; reduceM: SharedValue<boolean> }) {
  const R = useMemo(() => initial.baseR, [initial]);
  const phase = useMemo(() => breathPhase(initial.id), [initial]);
  const hi = useMemo(() => shade(color, 0.6), [color]);
  const edge = useMemo(() => shade(color, -0.2), [color]);
  const rim = useMemo(() => shade(color, 0.42), [color]);
  const rimPath = useMemo(() => {
    const rr = R - 2.5, a1 = 0.44, a2 = 1.31;
    return `M ${Math.cos(a1) * rr} ${Math.sin(a1) * rr} A ${rr} ${rr} 0 0 1 ${Math.cos(a2) * rr} ${Math.sin(a2) * rr}`;
  }, [R]);
  const r = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? b.r * b.scale : 0;
  });
  const transform = useDerivedValue(() => {
    const b = bodies.value[index];
    if (!b) return [{ translateX: -9999 }, { translateY: -9999 }];
    if (reduceM.value) return [{ translateX: b.x }, { translateY: b.y }];
    const d = deformation(b, clock.value, phase);
    return [{ translateX: b.x }, { translateY: b.y }, { rotateZ: d.angle }, { scaleX: d.sx }, { scaleY: d.sy }];
  });
  const glow = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? clamp(b.glow, 0, 1) : 0;
  });
  const bloomR = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? R * (1 + 0.42 * clamp(b.glow, 0, 1)) : 0;
  });
  const burstR = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? R * (1 + clamp(b.burst, 0, 1.4) * 0.85) : 0;
  });
  const burstO = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? clamp(1 - b.burst, 0, 1) * 0.85 : 0;
  });
  const coreO = useDerivedValue(() => {
    const b = bodies.value[index];
    return b ? clamp(b.glow, 0, 1) * 0.6 : 0;
  });
  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={bloomR} opacity={glow}>
        <RadialGradient c={vec(0, 0)} r={R * 1.42} colors={[withAlpha(color, 0.5), withAlpha(color, 0)]} />
      </Circle>
      <Circle cx={0} cy={0} r={r}>
        <RadialGradient c={vec(-R * 0.3, -R * 0.35)} r={R * 1.75} colors={[hi, color, edge]} />
        <Shadow dx={0} dy={R * 0.16} blur={R * 0.3} color="rgba(6, 20, 14, 0.45)" />
      </Circle>
      <Path path={rimPath} style="stroke" strokeWidth={2.5} strokeCap="round" color={rim} opacity={0.6} />
      <Circle cx={0} cy={0} r={r} opacity={coreO}>
        <RadialGradient c={vec(0, 0)} r={R} colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} />
      </Circle>
      <Circle cx={0} cy={0} r={burstR} style="stroke" strokeWidth={3} color="#ffffff" opacity={burstO} />
    </Group>
  );
}

// One bubble's DOM half: upright label and the accessible press target.
function BubbleLabel({ bodies, index, initial, item, color, selected, onToggle }: { bodies: SharedValue<BubbleBody[]>; index: number; initial: BubbleBody; item: BubbleItem; color: string; selected: boolean; onToggle: (id: string) => void }) {
  const width = useMemo(() => initial.baseR * 2 + 28, [initial]);
  const style = useAnimatedStyle(() => {
    const b = bodies.value[index];
    if (!b) return { left: -9999, top: -9999, opacity: 0 };
    return { left: b.x - width / 2, top: b.y - 16, opacity: 1 };
  });
  const ink = useMemo(() => { const [r, g, b] = hexToRgb(color); return r * 0.3 + g * 0.59 + b * 0.11 > 150 ? '#23312b' : '#ffffff'; }, [color]);
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', width, height: 32, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => onToggle(item.id)} hitSlop={8} style={({ pressed }) => [{ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: ink, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function BubblePicker({ items, selectedIds, defaultSelectedIds, onSelectionChange, onFeedback, multiSelect = true, width = 340, height = 380, label = 'Choose topics', reducedMotion, slowMotion = false }: BubblePickerProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const [internal, setInternal] = useState<readonly string[]>(defaultSelectedIds ?? []);
  const selection = selectedIds ?? internal;
  const bounds = useMemo(() => insetBounds(width, height, PAD), [width, height]);
  const bodies = useSharedValue<BubbleBody[]>([]);
  // Children read per-bubble constants (baseR, id) at mount. They receive
  // them from this React state copy of the spawn - never from the shared
  // value - so mounting can never race the shared-value write (it crashed
  // on native with bodies.value[index] undefined when it did).
  const [spawn, setSpawn] = useState<{ key: string; bodies: BubbleBody[] } | null>(null);
  const pointer = useSharedValue<BubblePointer>({ x: 0, y: 0, active: 0 });
  const clock = useSharedValue(0);
  const reduceM = useSharedValue(false);
  const grabbedIndex = useRef(-1);
  const latest = useRef({ items, selection, onSelectionChange, onFeedback, multiSelect, reduce });
  latest.current = { items, selection, onSelectionChange, onFeedback, multiSelect, reduce };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); };
  }, []);

  useEffect(() => { reduceM.value = reduce; }, [reduce, reduceM]);

  // Spawn once per item set; pre-selected bubbles start lit, with no burst.
  useEffect(() => {
    const seeded = spawnBodies(items, bounds).map(b => {
      const sel = latest.current.selection.includes(b.id) ? 1 : 0;
      return { ...b, selected: sel, glow: sel, burst: 1 };
    });
    bodies.value = seeded;
    grabbedIndex.current = -1;
    pointer.value = { x: 0, y: 0, active: 0 };
    setSpawn({ key: items.map(i => i.id).join('\u0001'), bodies: seeded });
  }, [items, bounds, bodies, pointer]);

  useEffect(() => {
    // Never rewrite an empty array: right after spawn the JS-side read can
    // still observe the pre-spawn value, and writing that back would wipe
    // the freshly spawned bodies (this dead-locked the whole component on
    // native).
    if (bodies.value.length === 0) return;
    bodies.value = bodies.value.map(b => {
      const sel = latest.current.selection.includes(b.id) ? 1 : 0;
      return sel === b.selected ? b : { ...b, selected: sel, scaleV: b.scaleV + popKick(sel), burst: 0, burstV: 0 };
    });
  }, [selection, bodies]);

  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 16;
    const scaled = latest.current.reduce ? Math.min(dt, 48) : dt * (slowMotion ? 0.25 : 1);
    clock.value += scaled / 1000;
    const opts = latest.current.reduce
      ? { ...DEFAULT_PHYSICS, gravity: 0, drag: 2.6 }
      : DEFAULT_PHYSICS;
    bodies.value = stepBodies(bodies.value, scaled, bounds, pointer.value, opts);
    if (latest.current.reduce) {
      // Reduce Motion: settle the decorative oscillators immediately.
      bodies.value = bodies.value.map(b => ({ ...b, wob: 0, wobV: 0, scale: 1, scaleV: 0 }));
    }
  });

  const toggle = useCallback((id: string) => {
    const cur = latest.current.selection;
    const on = cur.includes(id);
    let next: readonly string[];
    if (on) next = cur.filter(x => x !== id);
    else next = latest.current.multiSelect ? [...cur, id] : [id];
    if (!selectedIds) setInternal(next);
    latest.current.onSelectionChange?.([...next]);
    latest.current.onFeedback?.(on ? 'deselect' : 'select', id);
  }, [selectedIds]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX, y = e.nativeEvent.locationY;
      const idx = pickBody(bodies.value, x, y);
      grabbedIndex.current = idx;
      pointer.value = { x, y, active: 1 };
      if (idx >= 0) {
        bodies.value = bodies.value.map((b, i) => (i === idx ? { ...b, grabbed: 1 } : b));
        latest.current.onFeedback?.('grab', bodies.value[idx].id);
      }
    },
    onPanResponderMove: (e) => { pointer.value = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, active: 1 }; },
    onPanResponderRelease: (e, g) => {
      const idx = grabbedIndex.current;
      pointer.value = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, active: 0 };
      if (idx >= 0) {
        const kick = clamp(Math.hypot(g.vx, g.vy) * 1000, 0, DEFAULT_PHYSICS.maxSpeed);
        bodies.value = bodies.value.map((b, i) => (i === idx ? { ...b, grabbed: 0, vx: g.vx * 900, vy: g.vy * 900 } : b));
        latest.current.onFeedback?.(kick > 500 ? 'fling' : 'grab', bodies.value[idx].id);
        grabbedIndex.current = -1;
      }
    },
    onPanResponderTerminate: (e) => {
      const idx = grabbedIndex.current;
      pointer.value = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, active: 0 };
      if (idx >= 0) { bodies.value = bodies.value.map((b, i) => (i === idx ? { ...b, grabbed: 0 } : b)); grabbedIndex.current = -1; }
    },
  }), [bodies, pointer]);

  return (
    <View style={{ width, height, borderRadius: 24, backgroundColor: '#10201a', overflow: 'hidden' }} accessibilityLabel={label}>
      <Canvas pointerEvents="none" style={{ width, height }}>
        {spawn && spawn.key === items.map(i => i.id).join('\u0001') && items.map((item, i) => <BubbleBall key={item.id} bodies={bodies} index={i} initial={spawn.bodies[i]} color={itemColor(item, i)} clock={clock} reduceM={reduceM} />)}
      </Canvas>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {spawn && spawn.key === items.map(i => i.id).join('\u0001') && items.map((item, i) => <BubbleLabel key={item.id} bodies={bodies} index={i} initial={spawn.bodies[i]} item={item} color={itemColor(item, i)} selected={selection.includes(item.id)} onToggle={toggle} />)}
      </View>
    </View>
  );
}
