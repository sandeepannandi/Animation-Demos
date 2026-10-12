// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

export type LiquidTab = { id: string; label: string; icon: (selected: boolean) => ReactNode; disabled?: boolean };
export type LiquidTabsProps = {
  tabs: readonly LiquidTab[];
  activeId: string;
  onTabChange: (id: string) => void;
  bottomInset?: number;
  reducedMotion?: boolean;
  reduceTransparency?: boolean;
  /** Milliseconds the active tab must be held before its selection lens expands for sliding. */
  holdDelay?: number;
  /** Optional haptic adapter: fires when the hold starts and each time the slide lands on a new tab. */
  onFeedback?: () => void;
};

/**
 * Controlled, floating tab bar. Place after screen content; reserve 92 + bottomInset px.
 * Tap switches tabs. Holding the active tab expands only the selection lens with a bouncy spring and
 * starts a slide: drag left or right to move the lens across tabs, release and it settles
 * into the tab where it stopped with a small bounce. The bar itself never changes size. Taps,
 * the keyboard and screen readers keep working without the gesture; Reduce Motion drops
 * the springs and the bounce but keeps the slide.
 */
export function LiquidTabs({ tabs, activeId, onTabChange, bottomInset = 0, reducedMotion, reduceTransparency, holdDelay = 280, onFeedback }: LiquidTabsProps) {
  const [width, setWidth] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  // Start opaque until accessibility preferences have been read.
  const [systemTransparency, setSystemTransparency] = useState(true);
  const [systemMotion, setSystemMotion] = useState(true);
  const position = useRef(new Animated.Value(0)).current;
  const expand = useRef(new Animated.Value(0)).current;
  const track = useRef<View>(null);
  const trackLeft = useRef(-1);
  const scrub = useRef(false);
  const mounted = useRef(false);
  // Latest layout, selection and callbacks for gesture handlers that outlive renders.
  const gesture = useRef({ cell: 0, index: -1, ids: [] as string[], enabled: [] as boolean[], reduce: true });
  const callbacks = useRef({ onTabChange, onFeedback });
  callbacks.current = { onTabChange, onFeedback };
  useEffect(() => {
    let live = true;
    let transparencyChanged = false;
    let motionChanged = false;
    const t = AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => { transparencyChanged = true; setSystemTransparency(value); });
    const m = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { motionChanged = true; setSystemMotion(value); });
    if (Platform.OS === 'ios') void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (live && !transparencyChanged) setSystemTransparency(value); }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live && !motionChanged) setSystemMotion(value); }).catch(() => {});
    return () => { live = false; t.remove(); m.remove(); };
  }, []);
  const opaque = reduceTransparency ?? systemTransparency;
  const reduce = reducedMotion ?? systemMotion;
  const index = tabs.findIndex(tab => tab.id === activeId);
  const cell = tabs.length ? width / tabs.length : 0;
  gesture.current = { cell, index, ids: tabs.map(tab => tab.id), enabled: tabs.map(tab => !tab.disabled), reduce };
  const animateExpand = useCallback((toValue: number) => {
    expand.stopAnimation();
    if (gesture.current.reduce) expand.setValue(toValue);
    else Animated.spring(expand, { toValue, stiffness: 300, damping: 11, mass: 0.8, useNativeDriver: true }).start();
  }, [expand]);
  const measureTrack = useCallback(() => {
    trackLeft.current = -1;
    const node = track.current as unknown as { measureInWindow?: (cb: (x: number) => void) => void; getBoundingClientRect?: () => { left: number } } | null;
    try {
      if (node && typeof node.getBoundingClientRect === 'function') trackLeft.current = node.getBoundingClientRect().left;
      else if (node && typeof node.measureInWindow === 'function') node.measureInWindow(x => { trackLeft.current = x; });
    } catch { /* the next move retries with the sentinel check */ }
  }, []);
  const beginScrub = useCallback(() => {
    if (scrub.current || gesture.current.cell <= 0 || gesture.current.index < 0) return;
    scrub.current = true;
    setScrubbing(true);
    measureTrack();
    position.stopAnimation();
    callbacks.current.onFeedback?.();
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility('Slide left or right to choose a tab.');
    animateExpand(1);
  }, [animateExpand, measureTrack, position]);
  const endScrub = useCallback(() => {
    if (!scrub.current) return;
    scrub.current = false;
    setScrubbing(false);
    const toValue = Math.max(0, gesture.current.index) * gesture.current.cell;
    position.stopAnimation();
    if (gesture.current.reduce || gesture.current.cell <= 0) position.setValue(toValue);
    else Animated.spring(position, { toValue, stiffness: 340, damping: 15, mass: 0.8, useNativeDriver: true }).start();
    animateExpand(0);
  }, [animateExpand, position]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, state) => scrub.current && Math.abs(state.dx) > 2,
    onMoveShouldSetPanResponderCapture: (_event, state) => scrub.current && Math.abs(state.dx) > 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_event, state) => {
      const { cell: panCell, index: panIndex, ids, enabled } = gesture.current;
      if (!scrub.current || panCell <= 0 || !ids.length) return;
      if (trackLeft.current < 0) { measureTrack(); return; }
      const span = panCell * ids.length;
      const x = Math.min(Math.max(state.moveX - trackLeft.current, 0), span - 0.001);
      // The lens follows the finger, clamped inside the track.
      position.setValue(Math.min(Math.max(x - panCell / 2, 0), span - panCell));
      const next = Math.min(ids.length - 1, Math.floor(x / panCell));
      if (next !== panIndex && enabled[next]) {
        gesture.current.index = next;
        callbacks.current.onTabChange(ids[next]);
        callbacks.current.onFeedback?.();
      }
    },
    onPanResponderRelease: endScrub,
    onPanResponderTerminate: endScrub,
  }), [endScrub, measureTrack, position]);
  useEffect(() => {
    if (scrub.current) return undefined; // the gesture owns the lens while scrubbing
    position.stopAnimation();
    const toValue = Math.max(0, index) * cell;
    if (!mounted.current || reduce) position.setValue(toValue);
    else Animated.spring(position, { toValue, stiffness: 280, damping: 27, mass: 0.85, useNativeDriver: true }).start();
    mounted.current = width > 0;
    return () => position.stopAnimation();
  }, [index, cell, width, reduce, position]);
  // Safety net: never stay expanded across an unmount or a gesture that died silently.
  useEffect(() => () => { scrub.current = false; position.stopAnimation(); expand.stopAnimation(); }, [expand, position]);
  if (!tabs.length) return null;
  const nativeGlass = !opaque && Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  // Only the lens grows (transform, so layout and the bar stay put); 1.1 / 1.12 stays inside the 6px track margin.
  const lensScaleX = expand.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const lensScaleY = expand.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return <View style={[styles.anchor, { bottom: Math.max(0, bottomInset) + 12 }]}>
    <View style={styles.shell}>
      {nativeGlass ? <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme="light" />
        : !opaque && Platform.OS === 'ios' ? <BlurView pointerEvents="none" tint="light" intensity={65} style={StyleSheet.absoluteFill} />
        : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.opaque]} />}
      <View ref={track} {...pan.panHandlers} style={styles.track} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {index >= 0 && cell > 0 && <Animated.View pointerEvents="none" style={[styles.selection, { width: cell, transform: [{ translateX: position }, { scaleX: lensScaleX }, { scaleY: lensScaleY }] }]} />}
        {tabs.map(tab => {
          const selected = tab.id === activeId;
          return <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label}
            accessibilityHint={selected ? 'Hold, then slide left or right to switch tabs' : undefined}
            accessibilityState={{ selected, disabled: !!tab.disabled, expanded: selected && scrubbing }} disabled={tab.disabled}
            onPress={() => { if (!selected) { onTabChange(tab.id); onFeedback?.(); } else endScrub(); /* long hold without a slide ends here */ }}
            onLongPress={selected && !tab.disabled ? beginScrub : undefined} delayLongPress={holdDelay}
            style={({ pressed }) => [styles.tab, pressed && !scrubbing && styles.pressed, tab.disabled && styles.disabled]}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tabInner}>
              {tab.icon(selected)}
              <Text numberOfLines={1} style={[styles.label, selected && styles.activeLabel]}>{tab.label}</Text>
            </View>
          </Pressable>;
        })}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 440, borderRadius: 36, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffffa8', backgroundColor: '#ffffff18' },
  opaque: { backgroundColor: '#eff3ed' }, track: { flexDirection: 'row', margin: 6, position: 'relative' },
  selection: { position: 'absolute', top: 0, bottom: 0, borderRadius: 30, backgroundColor: '#ffffffb8', borderWidth: 1, borderColor: '#fff' },
  tab: { flex: 1, minHeight: 60, minWidth: 0, borderRadius: 30 },
  tabInner: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  label: { fontSize: 10, fontWeight: '500', color: '#53615d' }, activeLabel: { color: '#173f33', fontWeight: '700' },
  pressed: { backgroundColor: '#ffffff55' }, disabled: { opacity: 0.4 },
});
