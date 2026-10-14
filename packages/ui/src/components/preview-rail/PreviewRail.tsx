// Nativelet Preview Rail. MIT: retain the accompanying LICENSE.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, Text, View,
  type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { adjacentIndex, indexFromPosition, selectedIndex } from './selection';

export interface PreviewRailItem {
  id: string;
  label: string;
  description?: string;
}
export interface PreviewRailProps<T extends PreviewRailItem> {
  items: readonly T[];
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  renderPreview?: (item: T) => ReactNode;
  orientation?: 'vertical' | 'horizontal';
  /** Called only when a user moves onto a different item. Keep errors inside your adapter. */
  onSelectionFeedback?: () => void;
  /** Omit to follow the system accessibility setting. */
  reducedMotion?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function PreviewRail<T extends PreviewRailItem>({
  items, activeId, defaultActiveId, onActiveChange, renderPreview,
  orientation = 'vertical', onSelectionFeedback, reducedMotion,
  accessibilityLabel = 'Preview rail', style,
}: PreviewRailProps<T>) {
  const [internalId, setInternalId] = useState(defaultActiveId ?? items[0]?.id);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [systemReduced, setSystemReduced] = useState(true);
  const requested = activeId ?? internalId;
  const selected = selectedIndex(items.map(item => item.id), requested);
  const displayed = previewId === null ? selected : selectedIndex(items.map(item => item.id), previewId);
  const reduce = reducedMotion ?? systemReduced;
  const horizontal = orientation === 'horizontal';
  const progress = useRef(new Animated.Value(Math.max(0, displayed))).current;
  const fade = useRef(new Animated.Value(1)).current;
  const extent = useRef(0);
  const railRef = useRef<View>(null);
  const origin = useRef(0);
  const lastFeedbackId = useRef<string | undefined>(undefined);
  const dragging = useRef(false);
  const dragIndex = useRef(-1);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setSystemReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { live = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    // External selection/data changes cancel a stale preview rather than committing it later.
    dragging.current = false;
    dragIndex.current = -1;
    setPreviewId(null);
  }, [activeId, items, orientation]);
  useEffect(() => {
    const animation = reduce
      ? Animated.timing(progress, { toValue: Math.max(0, displayed), duration: 0, useNativeDriver: true })
      : Animated.spring(progress, { toValue: Math.max(0, displayed), stiffness: 230, damping: 25, mass: 0.9, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [displayed, progress, reduce]);
  useEffect(() => {
    if (reduce) { fade.setValue(1); return; }
    fade.setValue(0.55);
    const animation = Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [displayed, fade, reduce]);

  const feedback = (id: string) => {
    if (lastFeedbackId.current !== id) {
      lastFeedbackId.current = id;
      onSelectionFeedback?.();
    }
  };
  const commit = (index: number) => {
    const item = items[index];
    if (!item) return;
    setPreviewId(null);
    if (item.id !== items[selected]?.id) {
      if (activeId === undefined) setInternalId(item.id);
      feedback(item.id);
      onActiveChange?.(item.id);
    }
  };
  const move = (position: number) => {
    const index = indexFromPosition(position - 4, extent.current - 8, items.length);
    if (index >= 0) {
      dragIndex.current = index;
      setPreviewId(items[index].id);
      feedback(items[index].id);
    }
  };
  // Recreated with the latest props, so callbacks and controlled value never go stale.
  const dbg = (m: string) => console.log('RAILDBG ' + Date.now() + ' ' + m);
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Keep ordinary presses/focus accessible.
    onMoveShouldSetPanResponder: (_, gesture) =>
      items.length > 1 && (horizontal
        ? Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
        : Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx)),
    onPanResponderGrant: event => {
      dbg('grant');
      dragging.current = true;
      lastFeedbackId.current = items[selected]?.id;
      railRef.current?.measureInWindow((x, y) => { origin.current = horizontal ? x : y; });
      move((horizontal ? event.nativeEvent.pageX : event.nativeEvent.pageY) - origin.current);
    },
    onPanResponderMove: event => {
      if (dragging.current) move((horizontal ? event.nativeEvent.pageX : event.nativeEvent.pageY) - origin.current);
    },
    onPanResponderRelease: () => {
      dbg('release dragIndex=' + dragIndex.current);
      if (dragging.current) commit(dragIndex.current);
      dragging.current = false;
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      dbg('terminate'); dragging.current = false; dragIndex.current = -1; setPreviewId(null); },
  });
  const measure = (event: LayoutChangeEvent) => {
    extent.current = horizontal ? event.nativeEvent.layout.width : event.nativeEvent.layout.height;
    railRef.current?.measureInWindow((x, y) => { origin.current = horizontal ? x : y; });
  };
  if (!items.length) return <View style={[styles.empty, style]}><Text style={styles.description}>No previews available.</Text></View>;
  const item = items[displayed];
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.body, horizontal && styles.horizontalBody]}>
        <View
          ref={railRef} onLayout={measure} {...responder.panHandlers}
          onTouchStart={e => dbg('touchStart y=' + Math.round(e.nativeEvent.pageY))}
          onTouchEnd={e => dbg('touchEnd y=' + Math.round(e.nativeEvent.pageY))}
          onTouchCancel={() => dbg('touchCancel')}
          style={[styles.rail, horizontal ? styles.horizontalRail : styles.verticalRail]}
          accessibilityLabel={accessibilityLabel}
        >
          {items.map((entry, index) => {
            const scale = progress.interpolate({
              inputRange: [index - 2, index - 1, index, index + 1, index + 2],
              outputRange: [0.25, 0.55, 1, 0.55, 0.25], extrapolate: 'clamp',
            });
            return (
              <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entry.label}
                accessibilityState={{ selected: index === selected }}
                onPressIn={() => dbg('pressIn ' + entry.id)}
                onPress={() => { dbg('press ' + entry.id + ' dragging=' + dragging.current); if (!dragging.current) commit(index); }}
                style={({ pressed }) => [styles.target, horizontal && styles.horizontalTarget, pressed && styles.pressed]}>
                <Animated.View pointerEvents="none" style={[
                  styles.tick, horizontal && styles.horizontalTick,
                  { backgroundColor: index === displayed ? '#193f30' : '#809889', transform: horizontal ? [{ scaleY: scale }] : [{ scaleX: scale }] },
                ]} />
              </Pressable>
            );
          })}
        </View>
        <Animated.View style={[styles.preview, { opacity: fade }]} accessibilityLiveRegion="polite">
          {renderPreview ? renderPreview(item) : <View style={styles.defaultPreview}>
            <Text accessibilityRole="header" style={styles.label}>{item.label}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          </View>}
        </Animated.View>
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous preview" disabled={selected <= 0}
          accessibilityState={{ disabled: selected <= 0 }} onPress={() => commit(adjacentIndex(selected, -1, items.length))}
          style={({ pressed }) => [styles.control, selected <= 0 && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.controlText}>Previous</Text>
        </Pressable>
        <Text style={styles.count}>{selected + 1} / {items.length}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next preview" disabled={selected >= items.length - 1}
          accessibilityState={{ disabled: selected >= items.length - 1 }} onPress={() => commit(adjacentIndex(selected, 1, items.length))}
          style={({ pressed }) => [styles.control, selected >= items.length - 1 && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.controlText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 20 }, body: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  horizontalBody: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  rail: { backgroundColor: '#edf2e9', borderRadius: 24, padding: 4 },
  verticalRail: { width: 52 }, horizontalRail: { flexDirection: 'row', alignSelf: 'center' },
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  horizontalTarget: { width: 44, height: 44 },
  tick: { width: 34, height: 3, borderRadius: 2 }, horizontalTick: { width: 3, height: 34 },
  pressed: { backgroundColor: '#d7e7c9' },
  preview: { flex: 1, minWidth: 0 }, defaultPreview: { padding: 18, borderRadius: 20, backgroundColor: '#fff', gap: 12 },
  label: { color: '#193f30', fontSize: 22, fontWeight: '700' },
  description: { color: '#4b6053', fontSize: 15, lineHeight: 23 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  control: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14, backgroundColor: '#e4edde' },
  controlText: { color: '#244735', fontSize: 13, fontWeight: '600' }, count: { color: '#4b6053', fontSize: 12 },
  disabled: { opacity: 0.5 }, empty: { padding: 20 },
});
