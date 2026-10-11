// Nativelet Toast Stack. MIT: retain the accompanying LICENSE.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, AppState, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { remainingAfterPause, shouldDismiss, upsertToast, visibleToasts, type ToastOptions, type ToastRecord } from './toastLogic';
export type { ToastOptions, ToastRecord, ToastVariant } from './toastLogic';
export interface ToastAPI { toast: (options: ToastOptions) => string; dismiss: (id?: string) => void }
const Context = createContext<ToastAPI | null>(null);
let sequence = 0;
export function useToast(): ToastAPI {
  const value = useContext(Context);
  if (!value) throw new Error('useToast must be inside ToastProvider');
  return value;
}
export interface ToastProviderProps {
  children: ReactNode;
  position?: 'top' | 'bottom';
  maxVisible?: number;
  /** Pass useSafeAreaInsets() from your app. Core needs no safe-area dependency. */
  insets?: { top: number; bottom: number; left?: number; right?: number };
  reducedMotion?: boolean;
  /** Keep true for accessible native apps. RN Web reports a screen reader unconditionally. */
  pauseForScreenReader?: boolean;
  /** Optional haptic adapter, called for a new toast. Handle adapter errors there. */
  onFeedback?: () => void;
}
export function ToastProvider({ children, position = 'bottom', maxVisible = 3, insets = { top: 0, bottom: 0 }, reducedMotion, pauseForScreenReader = true, onFeedback }: ToastProviderProps) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const [systemReduced, setSystemReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const { width } = useWindowDimensions();
  const feedback = useRef(onFeedback); feedback.current = onFeedback;
  const toast = useCallback((options: ToastOptions) => {
    const id = options.id ?? `nativelet-${++sequence}`;
    setItems(previous => upsertToast(previous, options, id));
    feedback.current?.();
    return id;
  }, []);
  const dismiss = useCallback((id?: string) => setItems(previous => id === undefined ? [] : previous.filter(item => item.id !== id)), []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setSystemReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { alive = false; motion.remove(); app.remove(); };
  }, []);
  const visible = visibleToasts(items, maxVisible);
  const safeWidth = Math.max(0, width - (insets.left ?? 0) - (insets.right ?? 0) - 32);
  return <Context.Provider value={api}><View style={styles.host}>{children}
    <View pointerEvents="box-none" style={[styles.overlay, { left: (insets.left ?? 0) + 16, right: (insets.right ?? 0) + 16, [position]: insets[position] + 16 }]}>
      {visible.map((item, index) => <ToastCard key={item.id} item={item} offset={position === 'top' ? index * 106 : -(visible.length - 1 - index) * 106} depth={position === 'top' ? index : visible.length - 1 - index} width={Math.min(360, safeWidth)} position={position} reduced={reducedMotion ?? systemReduced} foreground={foreground} pauseForScreenReader={pauseForScreenReader} dismiss={dismiss} />)}
    </View>
  </View></Context.Provider>;
}
function ToastCard({ item, offset, depth, width, position, reduced, foreground, pauseForScreenReader, dismiss }: { item: ToastRecord; offset: number; depth: number; width: number; position: 'top'|'bottom'; reduced: boolean; foreground: boolean; pauseForScreenReader: boolean; dismiss: (id: string) => void }) {
  const y = useRef(new Animated.Value(offset + (position === 'top' ? -20 : 20))).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.ValueXY()).current;
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [screenReader, setScreenReader] = useState(true);
  const remaining = useRef(item.duration);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const live = useRef({ item, dismiss, reduced }); live.current = { item, dismiss, reduced };
  const blockPress = useRef(0);
  const paused = pressed || dragging || !foreground || (screenReader && pauseForScreenReader);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then(value => { if (alive) setScreenReader(value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    remaining.current = item.duration;
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility([item.message, item.description].filter(Boolean).join('. '));
  }, [item.revision, item.message, item.description, item.duration]);
  useEffect(() => {
    if (paused || item.duration === 0 || !Number.isFinite(remaining.current)) return;
    started.current = Date.now();
    timer.current = setTimeout(() => dismiss(item.id), remaining.current);
    return () => { clearTimeout(timer.current); remaining.current = remainingAfterPause(remaining.current, started.current, Date.now()); };
  }, [paused, item.revision, item.duration, item.id, dismiss]);
  useEffect(() => {
    const animation = reduced ? Animated.timing(y, { toValue: offset, duration: 0, useNativeDriver: true }) : Animated.spring(y, { toValue: offset, stiffness: 260, damping: 24, mass: 0.8, useNativeDriver: true });
    animation.start();
    Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 160, useNativeDriver: true }).start();
    return () => { y.stopAnimation(); opacity.stopAnimation(); };
  }, [offset, reduced, y, opacity]);
  const finish = (remove: boolean) => {
    blockPress.current = Date.now() + 200;
    setDragging(false); setPressed(false);
    if (remove) live.current.dismiss(live.current.item.id);
    else if (live.current.reduced) drag.setValue({ x: 0, y: 0 });
    else Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true, stiffness: 300, damping: 26 }).start();
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { setDragging(true); drag.stopAnimation(); },
    onPanResponderMove: (_, g) => drag.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_, g) => finish(shouldDismiss(g.dx, g.dy, g.vx, g.vy)),
    onPanResponderTerminate: () => finish(false),
    onPanResponderTerminationRequest: () => false,
  })).current;
  const action = () => { if (Date.now() < blockPress.current) return; try { item.action?.onPress(); } finally { dismiss(item.id); } };
  return <Animated.View {...responder.panHandlers} onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)} onTouchCancel={() => setPressed(false)} style={[styles.card, { width, [position]: 0, opacity, zIndex: 100 - depth, transform: [{ translateY: y }, ...drag.getTranslateTransform(), { scale: Math.max(0.94, 1 - depth * 0.02) }] }] }>
    <View style={styles.text} accessibilityLiveRegion="polite"><Text numberOfLines={1} style={[styles.title, item.variant === 'error' && styles.error]}>{item.variant === 'success' ? '✓ ' : item.variant === 'error' ? '! ' : item.variant === 'info' ? 'i ' : ''}{item.message}</Text>{item.description ? <Text numberOfLines={2} style={styles.description}>{item.description}</Text> : null}</View>
    <View style={styles.controls}>{item.action ? <Pressable accessibilityRole="button" onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} onPress={action} style={styles.button}><Text style={styles.action}>{item.action.label}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${item.message}`} onPress={() => { if (Date.now() >= blockPress.current) dismiss(item.id); }} style={styles.button}><Text style={styles.close}>×</Text></Pressable></View>
  </Animated.View>;
}
const styles = StyleSheet.create({
  host: { flex: 1 }, overlay: { position: 'absolute', alignItems: 'center', zIndex: 1000 },
  card: { position: 'absolute', height: 98, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d5e1d2', flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, gap: 8, shadowColor: '#173b29', shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  text: { flex: 1, gap: 5 }, title: { color: '#193f30', fontWeight: '700', fontSize: 14 }, error: { color: '#9b3434' }, description: { color: '#52654f', fontSize: 12, lineHeight: 17 },
  controls: { flexDirection: 'row', alignItems: 'center' }, button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, action: { color: '#245541', fontSize: 12, fontWeight: '700' }, close: { color: '#52654f', fontSize: 24 },
});
