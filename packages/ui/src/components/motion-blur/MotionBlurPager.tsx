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
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { motionBlurEffect } from "./blurShader";
import {
  blurSpan,
  clamp,
  dragScroll,
  fringeSpan,
  pageOffset,
  snapTarget,
  springConfig,
} from "./motionMath";

export type MotionBlurPagerProps = {
  /** Prepared page textures, one per page. Draw each at least 2x the page size for a crisp streak. */
  pages: SkImage[];
  /** Accessibility name per page ("Dune", "Harbor"). Falls back to "Page N". */
  labels?: string[];
  /** Viewport size in layout points. */
  width: number;
  height: number;
  /** Page width; neighbours peek in from the sides. Defaults to 86% of the viewport. */
  pageWidth?: number;
  /** Gap between pages, default 20. */
  gap?: number;
  /** Page corner radius, default 18. */
  radius?: number;
  /** Blur span of a hard flick in px, default 44. */
  maxBlur?: number;
  index: number;
  onIndexChange: (index: number) => void;
  /** Fires when a new page settles: wire expo-haptics here (the core has no haptics dependency). */
  onFeedback?: (event: "snap") => void;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  label?: string;
  style?: ViewStyle;
};

type Layout = { width: number; pageW: number; pageH: number; stride: number; radius: number };

function Page({
  i,
  image,
  scroll,
  speed,
  reduced,
  maxBlur,
  layout,
}: {
  i: number;
  image: SkImage;
  scroll: SharedValue<number>;
  speed: SharedValue<number>;
  reduced: SharedValue<boolean>;
  maxBlur: number;
  layout: Layout;
}) {
  const x = useDerivedValue(
    () => layout.width / 2 - layout.pageW / 2 + pageOffset(i, scroll.value) * layout.stride,
  );
  const uniforms = useDerivedValue(() => {
    const span = reduced.value ? 0 : blurSpan(speed.value, maxBlur);
    return {
      origin: [layout.width / 2 - layout.pageW / 2 + pageOffset(i, scroll.value) * layout.stride, 0],
      dir: [speed.value >= 0 ? -1 : 1, 0],
      span,
      fringe: reduced.value ? 0 : fringeSpan(span),
    };
  });
  return (
    <RoundedRect x={x} y={0} width={layout.pageW} height={layout.pageH} r={layout.radius}>
      <Shader source={motionBlurEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          fit="fill"
          tx="clamp"
          ty="clamp"
          rect={{ x: 0, y: 0, width: layout.pageW, height: layout.pageH }}
        />
      </Shader>
    </RoundedRect>
  );
}

export function MotionBlurPager({
  pages,
  labels,
  width,
  height,
  pageWidth,
  gap = 20,
  radius = 18,
  maxBlur = 44,
  index,
  onIndexChange,
  onFeedback,
  slowMotion = false,
  reducedMotion,
  label = "Image pager",
  style,
}: MotionBlurPagerProps) {
  const count = pages.length;
  const last = Math.max(0, count - 1);
  const pageW = pageWidth ?? Math.round(width * 0.86);
  const stride = pageW + gap;
  const layout = useMemo<Layout>(
    () => ({ width, pageW, pageH: height, stride, radius }),
    [width, pageW, height, stride, radius],
  );
  const scroll = useSharedValue(clamp(index, 0, last));
  const speed = useSharedValue(0);
  const reduced = useSharedValue(false);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = !!reducedMotion || systemReduce;
  const mounted = useRef(true);
  const dragging = useRef(false);
  const settling = useRef(false);
  const destination = useRef(clamp(index, 0, last));
  const settledIndex = useRef(clamp(index, 0, last));
  const revision = useRef(0);
  const start = useRef(0);
  const latest = useRef({ slowMotion, reduce, onIndexChange, onFeedback, stride, last });
  latest.current = { slowMotion, reduce, onIndexChange, onFeedback, stride, last };

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

  useEffect(() => {
    reduced.value = reduce;
  }, [reduce, reduced]);

  // Blur follows the content's real speed: differentiate the scroll position each frame and smooth it
  // (~80ms), so a flick streaks and the picture sharpens as the spring lands.
  const previous = useSharedValue(scroll.value);
  useFrameCallback((frame) => {
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 48);
    if (dt <= 0) return;
    const v = ((scroll.value - previous.value) / dt) * 1000 * latest.current.stride;
    previous.value = scroll.value;
    const a = 1 - Math.exp(-dt / 80);
    speed.value += (v - speed.value) * a;
  });

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
    settle(next);
    latest.current.onIndexChange(next);
  };
  // Controlled prop: reverse from wherever the pager is.
  useEffect(() => {
    const clamped = clamp(index, 0, latest.current.last);
    if (destination.current !== clamped) settle(clamped);
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
        onPanResponderGrant: () => {
          revision.current++;
          cancelAnimation(scroll);
          dragging.current = true;
          settling.current = false;
          start.current = scroll.value;
        },
        onPanResponderMove: (_, g) => {
          if (!dragging.current) return;
          scroll.value = dragScroll(start.current, g.dx, latest.current.stride, latest.current.last);
        },
        onPanResponderRelease: (evt, g) => {
          if (!dragging.current) return;
          dragging.current = false;
          const velocityPages = (-g.vx * 1000) / latest.current.stride;
          const tap = Math.abs(g.dx) < 6 && Math.abs(g.vx) < 0.15;
          if (tap) {
            // A tap on a peeking neighbour walks one page that way; a tap on the current page stays.
            const x = evt.nativeEvent.locationX;
            const third = layout.width / 3;
            const target = x < third ? destination.current - 1 : x > third * 2 ? destination.current + 1 : destination.current;
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
    [scroll, layout],
  );

  const onAccessibility = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") go(destination.current + 1);
    if (event.nativeEvent.actionName === "decrement") go(destination.current - 1);
  };

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
        {pages.map((image, i) => (
          <Page
            key={i}
            i={i}
            image={image}
            scroll={scroll}
            speed={speed}
            reduced={reduced}
            maxBlur={maxBlur}
            layout={layout}
          />
        ))}
      </Canvas>
    </View>
  );
}
