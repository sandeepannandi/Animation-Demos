import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { clamp, edgeSpeed, indexAt, move, slotFor } from './sortLogic';
export type SortFeedback = 'lift' | 'cross' | 'drop' | 'cancel' | 'move';
export type DragToSortProps<T> = {
  items: readonly T[]; keyExtractor: (item: T) => string; labelExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onOrderChange: (items: T[]) => void; onFeedback?: (event: SortFeedback) => void;
  rowHeight?: number; gap?: number; height?: number; reducedMotion?: boolean; style?: StyleProp<ViewStyle>;
};
type Drag = { id: string; from: number; to: number; startScroll: number; dy: number; localY: number; settling: boolean };
/** Fixed-height, non-virtualized list. Rows move, viewport and total content height do not. */
export function DragToSort<T>({ items, keyExtractor, labelExtractor, renderItem, onOrderChange, onFeedback, rowHeight = 72, gap = 10, height = 350, reducedMotion, style }: DragToSortProps<T>) {
  const step = Math.max(1, rowHeight + gap);
  const signature = items.map(keyExtractor).join('\u0000');
  if (new Set(items.map(keyExtractor)).size !== items.length) throw new Error('DragToSort needs unique keys');
  const [order, setOrder] = useState(items.map(keyExtractor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const scroll = useRef<ScrollView>(null); const viewport = useRef<View>(null);
  const scrollY = useRef(0); const viewportY = useRef(0); const measuredHeight = useRef(height);
  const drag = useRef<Drag | null>(null); const raf = useRef<number | null>(null); const lastTime = useRef(0);
  const positions = useRef(new Map<string, Animated.Value>()); const lift = useRef(new Animated.Value(0)).current;
  const latest = useRef({ order, items, keyExtractor, labelExtractor, onOrderChange, onFeedback, reduce, step });
  latest.current = { order, items, keyExtractor, labelExtractor, onOrderChange, onFeedback, reduce, step };
  const value = (id: string, i: number) => { if (!positions.current.has(id)) positions.current.set(id, new Animated.Value(i * step)); return positions.current.get(id)!; };
  order.forEach(value);
  const spring = (v: Animated.Value, to: number, done?: () => void) => {
    v.stopAnimation();
    const animation = latest.current.reduce ? Animated.timing(v, { toValue: to, duration: 100, useNativeDriver: false }) : Animated.spring(v, { toValue: to, stiffness: 310, damping: 27, mass: 0.8, useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) done?.(); });
  };
  const stopFrame = () => { if (raf.current !== null) cancelAnimationFrame(raf.current); raf.current = null; };
  const announce = (id: string, index: number) => { const item = latest.current.items.find(x => latest.current.keyExtractor(x) === id); if (item) AccessibilityInfo.announceForAccessibility(`${latest.current.labelExtractor(item)}, position ${index + 1} of ${latest.current.order.length}`); };
  const update = (dy?: number, pageY?: number) => {
    const d = drag.current; if (!d || d.settling) return;
    if (dy !== undefined) d.dy = dy; if (pageY !== undefined) d.localY = pageY - viewportY.current;
    const { order: ids, step: s } = latest.current;
    const top = clamp(d.from * s + d.dy + scrollY.current - d.startScroll, 0, (ids.length - 1) * s);
    positions.current.get(d.id)?.setValue(top);
    const to = indexAt(top, s, ids.length);
    if (to !== d.to) {
      d.to = to; latest.current.onFeedback?.('cross');
      ids.forEach((id, i) => { if (id !== d.id) spring(value(id, i), slotFor(i, d.from, to) * s); });
    }
  };
  const frame = (time: number) => {
    const d = drag.current; if (!d || d.settling) return;
    const dt = Math.min(32, Math.max(0, time - lastTime.current)); lastTime.current = time;
    const max = Math.max(0, latest.current.order.length * latest.current.step - gap - measuredHeight.current);
    const next = clamp(scrollY.current + edgeSpeed(d.localY, measuredHeight.current) * dt / 1000, 0, max);
    if (next !== scrollY.current) { scrollY.current = next; scroll.current?.scrollTo({ y: next, animated: false }); update(); }
    raf.current = requestAnimationFrame(frame);
  };
  const begin = (id: string, pageY: number) => {
    if (drag.current) return;
    const from = latest.current.order.indexOf(id); if (from < 0) return;
    viewport.current?.measureInWindow((_x, y) => { viewportY.current = y; });
    positions.current.get(id)?.stopAnimation();
    drag.current = { id, from, to: from, startScroll: scrollY.current, dy: 0, localY: pageY - viewportY.current, settling: false };
    setActiveId(id); spring(lift, 1); latest.current.onFeedback?.('lift'); announce(id, from);
    lastTime.current = performance.now(); raf.current = requestAnimationFrame(frame);
  };
  const finish = (cancel = false) => {
    const d = drag.current; if (!d || d.settling) return;
    stopFrame(); d.settling = true;
    const next = cancel ? [...latest.current.order] : move(latest.current.order, d.from, d.to);
    const target = cancel ? d.from : d.to;
    // Keep the lifted row above its neighbors until its settle is complete.
    next.forEach((id, i) => spring(value(id, i), i * latest.current.step, id === d.id ? () => {
      if (drag.current !== d) return;
      drag.current = null; setActiveId(null); setOrder(next); lift.setValue(0);
      if (!cancel && d.from !== d.to) { const byId = new Map(latest.current.items.map(item => [latest.current.keyExtractor(item), item])); latest.current.onOrderChange(next.map(id => byId.get(id)!)); }
      announce(d.id, target);
    } : undefined));
    spring(lift, 0); latest.current.onFeedback?.(cancel ? 'cancel' : 'drop');
  };
  const shift = (id: string, delta: number) => {
    if (drag.current) return;
    const from = latest.current.order.indexOf(id), to = clamp(from + delta, 0, latest.current.order.length - 1);
    if (from === to) return;
    const next = move(latest.current.order, from, to); setOrder(next);
    next.forEach((key, i) => spring(value(key, i), i * step));
    const byId = new Map(latest.current.items.map(item => [latest.current.keyExtractor(item), item]));
    latest.current.onOrderChange(next.map(key => byId.get(key)!)); latest.current.onFeedback?.('move'); announce(id, to);
    const y = to * step; if (y < scrollY.current || y + rowHeight > scrollY.current + measuredHeight.current) scroll.current?.scrollTo({ y: clamp(y, 0, next.length * step - measuredHeight.current), animated: !latest.current.reduce });
  };
  const functions = useRef({ begin, update, finish, shift }); functions.current = { begin, update, finish, shift };
  useEffect(() => {
    let alive = true; void AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => { alive = false; sub.remove(); stopFrame(); positions.current.forEach(v => v.stopAnimation()); lift.stopAnimation(); };
  }, [lift]);
  useEffect(() => {
    const keys = items.map(keyExtractor);
    if (keys.join('\u0000') !== latest.current.order.join('\u0000')) {
      stopFrame(); drag.current = null; setActiveId(null); lift.stopAnimation(); lift.setValue(0);
      setOrder(keys); keys.forEach((id, i) => { value(id, i).stopAnimation(); value(id, i).setValue(i * step); });
    }
    // Data/order changes cancel an in-flight gesture rather than committing stale data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, step]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (!drag.current) return false; functions.current.finish(true); return true; });
    return () => sub.remove();
  }, []);
  const byId = new Map(items.map(item => [keyExtractor(item), item]));
  return <View style={style}>
    <View ref={viewport} onLayout={() => viewport.current?.measureInWindow((_x, y, _w, h) => { viewportY.current = y; measuredHeight.current = h; })} style={{ height, overflow: 'hidden', borderRadius: 18 }}>
      <ScrollView ref={scroll} scrollEnabled={!activeId} scrollEventThrottle={16} onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }} contentContainerStyle={{ height: Math.max(0, order.length * step - gap) }}>
        {order.map((id, index) => {
          const item = byId.get(id); if (!item) return null;
          return <SortRow key={id} id={id} index={index} count={order.length} label={labelExtractor(item)} height={rowHeight} y={value(id, index)} lift={lift} active={activeId === id} reduce={reduce} functions={functions}>
            {renderItem(item, index)}
          </SortRow>;
        })}
      </ScrollView>
    </View>
    {activeId ? <Pressable onPress={() => finish(true)} accessibilityRole="button" style={styles.cancel}><Text>Cancel reorder</Text></Pressable> : null}
  </View>;
}
type Ops = { begin: (id: string, y: number) => void; update: (dy?: number, pageY?: number) => void; finish: (cancel?: boolean) => void; shift: (id: string, delta: number) => void };
// Handle owns the responder immediately. Outside the handle the ScrollView scrolls normally.
function SortRow({ id, index, count, label, height, y, lift, active, reduce, functions, children }: { id: string; index: number; count: number; label: string; height: number; y: Animated.Value; lift: Animated.Value; active: boolean; reduce: boolean; functions: React.MutableRefObject<Ops>; children: ReactNode }) {
  const start = useRef(0);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: e => { start.current = e.nativeEvent.pageY; functions.current.begin(id, start.current); },
    onPanResponderMove: (e, g) => { functions.current.update(g.dy, e.nativeEvent.pageY); },
    onPanResponderRelease: () => functions.current.finish(),
    onPanResponderTerminate: () => functions.current.finish(true),
    onPanResponderTerminationRequest: () => false,
  })).current;
  const handlers = { ...pan.panHandlers };
  return <Animated.View style={[styles.row, { height, zIndex: active ? 100 : 0, borderColor: active ? '#91ad82' : '#e0e9dc', backgroundColor: active ? '#f7faef' : '#fff', transform: [{ translateY: y }, { scale: active && !reduce ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) : 1 }] }]}>
    <View style={styles.content}>{children}</View>
    <View {...handlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${label}, position ${index + 1} of ${count}. Drag handle`} accessibilityHint="Drag to reorder, or use Move up and Move down actions." accessibilityActions={[...(index > 0 ? [{ name: 'decrement', label: 'Move up' }] : []), ...(index < count - 1 ? [{ name: 'increment', label: 'Move down' }] : [])]} onAccessibilityAction={e => functions.current.shift(id, e.nativeEvent.actionName === 'decrement' ? -1 : 1)} {...(Platform.OS === 'web' ? { tabIndex: 0, onKeyDown: (e: { key: string; preventDefault: () => void; stopPropagation: () => void }) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); functions.current.finish(true); } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); functions.current.shift(id, e.key === 'ArrowUp' ? -1 : 1); } } } : {})} style={styles.handle}><Text accessible={false} style={styles.grip}>⠿</Text></View>
  </Animated.View>;
}
const styles = StyleSheet.create({ row: { position: 'absolute', left: 8, right: 8, top: 0, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e9dc' }, content: { flex: 1, padding: 14 }, handle: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' }, grip: { fontSize: 28, color: '#637e6b' }, cancel: { padding: 12, alignSelf: 'center' } });
