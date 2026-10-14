import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { anchorAt, anchorScroll, cellSize, clamp, contentHeight, distance, edgeSpeed, pinchProgress, pinchTarget, rangeSelection, shouldCommit, tileAtPoint, tileRect, type Anchor, type Rect } from './pinchLogic';
export type GalleryFeedback = 'pinch-start' | 'snap' | 'select-start' | 'select-change' | 'select-end' | 'cancel';
export type PinchGalleryProps<T> = {
  items: readonly T[]; keyExtractor: (item: T) => string; labelExtractor: (item: T) => string;
  /** Fill the tile. It is laid out at the animated tile size, so use width/height 100% and avoid fixed sizes. */
  renderItem: (item: T, info: { selected: boolean; columns: number }) => ReactNode;
  columns?: number; onColumnsChange?: (columns: number) => void; columnSteps?: readonly number[];
  selectedIds?: readonly string[]; onSelectionChange?: (ids: string[]) => void;
  onItemPress?: (item: T, index: number) => void; onFeedback?: (event: GalleryFeedback) => void;
  gap?: number; height?: number; accentColor?: string; reducedMotion?: boolean; style?: StyleProp<ViewStyle>;
};
type Layout = { from: number; to: number };
type Pt = { x: number; y: number };
const LONG_PRESS_MS = 320;
/** Fixed-height, non-virtualized photo-style grid. Pinch to change density around your fingers, hold a tile and drag to select. */
export function PinchGallery<T>({ items, keyExtractor, labelExtractor, renderItem, columns, onColumnsChange, columnSteps = [2, 3, 5], selectedIds, onSelectionChange, onItemPress, onFeedback, gap = 6, height = 460, accentColor = '#1f9d6b', reducedMotion, style }: PinchGalleryProps<T>) {
  const ids = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);
  if (new Set(ids).size !== ids.length) throw new Error('PinchGallery needs unique keys');
  const steps = useMemo(() => [...columnSteps].sort((a, b) => a - b), [columnSteps]);
  const [innerCols, setInnerCols] = useState(steps[Math.min(1, steps.length - 1)]);
  const cols = columns ?? innerCols;
  const [innerSel, setInnerSel] = useState<string[]>([]);
  const selection: readonly string[] = selectedIds ?? innerSel;
  const [width, setWidth] = useState(0);
  const [layout, setLayoutState] = useState<Layout>({ from: cols, to: cols });
  const [locked, setLocked] = useState(false);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const t = useRef(new Animated.Value(0)).current, tValue = useRef(0);
  const layoutRef = useRef(layout), setLayout = (next: Layout) => { layoutRef.current = next; setLayoutState(next); };
  const scrollRef = useRef<ScrollView>(null), scrollY = useRef(0), rootRef = useRef<View>(null), origin = useRef<Pt>({ x: 0, y: 0 });
  const anchor = useRef<{ a: Anchor; focalY: number } | null>(null);
  const pinch = useRef<{ d0: number; startCols: number; stepIndex: number; ratio: number } | null>(null);
  const animating = useRef(false), pendingTransition = useRef(false);
  const select = useRef<{ base: string[]; from: number; mode: 'add' | 'remove'; last: number } | null>(null);
  const finger = useRef<Pt>({ x: 0, y: 0 }), timer = useRef<ReturnType<typeof setTimeout>>(undefined), scroller = useRef<ReturnType<typeof setInterval>>(undefined);
  const live = useRef({ ids, selection, width, height, cols, count: items.length, gap });
  live.current = { ids, selection, width, height, cols, count: items.length, gap };
  const feedback = useRef(onFeedback); feedback.current = onFeedback;
  const emitColumns = useRef(onColumnsChange); emitColumns.current = onColumnsChange;
  const emitSelection = useRef(onSelectionChange); emitSelection.current = onSelectionChange;

  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then(v => { if (on) setSystemReduce(v); }).catch(() => {}); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce); return () => { on = false; sub.remove(); }; }, []);
  useEffect(() => { const id = t.addListener(({ value }) => { tValue.current = value; applyAnchor(value); }); return () => t.removeListener(id); }, [t]);
  useEffect(() => () => { clearTimeout(timer.current); clearInterval(scroller.current); t.stopAnimation(); }, [t]);

  const setSelection = useCallback((next: string[]) => {
    const cur = live.current.selection; if (next.length === cur.length && next.every((id, i) => id === cur[i])) return;
    live.current.selection = next; setInnerSel(next); emitSelection.current?.(next);
  }, []);
  function applyAnchor(value: number) {
    const a = anchor.current, l = live.current; if (!a) return;
    const y = anchorScroll(a.a, layoutRef.current.from, layoutRef.current.to, value, l.count, l.width, l.gap, a.focalY, l.height);
    scrollRef.current?.scrollTo({ y, animated: false }); scrollY.current = y;
  }
  const run = (to: number, done: () => void) => {
    animating.current = true; t.stopAnimation();
    const finish = ({ finished }: { finished: boolean }) => { animating.current = false; if (finished) done(); };
    if (reduce) Animated.timing(t, { toValue: to, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(finish);
    else Animated.spring(t, { toValue: to, stiffness: 260, damping: 26, mass: 0.9, useNativeDriver: false }).start(finish);
  };
  // Lock the ScrollView as soon as a second finger lands, instead of waiting for the setLocked render. On the Android emulator a vertical or diagonal pinch was cancelled mid-gesture without this. The native value is set directly and restored in settle so it cannot drift from React state.
  const lockScrollNow = () => (scrollRef.current as any)?.setNativeProps?.({ scrollEnabled: false });
  const unlockScrollNow = () => (scrollRef.current as any)?.setNativeProps?.({ scrollEnabled: true });
  const settle = (to: number) => { applyAnchor(tValue.current); setLayout({ from: to, to }); anchor.current = null; setLocked(false); unlockScrollNow(); };

  // Columns changed from outside (segmented control, state restore): blend there around the viewport center.
  useEffect(() => {
    if (pinch.current || animating.current || cols === layoutRef.current.to || live.current.width <= 0) return;
    anchor.current = { a: anchorAt(scrollY.current + live.current.height / 2, live.current.count, layoutRef.current.to, live.current.width, live.current.gap), focalY: live.current.height / 2 };
    pendingTransition.current = true; t.setValue(0); setLayout({ from: layoutRef.current.to, to: cols });
  }, [cols]);
  useEffect(() => {
    if (!pendingTransition.current || layout.from === layout.to) return; pendingTransition.current = false;
    const target = layout.to; run(1, () => settle(target));
  }, [layout]);

  const pointOf = (e: GestureResponderEvent, i: number): Pt => { const touch = e.nativeEvent.touches[i]; return { x: touch.pageX - origin.current.x, y: touch.pageY - origin.current.y }; };
  const measure = () => rootRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => { origin.current = { x: pageX, y: pageY }; });
  const beginPinch = (e: GestureResponderEvent) => {
    clearTimeout(timer.current); if (select.current) endSelect(true);
    if (animating.current) { t.stopAnimation(); animating.current = false; }
    const l = live.current, a = pointOf(e, 0), b = pointOf(e, 1), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const start = layoutRef.current.to, stepIndex = steps.indexOf(start) >= 0 ? steps.indexOf(start) : steps.reduce((best, s, i) => Math.abs(s - start) < Math.abs(steps[best] - start) ? i : best, 0);
    t.setValue(0); setLayout({ from: start, to: start });
    anchor.current = { a: anchorAt(scrollY.current + mid.y, l.count, start, l.width, l.gap, mid.x), focalY: mid.y };
    pinch.current = { d0: Math.max(1, distance(a, b)), startCols: start, stepIndex, ratio: 1 }; setLocked(true); feedback.current?.('pinch-start');
  };
  const movePinch = (e: GestureResponderEvent) => {
    const p = pinch.current, a = anchor.current; if (!p || !a) return;
    const A = pointOf(e, 0), B = pointOf(e, 1); p.ratio = distance(A, B) / p.d0; a.focalY = (A.y + B.y) / 2;
    const target = steps[pinchTarget(p.stepIndex, p.ratio, steps)], w = live.current.width, g = live.current.gap;
    if (target !== layoutRef.current.to) setLayout({ from: p.startCols, to: target });
    const progress = target === p.startCols ? 0 : pinchProgress(p.ratio, cellSize(w, p.startCols, g), cellSize(w, target, g));
    t.setValue(progress); applyAnchor(progress);
  };
  const endPinch = () => {
    const p = pinch.current; if (!p) return; pinch.current = null;
    const to = layoutRef.current.to, commit = to !== p.startCols && shouldCommit(tValue.current);
    const target = commit ? to : p.startCols;
    if (!commit && to !== p.startCols) feedback.current?.('cancel');
    run(commit ? 1 : 0, () => { settle(target); if (commit) { setInnerCols(target); emitColumns.current?.(target); feedback.current?.('snap'); } });
  };

  // Hold a tile, then drag across others to paint a range. Near an edge the grid scrolls.
  const updateSelect = () => {
    const s = select.current, l = live.current; if (!s) return;
    const idx = tileAtPoint(finger.current.x, scrollY.current + finger.current.y, l.count, layoutRef.current.to, l.width, l.gap); if (idx < 0) return;
    if (idx !== s.last) { s.last = idx; feedback.current?.('select-change'); }
    setSelection(rangeSelection(l.ids, s.base, s.from, idx, s.mode));
  };
  const startSelect = (index: number) => {
    if (pinch.current || animating.current || select.current) return; const l = live.current, id = l.ids[index];
    select.current = { base: [...l.selection], from: index, last: index, mode: l.selection.includes(id) ? 'remove' : 'add' }; setLocked(true); feedback.current?.('select-start');
    updateSelect(); let last = Date.now();
    scroller.current = setInterval(() => {
      const now = Date.now(), dt = Math.min(48, now - last); last = now; const lv = live.current;
      const speed = edgeSpeed(finger.current.y, lv.height); if (!speed) return;
      const max = Math.max(0, contentHeight(lv.count, layoutRef.current.to, lv.width, lv.gap) - lv.height), next = clamp(scrollY.current + speed * dt / 1000, 0, max);
      if (next === scrollY.current) return; scrollY.current = next; scrollRef.current?.scrollTo({ y: next, animated: false }); updateSelect();
    }, 16);
  };
  function endSelect(cancel = false) {
    const s = select.current; if (!s) return; select.current = null; clearInterval(scroller.current);
    if (cancel) setSelection(s.base); setLocked(false); feedback.current?.(cancel ? 'cancel' : 'select-end');
  }
  const toggle = (index: number) => { const id = live.current.ids[index], cur = live.current.selection; setSelection(cur.includes(id) ? cur.filter(x => x !== id) : live.current.ids.filter(x => x === id || cur.includes(x))); };

  const onTouchStart = (e: GestureResponderEvent) => { const n = e.nativeEvent.touches.length; if (n === 1) { measure(); finger.current = { x: e.nativeEvent.touches[0].pageX - origin.current.x, y: e.nativeEvent.touches[0].pageY - origin.current.y }; } if (n === 2 && !pinch.current) { lockScrollNow(); beginPinch(e); } };
  const onTouchMove = (e: GestureResponderEvent) => {
    const n = e.nativeEvent.touches.length;
    if (pinch.current) { if (n >= 2) movePinch(e); else endPinch(); return; }
    if (n >= 1) { finger.current = pointOf(e, 0); if (select.current) updateSelect(); }
  };
  const onTouchEnd = (e: GestureResponderEvent) => { const n = e.nativeEvent.touches.length; if (pinch.current && n < 2) endPinch(); if (n === 0) { endSelect(); } };
  const onTouchCancel = () => { if (pinch.current) endPinch(); endSelect(true); };

  const onLayout = (e: LayoutChangeEvent) => { setWidth(Math.round(e.nativeEvent.layout.width)); measure(); };
  const settled = layout.from === layout.to;
  const fullHeight = width > 0 ? (settled ? contentHeight(items.length, layout.to, width, gap) : Math.max(contentHeight(items.length, layout.from, width, gap), contentHeight(items.length, layout.to, width, gap))) : 0;
  const selectedSet = useMemo(() => new Set(selection), [selection]);
  return <View ref={rootRef} collapsable={false} style={[{ height }, style]} onLayout={onLayout} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
    <ScrollView ref={scrollRef} scrollEnabled={!locked} scrollEventThrottle={16} onScroll={e => { if (!anchor.current && !select.current) scrollY.current = e.nativeEvent.contentOffset.y; }} showsVerticalScrollIndicator={false} contentContainerStyle={{ height: fullHeight }} style={styles.scroll}>
      {width > 0 && items.map((item, index) => {
        const id = ids[index], a = tileRect(index, layout.from, width, gap), b = tileRect(index, layout.to, width, gap), selected = selectedSet.has(id);
        return <Tile key={id} a={a} b={b} t={t} selected={selected} label={labelExtractor(item)} accent={accentColor} reduce={reduce} hasSelection={selection.length > 0}
          onPress={() => { if (selection.length > 0) toggle(index); else onItemPress?.(item, index); }} onLongPress={() => startSelect(index)} onToggle={() => toggle(index)}>
          {renderItem(item, { selected, columns: cols })}
        </Tile>;
      })}
    </ScrollView>
  </View>;
}
type TileProps = { a: Rect; b: Rect; t: Animated.Value; selected: boolean; label: string; accent: string; reduce: boolean; hasSelection: boolean; onPress: () => void; onLongPress: () => void; onToggle: () => void; children: ReactNode };
const Tile = memo(function Tile({ a, b, t, selected, label, accent, reduce, hasSelection, onPress, onLongPress, onToggle, children }: TileProps) {
  const pos = useMemo(() => ({
    left: t.interpolate({ inputRange: [0, 1], outputRange: [a.x, b.x], extrapolate: 'clamp' }), top: t.interpolate({ inputRange: [0, 1], outputRange: [a.y, b.y], extrapolate: 'clamp' }),
    width: t.interpolate({ inputRange: [0, 1], outputRange: [a.w, b.w], extrapolate: 'clamp' }), height: t.interpolate({ inputRange: [0, 1], outputRange: [a.h, b.h], extrapolate: 'clamp' }),
  }), [t, a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h]);
  const sel = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) Animated.timing(sel, { toValue: selected ? 1 : 0, duration: 100, useNativeDriver: true }).start();
    else Animated.spring(sel, { toValue: selected ? 1 : 0, stiffness: 340, damping: selected ? 17 : 26, mass: 0.7, useNativeDriver: true }).start();
  }, [selected, reduce, sel]);
  const inset = reduce ? 1 : sel.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] });
  const badge = sel.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.6, 1] });
  const tick = sel.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  return <Animated.View style={[styles.tile, pos]}>
    <Pressable style={StyleSheet.absoluteFill} delayLongPress={LONG_PRESS_MS} onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
      accessibilityHint={hasSelection ? 'Double tap to toggle selection' : 'Double tap and hold to start selecting'} accessibilityActions={[{ name: 'activate' }, { name: 'longpress', label: selected ? 'Deselect' : 'Select' }]}
      onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'longpress') onToggle(); else onPress(); }}>
      <Animated.View style={[styles.inner, { transform: [{ scale: inset }], borderRadius: selected ? 10 : 4 }]}>{children}</Animated.View>
      <Animated.View pointerEvents="none" style={[styles.badge, { backgroundColor: accent, opacity: badge, transform: [{ scale: badge }] }]}>
        <Animated.View style={[styles.tick, { opacity: tick, transform: [{ rotate: '-45deg' }, { scaleX: tick }, { translateY: -1 }] }]} />
      </Animated.View>
    </Pressable>
  </Animated.View>;
});
const styles = StyleSheet.create({
  scroll: { flex: 1 }, tile: { position: 'absolute' }, inner: { flex: 1, overflow: 'hidden' },
  badge: { position: 'absolute', right: 8, bottom: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  tick: { width: 10, height: 5, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#ffffff' },
});
