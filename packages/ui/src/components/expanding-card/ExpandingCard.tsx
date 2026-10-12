// MIT License. Copyright (c) 2026 Sandeepan Nandi. Keep the accompanying LICENSE.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, findNodeHandle, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { clamp, cornerRadius, crossedDismiss, dimOpacity, dismissOutcome, dragToProgress, dragTranslateX, heroHeightFor, shouldCaptureDismiss, staggerDelay, type Rect } from './expandingLogic';

export type ExpandingFeedbackEvent = 'open' | 'threshold' | 'close';
export type Insets = { top: number; bottom: number };
export type ExpandingCardHostProps = {
  children: ReactNode;
  /** Safe-area insets from your app (for example useSafeAreaInsets). Defaults to zero. */
  insets?: Insets;
  /** Optional haptic adapter: 'open', 'threshold' (drag crossed the dismiss point) and 'close'. */
  onFeedback?: (event: ExpandingFeedbackEvent) => void;
  /** Overrides the system Reduce Motion setting. */
  reducedMotion?: boolean;
  /** Corner radius of the open card. Default 0 (full screen). */
  openRadius?: number;
  /** Colour of the detail sheet under the hero. */
  sheetColor?: string;
  closeLabel?: string;
  style?: StyleProp<ViewStyle>;
};
export type ExpandingCardProps = {
  title: string;
  eyebrow?: string;
  /** Hero colour. The hero is also the card face. */
  color: string;
  /** Decorative art drawn behind the title. Filled to the card, rendered again in the hero. Keep it non-interactive. */
  art?: ReactNode;
  titleColor?: string;
  /** Height of the card in the list. Default 260. */
  cardHeight?: number;
  /** Height of the hero when open. Default 420, never taller than 70% of the host. */
  heroHeight?: number;
  cardRadius?: number;
  /** Detail content. Each child enters in turn. Rendered only while the card is open. */
  children: ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

type Active = {
  id: number;
  origin: Rect;
  props: ExpandingCardProps;
  blocks: ReactNode[];
  enter: Animated.Value[];
  returnFocus: () => void;
};
type HostApi = { open: (id: number, ref: View | null, props: ExpandingCardProps, returnFocus: () => void) => void; activeId: number | null };
const HostContext = createContext<HostApi | null>(null);
let nextCardId = 1;

/** Moves screen reader focus to a node. findNodeHandle does not exist on web, where the element itself is focused. */
function focusElement(ref: { current: unknown }) {
  const target = ref.current as { focus?: () => void } | null;
  if (Platform.OS === 'web') { target?.focus?.(); return; }
  const node = findNodeHandle(ref.current as Parameters<typeof findNodeHandle>[0]);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
}

const CARD_TITLE = 28;
const OPEN_TITLE = 36;

function useReducedMotion(override?: boolean) {
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setSystem(value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return override ?? system;
}

/**
 * Wrap your screen in this. Cards inside it expand into a full detail view that is drawn above
 * everything in the host, so give the host the whole screen (flex: 1).
 */
export function ExpandingCardHost({ children, insets = { top: 0, bottom: 0 }, onFeedback, reducedMotion, openRadius = 0, sheetColor = '#f6f8f4', closeLabel = 'Close', style }: ExpandingCardHostProps) {
  const reduce = useReducedMotion(reducedMotion);
  const hostRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<Active | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const dragging = useRef(false);
  const lastDy = useRef(0);
  const closing = useRef(false);
  const opened = useRef(false);
  const titleRef = useRef<Text>(null);
  const closeRef = useRef<View>(null);
  const latest = useRef({ size, active, reduce, onFeedback });
  latest.current = { size, active, reduce, onFeedback };

  const springTo = useCallback((toValue: number, velocity: number, done?: () => void) => {
    const { reduce: reduced } = latest.current;
    const anim = reduced
      ? Animated.timing(progress, { toValue, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: false })
      : Animated.spring(progress, { toValue, velocity, stiffness: toValue === 1 ? 190 : 230, damping: toValue === 1 ? 24 : 26, mass: 1, useNativeDriver: false });
    anim.start(({ finished }) => { if (finished) done?.(); });
  }, [progress]);

  const close = useCallback(() => {
    const current = latest.current.active;
    if (!current || closing.current) return;
    closing.current = true;
    opened.current = false;
    latest.current.onFeedback?.('close');
    current.enter.forEach(value => Animated.timing(value, { toValue: 0, duration: 110, useNativeDriver: true }).start());
    Animated.timing(dragX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    springTo(0, -1.5, () => {
      closing.current = false;
      setScrollLocked(false);
      setActive(null);
      progress.setValue(0);
      current.returnFocus();
    });
  }, [dragX, progress, springTo]);

  const open = useCallback((id: number, ref: View | null, props: ExpandingCardProps, returnFocus: () => void) => {
    if (latest.current.active || closing.current || !ref || !hostRef.current) return;
    hostRef.current.measureInWindow((hx, hy) => {
      ref.measureInWindow((x, y, width, height) => {
        if (!width || !height) return;
        const blocks = Array.isArray(props.children) ? (props.children as ReactNode[]) : [props.children];
        const enter = blocks.map(() => new Animated.Value(0));
        progress.setValue(0);
        dragX.setValue(0);
        scrollY.current = 0;
        opened.current = false;
        setScrollLocked(false);
        setActive({ id, origin: { x: x - hx, y: y - hy, width, height }, props, blocks, enter, returnFocus });
      });
    });
  }, [dragX, progress]);

  // Start the opening motion once the overlay has rendered at the card's own rectangle.
  useEffect(() => {
    if (!active || opened.current) return;
    opened.current = true;
    onFeedback?.('open');
    springTo(1, 0);
    const reduced = latest.current.reduce;
    Animated.sequence([
      Animated.delay(staggerDelay(0, reduced)),
      Animated.stagger(reduced ? 0 : 70, active.enter.map(value => reduced
        ? Animated.timing(value, { toValue: 1, duration: 120, useNativeDriver: true })
        : Animated.spring(value, { toValue: 1, stiffness: 170, damping: 20, mass: 1, useNativeDriver: true }))),
    ]).start();
    const timer = setTimeout(() => {
      focusElement(Platform.OS === 'web' ? closeRef : titleRef);
      AccessibilityInfo.announceForAccessibility(`${active.props.title}, details opened`);
    }, 350);
    return () => clearTimeout(timer);
  }, [active, onFeedback, springTo]);

  // Hardware back (Android) and Escape (web) close the open card.
  useEffect(() => {
    if (!active) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    const doc = Platform.OS === 'web' ? (globalThis as { document?: { addEventListener: (type: string, fn: (event: { key: string }) => void) => void; removeEventListener: (type: string, fn: (event: { key: string }) => void) => void } }).document : undefined;
    const onKey = (event: { key: string }) => { if (event.key === 'Escape') close(); };
    doc?.addEventListener('keydown', onKey);
    return () => { back.remove(); doc?.removeEventListener('keydown', onKey); };
  }, [active, close]);

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, g) => !!latest.current.active && !closing.current && shouldCaptureDismiss(scrollY.current, g.dx, g.dy),
    onPanResponderGrant: () => { dragging.current = true; lastDy.current = 0; setScrollLocked(true); },
    onPanResponderMove: (_event, g) => {
      const { size: s } = latest.current;
      const p = dragToProgress(g.dy, s.height);
      progress.setValue(p);
      dragX.setValue(dragTranslateX(g.dx, p));
      if (crossedDismiss(lastDy.current, g.dy)) latest.current.onFeedback?.('threshold');
      lastDy.current = g.dy;
    },
    onPanResponderRelease: (_event, g) => {
      dragging.current = false;
      if (dismissOutcome(g.dy, g.vy) === 'close') { close(); return; }
      setScrollLocked(false);
      Animated.spring(dragX, { toValue: 0, stiffness: 220, damping: 22, mass: 1, useNativeDriver: false }).start();
      springTo(1, 0);
    },
    onPanResponderTerminate: () => {
      dragging.current = false;
      setScrollLocked(false);
      Animated.spring(dragX, { toValue: 0, stiffness: 220, damping: 22, mass: 1, useNativeDriver: false }).start();
      springTo(1, 0);
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  const api = useMemo<HostApi>(() => ({ open, activeId: active?.id ?? null }), [open, active?.id]);
  const onLayout = (event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });

  const dim = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dimOpacity(1)], extrapolate: 'clamp' });

  return <HostContext.Provider value={api}>
    <View ref={hostRef} onLayout={onLayout} style={[styles.host, style]}>
      <Animated.View
        style={styles.fill}
        pointerEvents={active ? 'none' : 'auto'}
        accessibilityElementsHidden={!!active}
        importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}>
        {children}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: '#000', opacity: dim }]} />
      {active && size.width > 0 ? <Overlay
        active={active} size={size} insets={insets} progress={progress} dragX={dragX} reduce={reduce} openRadius={openRadius}
        sheetColor={sheetColor} closeLabel={closeLabel} onClose={close} panHandlers={pan.panHandlers} scrollLocked={scrollLocked}
        onScroll={y => { scrollY.current = y; }} titleRef={titleRef} closeRef={closeRef} /> : null}
    </View>
  </HostContext.Provider>;
}

type OverlayProps = {
  active: Active; size: { width: number; height: number }; insets: Insets; progress: Animated.Value; dragX: Animated.Value; reduce: boolean;
  openRadius: number; sheetColor: string; closeLabel: string; onClose: () => void; panHandlers: object; scrollLocked: boolean;
  onScroll: (y: number) => void; titleRef: React.RefObject<Text | null>; closeRef: React.RefObject<View | null>;
};
function Overlay({ active, size, insets, progress, dragX, reduce, openRadius, sheetColor, closeLabel, onClose, panHandlers, scrollLocked, onScroll, titleRef, closeRef }: OverlayProps) {
  const { origin, props } = active;
  const cardHeight = props.cardHeight ?? 260;
  const hero = heroHeightFor(cardHeight, props.heroHeight ?? 420, size.height);
  const cardRadius = props.cardRadius ?? 26;
  const input = [0, 1];
  const clampOpts = { extrapolate: 'clamp' as const };
  const left = progress.interpolate({ inputRange: input, outputRange: [origin.x, 0], ...clampOpts });
  const top = progress.interpolate({ inputRange: input, outputRange: [origin.y, 0], ...clampOpts });
  const width = progress.interpolate({ inputRange: input, outputRange: [origin.width, size.width], ...clampOpts });
  const height = progress.interpolate({ inputRange: input, outputRange: [origin.height, size.height], ...clampOpts });
  const radius = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [cardRadius, cardRadius, cornerRadius(1, cardRadius, openRadius)], ...clampOpts });
  const heroHeightAnim = progress.interpolate({ inputRange: input, outputRange: [origin.height, hero], ...clampOpts });
  const titleSize = progress.interpolate({ inputRange: input, outputRange: [CARD_TITLE, OPEN_TITLE], ...clampOpts });
  const padTop = progress.interpolate({ inputRange: input, outputRange: [20, insets.top + 28], ...clampOpts });
  const chrome = progress.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], ...clampOpts });
  const shadow = progress.interpolate({ inputRange: input, outputRange: [0.12, 0.3], ...clampOpts });
  const titleColor = props.titleColor ?? '#fff';

  return <Animated.View
    {...panHandlers}
    accessibilityViewIsModal
    accessibilityLabel={`${props.title}, details`}
    accessibilityActions={[{ name: 'escape', label: closeLabel }]}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'escape') onClose(); }}
    onAccessibilityEscape={onClose}
    style={[styles.overlay, { left, top, width, height, borderRadius: radius, shadowOpacity: shadow, transform: [{ translateX: dragX }] }]}>
    <ScrollView
      scrollEnabled={!scrollLocked}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={event => onScroll(event.nativeEvent.contentOffset.y)}
      style={[styles.scroll, { width: size.width }]}
      contentContainerStyle={{ width: size.width, backgroundColor: sheetColor, minHeight: size.height }}>
      <Animated.View style={[styles.hero, { height: heroHeightAnim, backgroundColor: props.color, paddingTop: padTop }]}>
        {props.art ? <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{props.art}</View> : null}
        {props.eyebrow ? <Text style={[styles.eyebrow, { color: titleColor }]}>{props.eyebrow.toUpperCase()}</Text> : null}
        <Animated.Text ref={titleRef} accessibilityRole="header" style={[styles.title, { color: titleColor, fontSize: titleSize, lineHeight: Animated.multiply(titleSize, 1.08) as unknown as number }]}>{props.title}</Animated.Text>
      </Animated.View>
      <View style={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {active.blocks.map((block, index) => {
          const enter = active.enter[index];
          const opacity = enter;
          const translateY = reduce ? 0 : enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
          return <Animated.View key={index} style={{ opacity, transform: [{ translateY }] }}>{block}</Animated.View>;
        })}
      </View>
    </ScrollView>
    <Animated.View style={[styles.closeWrap, { top: insets.top + 12, opacity: chrome }]}>
      <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} onPress={onClose} style={styles.close}>
        <Text style={styles.closeGlyph}>✕</Text>
      </Pressable>
    </Animated.View>
  </Animated.View>;
}

/** A card face. Tap it to expand into a detail view inside the nearest ExpandingCardHost. */
export function ExpandingCard(props: ExpandingCardProps) {
  const host = useContext(HostContext);
  const idRef = useRef(nextCardId++);
  const ref = useRef<View>(null);
  const press = useRef(new Animated.Value(1)).current;
  const hidden = host?.activeId === idRef.current;
  const cardHeight = props.cardHeight ?? 260;
  const titleColor = props.titleColor ?? '#fff';
  const returnFocus = useCallback(() => {
    focusElement(ref);
  }, []);
  const to = (value: number) => Animated.spring(press, { toValue: value, stiffness: 320, damping: 22, mass: 1, useNativeDriver: true }).start();
  return <Animated.View style={[{ transform: [{ scale: press }], opacity: hidden ? 0 : 1 }, props.style]}>
    <Pressable
      ref={ref}
      collapsable={false}
      disabled={props.disabled || !host}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? [props.eyebrow, props.title].filter(Boolean).join('. ')}
      accessibilityHint="Opens the details"
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={() => host?.open(idRef.current, ref.current, props, returnFocus)}
      style={[styles.card, { height: cardHeight, backgroundColor: props.color, borderRadius: props.cardRadius ?? 26 }]}>
      {props.art ? <View style={StyleSheet.absoluteFill} pointerEvents="none">{props.art}</View> : null}
      {props.eyebrow ? <Text style={[styles.eyebrow, { color: titleColor }]}>{props.eyebrow.toUpperCase()}</Text> : null}
      <Text style={[styles.title, { color: titleColor, fontSize: CARD_TITLE, lineHeight: CARD_TITLE * 1.08 }]}>{props.title}</Text>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  host: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  overlay: { position: 'absolute', overflow: 'hidden', userSelect: 'none', backgroundColor: '#f6f8f4', shadowColor: '#000', shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  scroll: { flex: 1 },
  hero: { width: '100%', paddingHorizontal: 20, overflow: 'hidden' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, opacity: 0.8, marginBottom: 6 },
  title: { fontWeight: '800', letterSpacing: -0.8, maxWidth: 320 },
  body: { paddingHorizontal: 22, paddingTop: 24, gap: 18 },
  card: { overflow: 'hidden', padding: 20 },
  closeWrap: { position: 'absolute', right: 16 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,30,25,0.55)' },
  closeGlyph: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
