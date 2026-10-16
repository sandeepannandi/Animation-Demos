import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  PanResponder,
  View,
  type AccessibilityActionEvent,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  ImageShader,
  RoundedRect,
  Shader,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { transitionEffect } from "./transitionShaders";
import {
  clamp,
  dragScroll,
  effectForTransition,
  rubber,
  scrub,
  snapTarget,
  springConfig,
  type TransitionEffect,
} from "./transitionMath";

export type GLTransitionPagerProps = {
  /** Prepared page textures, one per page. Draw each at least 2x the page size for crisp shader work. */
  pages: SkImage[];
  /** Accessibility name per page ("Dune", "Harbor"). Falls back to "Page N". */
  labels?: string[];
  /** Viewport size in layout points; pages fill it edge to edge. */
  width: number;
  height: number;
  /** Page corner radius, default 18. */
  radius?: number;
  /** Force one effect for every hop instead of cycling all four. */
  effect?: TransitionEffect;
  index: number;
  onIndexChange: (index: number) => void;
  /** Fires when a new page settles: wire expo-haptics here (the core has no haptics dependency). */
  onFeedback?: (event: "snap") => void;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  label?: string;
  style?: ViewStyle;
};

export function GLTransitionPager({
  pages,
  labels,
  width,
  height,
  radius = 18,
  effect,
  index,
  onIndexChange,
  onFeedback,
  slowMotion = false,
  reducedMotion,
  label = "Image pager",
  style,
}: GLTransitionPagerProps) {
  const count = pages.length;
  const last = Math.max(0, count - 1);
  const scroll = useSharedValue(clamp(index, 0, last));
  // Travel direction for directional effects: 1 moving forward, -1 back.
  const dir = useSharedValue(1);
  // Where the last touch began, in page units (0..1); the ripple grows from there.
  const touch = useSharedValue<[number, number]>([0.5, 0.5]);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = !!reducedMotion || systemReduce;
  const mounted = useRef(true);
  const dragging = useRef(false);
  const settling = useRef(false);
  const destination = useRef(clamp(index, 0, last));
  const settledIndex = useRef(clamp(index, 0, last));
  const revision = useRef(0);
  const start = useRef(0);
  const latest = useRef({ slowMotion, reduce, onIndexChange, onFeedback, last });
  latest.current = { slowMotion, reduce, onIndexChange, onFeedback, last };

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted.current && setSystemReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      mounted.current = false;
      revision.current++;
      sub.remove();
      cancelAnimation(scroll);
    };
  }, [scroll]);

  const finish = (target: number, generation: number) => {
    if (!mounted.current || generation !== revision.current) return;
    settling.current = false;
    if (target !== settledIndex.current) {
      settledIndex.current = target;
      latest.current.onFeedback?.("snap");
    }
  };
  const settle = (target: number, velocityPages = 0) => {
    const generation = ++revision.current;
    destination.current = target;
    if (velocityPages !== 0) dir.value = velocityPages > 0 ? 1 : -1;
    cancelAnimation(scroll);
    if (latest.current.reduce) {
      scroll.value = target;
      settling.current = false;
      finish(target, generation);
      return;
    }
    settling.current = true;
    scroll.value = withSpring(
      target,
      {
        ...springConfig(latest.current.slowMotion),
        velocity: velocityPages / (latest.current.slowMotion ? 4 : 1),
        overshootClamping: false,
        energyThreshold: 1e-4,
      },
      (done) => {
        if (done) runOnJS(finish)(target, generation);
      },
    );
  };
  const go = (target: number) => {
    const next = clamp(Math.round(target), 0, latest.current.last);
    if (next === destination.current && !settling.current) return;
    dir.value = next > scroll.value ? 1 : -1;
    settle(next);
    latest.current.onIndexChange(next);
  };
  // Controlled prop: reverse from wherever the pager is.
  useEffect(() => {
    const clamped = clamp(index, 0, latest.current.last);
    if (destination.current !== clamped) {
      dir.value = clamped > scroll.value ? 1 : -1;
      settle(clamped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  // Changing speed or Reduce Motion mid-flight restarts the spring toward the same page.
  useEffect(() => {
    if (settling.current && !dragging.current) settle(destination.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowMotion, reduce]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // At rest, horizontal drags take over. Mid-flight, any touch grabs the moving pages.
        onStartShouldSetPanResponder: () => settling.current,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderGrant: (evt) => {
          revision.current++;
          cancelAnimation(scroll);
          dragging.current = true;
          settling.current = false;
          start.current = scroll.value;
          touch.value = [
            clamp(evt.nativeEvent.locationX / Math.max(1, width)),
            clamp(evt.nativeEvent.locationY / Math.max(1, height)),
          ];
        },
        onPanResponderMove: (_, g) => {
          if (!dragging.current) return;
          const next = dragScroll(start.current, g.dx, width, latest.current.last);
          dir.value = next > scroll.value ? 1 : next < scroll.value ? -1 : dir.value;
          scroll.value = next;
        },
        onPanResponderRelease: (evt, g) => {
          if (!dragging.current) return;
          dragging.current = false;
          const velocityPages = (-g.vx * 1000) / Math.max(1, width);
          const tap = Math.abs(g.dx) < 6 && Math.abs(g.vx) < 0.15;
          if (tap) {
            // A tap on the left or right third walks one page that way; the middle stays.
            const x = evt.nativeEvent.locationX;
            const third = width / 3;
            const target =
              x < third ? destination.current - 1 : x > third * 2 ? destination.current + 1 : destination.current;
            go(target);
            return;
          }
          const target = snapTarget(scroll.value, velocityPages, latest.current.last);
          settle(target, velocityPages);
          latest.current.onIndexChange(target);
        },
        onPanResponderTerminate: () => {
          if (!dragging.current) return;
          dragging.current = false;
          settle(destination.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [scroll, width, height],
  );

  const onAccessibility = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") go(destination.current + 1);
    if (event.nativeEvent.actionName === "decrement") go(destination.current - 1);
  };

  // The active hop: which two pages, how far, and which effect carries it. The texture pair lives
  // in React state (SkImage props are not shared-value reactive); it changes only when the scroll
  // crosses a page boundary, so the reaction fires at most once per boundary.
  const [hop, setHop] = useState(() => scrub(clamp(index, 0, last), last).from);
  useAnimatedReaction(
    () => scrub(scroll.value, last).from,
    (from, prev) => {
      if (from !== prev) runOnJS(setHop)(from);
    },
    [last],
  );
  const active = useDerivedValue(() => scrub(scroll.value, last));
  const effectName = effect ?? effectForTransition(hop);
  const source = useMemo(() => transitionEffect(effectName), [effectName]);
  const uniforms = useDerivedValue(() => ({
    progress: active.value.t,
    size: [width, height],
    touch: touch.value,
    dir: dir.value,
  }));
  const pair: [number, number] = [hop, Math.min(hop + 1, last)];

  if (count === 0 || width <= 0 || height <= 0) return null;
  const current = clamp(index, 0, last);
  return (
    <View
      style={[{ width, height }, style]}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${labels?.[current] ?? `Page ${current + 1}`}, ${current + 1} of ${count}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibility}
    >
      <Canvas pointerEvents="none" style={{ width, height }}>
        <TransitionPair
          pair={pair}
          pages={pages}
          source={source}
          uniforms={uniforms}
          width={width}
          height={height}
          radius={radius}
        />
      </Canvas>
    </View>
  );
}

function TransitionPair({
  pair,
  pages,
  source,
  uniforms,
  width,
  height,
  radius,
}: {
  pair: [number, number];
  pages: SkImage[];
  source: ReturnType<typeof transitionEffect>;
  uniforms: SharedValue<{
    progress: number;
    size: number[];
    touch: [number, number];
    dir: number;
  }>;
  width: number;
  height: number;
  radius: number;
}) {
  // The two textures of the active hop. Both are always bound so the shader's child order is stable;
  // at rest they are the same image and progress is 0, which returns it untouched.
  const fromImage = pages[pair[0]];
  const toImage = pages[pair[1]];
  return (
    <RoundedRect x={0} y={0} width={width} height={height} r={radius}>
      <Shader source={source} uniforms={uniforms}>
        <ImageShader image={fromImage} fit="fill" tx="clamp" ty="clamp" rect={{ x: 0, y: 0, width, height }} />
        <ImageShader image={toImage} fit="fill" tx="clamp" ty="clamp" rect={{ x: 0, y: 0, width, height }} />
      </Shader>
    </RoundedRect>
  );
}
