// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
  onFeedback?: () => void;
};

/** Controlled, floating tab bar. Place after screen content; reserve 92 + bottomInset px. */
export function LiquidTabs({ tabs, activeId, onTabChange, bottomInset = 0, reducedMotion, reduceTransparency, onFeedback }: LiquidTabsProps) {
  const [width, setWidth] = useState(0);
  // Start opaque until accessibility preferences have been read.
  const [systemTransparency, setSystemTransparency] = useState(true);
  const [systemMotion, setSystemMotion] = useState(true);
  const position = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  useEffect(() => {
    let live = true;
    let transparencyChanged = false;
    let motionChanged = false;
    const t = AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => { transparencyChanged = true; setSystemTransparency(value); });
    const m = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { motionChanged = true; setSystemMotion(value); });
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (live && !transparencyChanged) setSystemTransparency(value); }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live && !motionChanged) setSystemMotion(value); }).catch(() => {});
    return () => { live = false; t.remove(); m.remove(); };
  }, []);
  const opaque = reduceTransparency ?? systemTransparency;
  const reduce = reducedMotion ?? systemMotion;
  const index = tabs.findIndex(tab => tab.id === activeId);
  const cell = tabs.length ? width / tabs.length : 0;
  useEffect(() => {
    position.stopAnimation();
    const toValue = Math.max(0, index) * cell;
    if (!mounted.current || reduce) position.setValue(toValue);
    else Animated.spring(position, { toValue, stiffness: 280, damping: 27, mass: 0.85, useNativeDriver: true }).start();
    mounted.current = width > 0;
    return () => position.stopAnimation();
  }, [index, cell, width, reduce, position]);
  if (!tabs.length) return null;
  const nativeGlass = !opaque && Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  return <View style={[styles.anchor, { bottom: Math.max(0, bottomInset) + 12 }]}>
    <View style={styles.shell}>
      {nativeGlass ? <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme="light" />
        : !opaque && Platform.OS === 'ios' ? <BlurView pointerEvents="none" tint="light" intensity={65} style={StyleSheet.absoluteFill} />
        : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.opaque]} />}
      <View style={styles.track} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {index >= 0 && cell > 0 && <Animated.View pointerEvents="none" style={[styles.selection, { width: cell, transform: [{ translateX: position }] }]} />}
        {tabs.map(tab => {
          const selected = tab.id === activeId;
          return <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label}
            accessibilityState={{ selected, disabled: !!tab.disabled }} disabled={tab.disabled}
            onPress={() => { if (!selected) { onTabChange(tab.id); onFeedback?.(); } }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed, tab.disabled && styles.disabled]}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{tab.icon(selected)}</View>
            <Text numberOfLines={1} style={[styles.label, selected && styles.activeLabel]}>{tab.label}</Text>
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
  tab: { flex: 1, minHeight: 60, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, borderRadius: 30 },
  label: { fontSize: 10, fontWeight: '500', color: '#53615d' }, activeLabel: { color: '#173f33', fontWeight: '700' },
  pressed: { backgroundColor: '#ffffff55' }, disabled: { opacity: 0.4 },
});
