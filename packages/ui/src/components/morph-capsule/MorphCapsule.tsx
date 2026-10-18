// Nativelet Morph Capsule. MIT: retain the accompanying LICENSE.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, View,
  type AccessibilityActionEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { clampState, cycleState, dragProgress, resolveState, stepState } from './morphMath';

export type CapsuleState = 'idle' | 'compact' | 'expanded';
export const CAPSULE_STATES: readonly CapsuleState[] = ['idle', 'compact', 'expanded'];
export interface CapsuleSize { width: number; height: number }

export const DEFAULT_SIZES: Record<CapsuleState, CapsuleSize> = {
  idle: { width: 124, height: 36 },
  compact: { width: 216, height: 52 },
  expanded: { width: 320, height: 172 },
};
const RADII: Record<CapsuleState, number> = { idle: 18, compact: 26, expanded: 34 };
const DRAG_RANGE = 120; // pixels of vertical drag for one full state

export interface MorphCapsuleProps {
  /** Controlled state. Omit to let the capsule manage it (see defaultState). */
  state?: CapsuleState;
  defaultState?: CapsuleState;
  onStateChange?: (state: CapsuleState) => void;
  /** One layer per state. Layers crossfade while the capsule morphs. Content is presentational. */
  content: Record<CapsuleState, ReactNode>;
  sizes?: Partial<Record<CapsuleState, CapsuleSize>>;
  /** Called when a user lands on a different state. Keep haptics in your adapter and handle its errors there. */
  onFeedback?: () => void;
  /** Omit to follow the system accessibility setting. */
  reducedMotion?: boolean;
  accessibilityLabel?: string;
  /** What a screen reader says for each state, appended to accessibilityLabel. */
  stateDescriptions?: Partial<Record<CapsuleState, string>>;
  style?: StyleProp<ViewStyle>;
}

export function MorphCapsule({
  state: stateProp, defaultState = 'idle', onStateChange, content, sizes, onFeedback, reducedMotion,
  accessibilityLabel = 'Morph capsule', stateDescriptions, style,
}: MorphCapsuleProps) {
  const count = CAPSULE_STATES.length;
  const [internal, setInternal] = useState<CapsuleState>(defaultState);
  const [systemReduced, setSystemReduced] = useState(true);
  const [, rerender] = useState(0);
  const requested = stateProp ?? internal;
  const index = clampState(CAPSULE_STATES.indexOf(requested), count);
  const reduce = reducedMotion ?? systemReduced;
  const size = (name: CapsuleState) => ({ ...DEFAULT_SIZES[name], ...sizes?.[name] });
  const idle = size('idle'), compact = size('compact'), expanded = size('expanded');

  const progress = useRef(new Animated.Value(index)).current;
  const current = useRef(index);
  const lastTarget = useRef<number | null>(index);
  const pendingVelocity = useRef(0);
  const drag = useRef({ active: false, start: 0, value: 0 });
  const blockPressUntil = useRef(0); // browsers send a click right after a drag ends
  const live = useRef({} as { index: number; commit: (next: number) => void; reduce: boolean });

  const commit = (next: number) => {
    if (next !== index) {
      const name = CAPSULE_STATES[next];
      onFeedback?.();
      if (stateProp === undefined) setInternal(name);
      onStateChange?.(name);
    }
    // Re-render so a controlled parent that refuses the change pulls the capsule back.
    rerender(tick => tick + 1);
  };
  live.current = { index, commit, reduce };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setSystemReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const id = progress.addListener(({ value }) => { current.current = value; });
    return () => progress.removeListener(id);
  }, [progress]);

  const settle = (target: number) => {
    // Starts from wherever the capsule is right now, so a tap or drag mid-morph is never ignored.
    progress.stopAnimation();
    lastTarget.current = target;
    const velocity = pendingVelocity.current;
    pendingVelocity.current = 0;
    (live.current.reduce
      ? Animated.timing(progress, { toValue: target, duration: 0, useNativeDriver: false })
      : Animated.spring(progress, { toValue: target, velocity, stiffness: 300, damping: 24, mass: 0.9, useNativeDriver: false })
    ).start();
  };
  // Keeps the animation in step with props (controlled changes, rejected changes, first mount).
  useEffect(() => {
    if (!drag.current.active && lastTarget.current !== index) settle(index);
  });

  const finish = (velocity: number) => {
    const state = drag.current;
    if (!state.active) return;
    state.active = false;
    blockPressUntil.current = Date.now() + 250;
    const target = resolveState(state.value, velocity, count);
    pendingVelocity.current = velocity;
    if (target === live.current.index) settle(target);
    else lastTarget.current = null;
    live.current.commit(target);
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Taps stay with the Pressable.
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      progress.stopAnimation(value => { current.current = value; });
      drag.current = { active: true, start: current.current, value: current.current };
    },
    onPanResponderMove: (_, gesture) => {
      const state = drag.current;
      if (!state.active) return;
      state.value = dragProgress(state.start, gesture.dy, DRAG_RANGE, count);
      current.current = state.value;
      progress.setValue(state.value);
    },
    onPanResponderRelease: (_, gesture) => finish(gesture.vy / DRAG_RANGE),
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => finish(0),
  })).current;

  const onAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'expand') commit(stepState(index, 1, count));
    else if (name === 'collapse') commit(stepState(index, -1, count));
  };

  const range = [0, 1, 2];
  const width = progress.interpolate({ inputRange: range, outputRange: [idle.width, compact.width, expanded.width] });
  const height = progress.interpolate({ inputRange: range, outputRange: [idle.height, compact.height, expanded.height] });
  const radius = progress.interpolate({
    inputRange: range, outputRange: [RADII.idle, RADII.compact, RADII.expanded], extrapolate: 'clamp',
  });
  const name = CAPSULE_STATES[index];
  const description = stateDescriptions?.[name];
  return (
    <View style={[styles.slot, { height: expanded.height }, style]}>
      <Animated.View {...responder.panHandlers} style={[styles.capsule, { width, height, borderRadius: radius }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel}, ${name}${description ? `. ${description}` : ''}`}
          accessibilityHint="Double tap to change size."
          accessibilityState={{ expanded: name === 'expanded' }}
          accessibilityActions={[
            ...(index < count - 1 ? [{ name: 'expand', label: 'Expand' }] : []),
            ...(index > 0 ? [{ name: 'collapse', label: 'Collapse' }] : []),
          ]}
          onAccessibilityAction={onAction}
          onPress={() => { if (!drag.current.active && Date.now() > blockPressUntil.current) commit(cycleState(index, count)); }}
          style={StyleSheet.absoluteFill}
        >
          {CAPSULE_STATES.map((layerName, layer) => {
            const box = size(layerName);
            const opacity = progress.interpolate({
              inputRange: [layer - 0.7, layer - 0.3, layer + 0.3, layer + 0.7], outputRange: [0, 1, 1, 0], extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={layerName} pointerEvents="none"
                accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[styles.layer, { width: box.width, height: box.height, marginLeft: -box.width / 2, marginTop: -box.height / 2, opacity }]}
              >
                {content[layerName]}
              </Animated.View>
            );
          })}
        </Pressable>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'flex-start' },
  capsule: { backgroundColor: '#10261d', overflow: 'hidden' },
  layer: { position: 'absolute', left: '50%', top: '50%' },
});
