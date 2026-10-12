// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { ACTION_WIDTH, dragOffset, isHorizontalIntent, openOffset, outermostIndex, pastCommit, settleOutcome, type SwipeGeometry, type SwipeSide } from './swipeLogic';

export type SwipeAction = {
  id: string;
  label: string;
  /** Optional glyph or icon element shown above the label. */
  icon?: ReactNode;
  backgroundColor: string;
  color?: string;
  /**
   * Runs when the user picks the action. If `removesRow` is true it runs after the undo window
   * ends (or immediately when `undoDuration` is 0), once the row has collapsed.
   */
  onPress: () => void;
  /** Slides the row away, shows an undo strip, then collapses the row. Use for delete and archive. */
  removesRow?: boolean;
  /** Text on the undo strip, for example "Archived". Defaults to the label. */
  completedLabel?: string;
  accessibilityLabel?: string;
};
export type SwipeFeedbackEvent = 'open' | 'threshold' | 'commit' | 'undo';
export type SwipeRowProps = {
  children: ReactNode;
  /** Revealed by swiping right. The first action is outermost and is the full-swipe action. */
  leadingActions?: readonly SwipeAction[];
  /** Revealed by swiping left. The last action is outermost and is the full-swipe action. */
  trailingActions?: readonly SwipeAction[];
  /** Commit the outermost action by swiping most of the way across. Default true. */
  fullSwipe?: boolean;
  /** Milliseconds the undo strip stays after a removing action. 0 removes immediately. Default 4000. */
  undoDuration?: number;
  /** Row content tap. A tap on an open row only closes it. */
  onPress?: () => void;
  onUndo?: (action: SwipeAction) => void;
  /** Optional haptic adapter. Fires on open, crossing the full-swipe point, commit and undo. */
  onFeedback?: (event: SwipeFeedbackEvent) => void;
  reducedMotion?: boolean;
  disabled?: boolean;
  /** Must be opaque, it covers the actions. Default white. */
  rowBackground?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type GroupApi = { register: (id: number, close: () => void) => () => void; focus: (id: number) => void; closeAll: () => void };
const GroupContext = createContext<GroupApi | null>(null);
let nextRowId = 1;

/** Wrap a list in this so opening or dragging one row closes the others. */
export function SwipeRowGroup({ children }: { children: ReactNode }) {
  const rows = useRef(new Map<number, () => void>());
  const api = useMemo<GroupApi>(() => ({
    register: (id, close) => { rows.current.set(id, close); return () => { rows.current.delete(id); }; },
    focus: id => rows.current.forEach((close, key) => { if (key !== id) close(); }),
    closeAll: () => rows.current.forEach(close => close()),
  }), []);
  return <GroupContext.Provider value={api}>{children}</GroupContext.Provider>;
}
/** Returns a function that closes every open row in the group. Call it from onScrollBeginDrag. */
export function useCloseSwipeRows() {
  const group = useContext(GroupContext);
  return useCallback(() => group?.closeAll(), [group]);
}

const BIG = 10000;
type Phase = 'idle' | 'pending' | 'gone';
type Pending = { action: SwipeAction; timer: ReturnType<typeof setTimeout> | null };

export function SwipeRow({ children, leadingActions = [], trailingActions = [], fullSwipe = true, undoDuration = 4000, onPress, onUndo, onFeedback, reducedMotion, disabled, rowBackground = '#ffffff', accessibilityLabel, style }: SwipeRowProps) {
  const group = useContext(GroupContext);
  const id = useRef(0);
  if (!id.current) id.current = nextRowId++;
  const x = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(1)).current;
  const offset = useRef(0); // where the row is, or is heading
  const start = useRef(0);
  const crossed = useRef(false);
  const lastDrag = useRef(0); // web fires a click after a drag, it must not count as a tap
  const pending = useRef<Pending | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [openSide, setOpenSide] = useState<SwipeSide | null>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [stripAction, setStripAction] = useState<SwipeAction | null>(null);
  const [systemMotion, setSystemMotion] = useState(true); // assume reduced until the setting is read
  useEffect(() => {
    let live = true;
    let changed = false;
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setSystemMotion(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live && !changed) setSystemMotion(value); }).catch(() => {});
    return () => { live = false; sub.remove(); };
  }, []);
  const reduce = reducedMotion ?? systemMotion;

  const geometry: SwipeGeometry = {
    rowWidth,
    leadingWidth: leadingActions.length * ACTION_WIDTH,
    trailingWidth: trailingActions.length * ACTION_WIDTH,
    leadingFull: fullSwipe && leadingActions.length > 0,
    trailingFull: fullSwipe && trailingActions.length > 0,
  };
  // Handlers outlive renders, so they read the latest props through one ref.
  const live = useRef({ geometry, leadingActions, trailingActions, undoDuration, onUndo, onFeedback, reduce, disabled: !!disabled, phase, openSide });
  live.current = { geometry, leadingActions, trailingActions, undoDuration, onUndo, onFeedback, reduce, disabled: !!disabled, phase, openSide };

  const moveTo = useCallback((to: number, velocity: number, done?: () => void) => {
    offset.current = to;
    x.stopAnimation();
    if (live.current.reduce) {
      Animated.timing(x, { toValue: to, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => { if (finished) done?.(); });
    } else {
      // Animated.spring takes velocity in px per second, gesture velocity is px per ms.
      Animated.spring(x, { toValue: to, velocity: velocity * 1000, stiffness: 320, damping: 26, mass: 1, useNativeDriver: false }).start(({ finished }) => { if (finished) done?.(); });
    }
  }, [x]);

  const close = useCallback(() => {
    if (live.current.phase !== 'idle' || offset.current === 0) return;
    setOpenSide(null);
    moveTo(0, 0);
  }, [moveTo]);
  useEffect(() => group?.register(id.current, close), [group, close]);

  const finalize = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    current.timer = null;
    const finish = () => { if (pending.current !== current) return; pending.current = null; setPhase('gone'); current.action.onPress(); };
    if (live.current.reduce) { collapse.setValue(0); finish(); return; }
    Animated.timing(collapse, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => { if (finished) finish(); });
  }, [collapse]);
  // A removal still waiting when the row unmounts is committed, never silently lost.
  useEffect(() => () => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    if (current.timer) clearTimeout(current.timer);
    current.action.onPress();
  }, []);

  const remove = useCallback((action: SwipeAction, side: SwipeSide) => {
    live.current.onFeedback?.('commit');
    setOpenSide(null);
    setStripAction(action);
    setPhase('pending');
    live.current.phase = 'pending';
    const entry: Pending = { action, timer: null };
    pending.current = entry;
    const target = side === 'leading' ? live.current.geometry.rowWidth : -live.current.geometry.rowWidth;
    if (live.current.undoDuration > 0) {
      void AccessibilityInfo.announceForAccessibility(`${action.completedLabel ?? action.label}. Undo available.`);
      entry.timer = setTimeout(finalize, live.current.undoDuration);
      moveTo(target, 0);
    } else {
      moveTo(target, 0, finalize);
    }
  }, [finalize, moveTo]);

  const run = useCallback((action: SwipeAction, side: SwipeSide) => {
    if (live.current.phase !== 'idle') return;
    if (action.removesRow) { remove(action, side); return; }
    live.current.onFeedback?.('commit');
    setOpenSide(null);
    moveTo(0, 0);
    action.onPress();
  }, [moveTo, remove]);

  const undo = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    pending.current = null;
    collapse.stopAnimation();
    collapse.setValue(1);
    live.current.onFeedback?.('undo');
    live.current.onUndo?.(current.action);
    live.current.phase = 'idle';
    setPhase('idle');
    setStripAction(null);
    setOpenSide(null);
    moveTo(0, 0);
  }, [moveTo, collapse]);

  const pan = useMemo(() => PanResponder.create({
    // Capture on the way down so a Pressable inside the row cannot keep a horizontal swipe.
    onMoveShouldSetPanResponderCapture: (_, g) => {
      const { disabled: off, phase: p, geometry: geo } = live.current;
      return !off && p === 'idle' && geo.rowWidth > 0 && (geo.leadingWidth > 0 || geo.trailingWidth > 0) && isHorizontalIntent(g.dx, g.dy);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      x.stopAnimation(value => { start.current = value; offset.current = value; });
      crossed.current = false;
      group?.focus(id.current);
    },
    onPanResponderMove: (_, g) => {
      const next = dragOffset(start.current, g.dx, live.current.geometry);
      offset.current = next;
      x.setValue(next);
      const past = pastCommit(next, live.current.geometry);
      if (past !== crossed.current) { crossed.current = past; if (past) live.current.onFeedback?.('threshold'); }
    },
    onPanResponderRelease: (_, g) => finish(g.vx),
    onPanResponderTerminate: () => finish(0),
  }), [x, group]);

  function finish(vx: number) {
    const { geometry: geo, leadingActions: lead, trailingActions: trail } = live.current;
    const outcome = settleOutcome(offset.current, vx, geo);
    crossed.current = false;
    lastDrag.current = Date.now();
    if (outcome.type === 'close') { setOpenSide(null); moveTo(0, vx); return; }
    if (outcome.type === 'open') {
      if (live.current.openSide !== outcome.side) live.current.onFeedback?.('open');
      setOpenSide(outcome.side);
      moveTo(openOffset(outcome.side, geo), vx);
      return;
    }
    const list = outcome.side === 'leading' ? lead : trail;
    const action = list[outermostIndex(outcome.side, list.length)];
    if (action) run(action, outcome.side);
  }

  const onLayout = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width);
  const onContentLayout = (event: LayoutChangeEvent) => { if (live.current.phase === 'idle') setNaturalHeight(event.nativeEvent.layout.height); };
  const leadingLayerWidth = x.interpolate({ inputRange: [0, BIG], outputRange: [0, BIG], extrapolate: 'clamp' });
  const trailingLayerWidth = x.interpolate({ inputRange: [-BIG, 0], outputRange: [BIG, 0], extrapolate: 'clamp' });
  const height = phase !== 'idle' && naturalHeight > 0 ? collapse.interpolate({ inputRange: [0, 1], outputRange: [0, naturalHeight] }) : undefined;

  const a11yActions = [...leadingActions, ...trailingActions].map(action => ({ name: action.id, label: action.accessibilityLabel ?? action.label }));
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    const lead = leadingActions.find(action => action.id === name);
    if (lead) { run(lead, 'leading'); return; }
    const trail = trailingActions.find(action => action.id === name);
    if (trail) run(trail, 'trailing');
  };
  const hasActions = leadingActions.length + trailingActions.length > 0;
  const layer = (side: SwipeSide, actions: readonly SwipeAction[]) => {
    if (!actions.length) return null;
    const outer = outermostIndex(side, actions.length);
    const visible = openSide === side;
    return <Animated.View key={side} pointerEvents={visible ? 'box-none' : 'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[styles.layer, side === 'leading' ? { left: 0, width: leadingLayerWidth } : { right: 0, width: trailingLayerWidth }]}>
      {actions.map((action, index) => <Pressable key={action.id} accessibilityRole="button" accessibilityLabel={action.accessibilityLabel ?? action.label}
        onPress={() => run(action, side)}
        style={[styles.action, { backgroundColor: action.backgroundColor }, index !== outer && { maxWidth: ACTION_WIDTH }]}>
        {action.icon ? <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{action.icon}</View> : null}
        <Text numberOfLines={1} style={[styles.actionLabel, { color: action.color ?? '#ffffff' }]}>{action.label}</Text>
      </Pressable>)}
    </Animated.View>;
  };

  if (phase === 'gone') return <Animated.View style={{ height: 0 }} />;
  return <Animated.View style={[styles.row, height ? { height } : null, style]} onLayout={onLayout}>
    {layer('leading', leadingActions)}
    {layer('trailing', trailingActions)}
    {phase === 'pending' && stripAction ? <View style={[styles.strip, { backgroundColor: stripAction.backgroundColor }]} accessibilityLiveRegion="polite">
      <Text style={[styles.stripText, { color: stripAction.color ?? '#ffffff' }]} numberOfLines={1}>{stripAction.completedLabel ?? stripAction.label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Undo ${stripAction.label}`} onPress={undo} hitSlop={8} style={styles.undo}>
        <Text style={[styles.undoText, { color: stripAction.color ?? '#ffffff' }]}>Undo</Text>
      </Pressable>
    </View> : null}
    <Animated.View {...(hasActions ? pan.panHandlers : {})} onLayout={onContentLayout}
      style={[styles.content, { backgroundColor: rowBackground, transform: [{ translateX: x }] }]}
      accessibilityElementsHidden={phase !== 'idle'} importantForAccessibility={phase !== 'idle' ? 'no-hide-descendants' : 'auto'}>
      <Pressable accessible accessibilityLabel={accessibilityLabel} accessibilityHint={hasActions ? 'Swipe for more actions' : undefined}
        accessibilityActions={a11yActions} onAccessibilityAction={onAccessibilityAction}
        onPress={() => { if (Date.now() - lastDrag.current < 400) return; if (openSide) close(); else onPress?.(); }}>
        {children}
      </Pressable>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  row: { overflow: 'hidden' },
  content: { width: '100%', userSelect: 'none' },
  layer: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', overflow: 'hidden' },
  action: { flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  strip: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  stripText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  undo: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
