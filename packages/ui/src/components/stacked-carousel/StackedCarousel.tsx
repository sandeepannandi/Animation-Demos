import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { clamp, dragPosition, snap } from './carouselLogic';
export type CarouselItem = { id: string; label: string };
export type StackedCarouselProps<T extends CarouselItem> = {
  items: readonly T[]; renderCard: (item: T, index: number) => React.ReactNode;
  initialIndex?: number; cardHeight?: number; reducedMotion?: boolean;
  onIndexChange?: (index: number) => void; onFeedback?: (event: 'select' | 'settle') => void;
  label?: string;
};
export function StackedCarousel<T extends CarouselItem>({ items, renderCard, initialIndex = 0, cardHeight = 300, reducedMotion, onIndexChange, onFeedback, label = 'Card carousel' }: StackedCarouselProps<T>) {
  const initial = clamp(Math.round(initialIndex), 0, Math.max(0, items.length - 1));
  const position = useRef(new Animated.Value(initial)).current;
  const live = useRef(initial), selected = useRef(initial), start = useRef(initial), epoch = useRef(0), dragging = useRef(false);
  const [active, setActive] = useState(initial), [front, setFront] = useState(initial), [width, setWidth] = useState(340), [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const latest = useRef({ items, onIndexChange, onFeedback, reduce }); latest.current = { items, onIndexChange, onFeedback, reduce };
  useEffect(() => { let alive = true; AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setSystemReduce(v); }).catch(() => {}); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce); return () => { alive = false; sub.remove(); }; }, []);
  useEffect(() => { const listener = position.addListener(({ value }) => { live.current = value; setFront(Math.round(clamp(value, 0, Math.max(0, latest.current.items.length - 1)))); }); return () => { position.removeListener(listener); epoch.current++; position.stopAnimation(); }; }, [position]);
  const signature = JSON.stringify(items.map(item => item.id));
  useEffect(() => { epoch.current++; dragging.current = false; position.stopAnimation(); const i = clamp(selected.current, 0, Math.max(0, items.length - 1)); selected.current = i; live.current = i; position.setValue(i); setActive(i); setFront(i); }, [signature, position]);
  function settle(index: number, feedback = true) {
    const next = clamp(Math.round(index), 0, Math.max(0, latest.current.items.length - 1));
    const token = ++epoch.current; dragging.current = false; position.stopAnimation();
    const animation = latest.current.reduce ? Animated.timing(position, { toValue: next, duration: 100, useNativeDriver: false }) : Animated.spring(position, { toValue: next, stiffness: 260, damping: 25, mass: 0.9, useNativeDriver: false });
    animation.start(({ finished }) => { if (!finished || token !== epoch.current) return; const changed = selected.current !== next; selected.current = next; setActive(next); if (changed) { latest.current.onIndexChange?.(next); if (feedback) latest.current.onFeedback?.('settle'); AccessibilityInfo.announceForAccessibility(`${latest.current.items[next]?.label ?? ''}, ${next + 1} of ${latest.current.items.length}`); } });
  }
  const settleRef = useRef(settle); settleRef.current = settle;
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => latest.current.items.length > 1 && Math.abs(g.dx) > 7 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
    onPanResponderGrant: () => { epoch.current++; dragging.current = true; position.stopAnimation(); start.current = live.current; latest.current.onFeedback?.('select'); },
    onPanResponderMove: (_, g) => { if (dragging.current) position.setValue(dragPosition(start.current, g.dx, latest.current.items.length)); },
    onPanResponderRelease: (_, g) => { if (dragging.current) settleRef.current(snap(live.current, g.vx, Math.round(start.current), latest.current.items.length)); },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => settleRef.current(selected.current, false),
  })).current;
  const move = (delta: number) => settle(selected.current + delta);
  const keyProps = Platform.OS === 'web' ? { onKeyDown: (event: { key: string; preventDefault: () => void; stopPropagation: () => void }) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } else if (event.key === 'Escape' && dragging.current) { event.preventDefault(); event.stopPropagation(); settle(selected.current, false); } } } : {};
  if (!items.length) return <View accessibilityLabel={`${label}, empty`} />;
  const cardWidth = Math.min(270, Math.max(120, width - 100));
  return <View style={styles.root}>
    <View {...keyProps} {...responder.panHandlers} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: cardHeight + 75, width: '100%' }} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 1, max: items.length, now: active + 1, text: `${items[active]?.label}, ${active + 1} of ${items.length}` }} accessibilityActions={[{ name: 'increment', label: 'Next card' }, { name: 'decrement', label: 'Previous card' }]} onAccessibilityAction={e => move(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      {items.map((item, i) => {
        const range = [i - 3, i - 2, i - 1, i, i + 1, i + 2, i + 3];
        const interp = (outputRange: number[] | string[]) => position.interpolate({ inputRange: range, outputRange, extrapolate: 'clamp' });
        const hidden = i !== active;
        return <Animated.View key={item.id} pointerEvents={Math.abs(i - front) <= 1 ? 'auto' : 'none'} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} style={[styles.card, { top: 12, left: (width - cardWidth) / 2, width: cardWidth, height: cardHeight, zIndex: 100 - Math.abs(i - front), opacity: interp([0, 1, 1, 1, 1, 1, 0]), transform: [{ perspective: 900 }, { translateX: interp([198,132,66,0,-66,-132,-198]) }, { translateY: reduce ? 0 : interp([45,30,15,0,15,30,45]) }, { scale: reduce ? 1 : interp([0.72,0.76,0.88,1,0.88,0.76,0.72]) }, { rotateY: reduce ? '0deg' : interp(['-42deg','-28deg','-14deg','0deg','14deg','28deg','42deg']) }] }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}, card ${i + 1} of ${items.length}`} onPress={() => { if (!dragging.current) settle(i); }} style={{ flex: 1 }}>{renderCard(item, i)}</Pressable>
        </Animated.View>;
      })}
    </View>
    <View style={styles.dots}>{items.map((item, i) => <Pressable key={item.id} onPress={() => settle(i)} accessibilityRole="button" accessibilityLabel={`Show ${item.label}`} accessibilityState={{ selected: i === active }} style={styles.dotHit}><Animated.View style={[styles.dot, { opacity: position.interpolate({ inputRange: [i-1,i,i+1], outputRange: [0.35,1,0.35], extrapolate: 'clamp' }), transform: [{ scaleX: reduce ? 1 : position.interpolate({ inputRange: [i-1,i,i+1], outputRange: [1,2.8,1], extrapolate: 'clamp' }) }] }]} /></Pressable>)}</View>
    <View style={styles.controls}><Pressable disabled={active === 0} accessibilityRole="button" accessibilityLabel="Previous card" onPress={() => move(-1)} style={styles.button}><Text>← Previous</Text></Pressable><Text accessibilityLiveRegion="polite">{active + 1} / {items.length}</Text><Pressable disabled={active === items.length - 1} accessibilityRole="button" accessibilityLabel="Next card" onPress={() => move(1)} style={styles.button}><Text>Next →</Text></Pressable></View>
  </View>;
}
const styles = StyleSheet.create({ root: { width: '100%' }, card: { position: 'absolute', borderRadius: 24, backgroundColor: '#e5edda', shadowColor: '#183c2d', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 5 }, dots: { flexDirection: 'row', justifyContent: 'center' }, dotHit: { width: 30, height: 44, alignItems: 'center', justifyContent: 'center' }, dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: '#204835' }, controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }, button: { padding: 12, minHeight: 44, borderRadius: 14, backgroundColor: '#e6edde' } });
