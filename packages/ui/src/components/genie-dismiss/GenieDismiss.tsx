import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  AccessibilityInfo,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Group,
  ImageShader,
  Vertices,
  makeImageFromView,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  makeGrid,
  meshPoints,
  releaseTarget,
  scrub,
  type Point,
  type Rect,
} from "./genieMath";
export type GenieDismissProps = {
  image: SkImage;
  width: number;
  height: number;
  card: Rect;
  target: Point;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  label?: string;
  style?: ViewStyle;
};
// Native-only helper. Capture after layout/fonts/images are ready, with collapsable={false}.
// The owner disposes the returned image AFTER the component using it unmounts.
// Web callers should supply a prepared SkImage instead; this helper is not a DOM capture tool.
export async function snapshotCard(
  ref: React.RefObject<View | null>,
): Promise<SkImage> {
  if (Platform.OS === "web")
    throw new Error(
      "snapshotCard is native-only; provide a prepared SkImage on web",
    );
  if (!ref.current) throw new Error("Card view is not mounted");
  const image = await makeImageFromView(ref);
  if (!image) throw new Error("Unable to capture card");
  return image;
}
export function GenieDismiss({
  image,
  width,
  height,
  card,
  target,
  minimized,
  onMinimizedChange,
  slowMotion = false,
  reducedMotion,
  label = "Minimizable card",
  style,
}: GenieDismissProps) {
  const progress = useSharedValue(minimized ? 1 : 0);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = !!reducedMotion || systemReduce;
  const grid = useMemo(() => makeGrid(), []);
  const textures = useMemo(
    () =>
      grid.uv.map((p) => ({ x: p.x * image.width(), y: p.y * image.height() })),
    [grid, image],
  );
  const destination = useRef(minimized),
    pendingNotify = useRef(false);
  const mounted = useRef(true),
    dragging = useRef(false),
    start = useRef(0);
  const latest = useRef({
    minimized,
    slowMotion,
    reduce,
    card,
    onMinimizedChange,
  });
  latest.current = { minimized, slowMotion, reduce, card, onMinimizedChange };
  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted.current) setSystemReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduce,
    );
    return () => {
      mounted.current = false;
      sub.remove();
      cancelAnimation(progress);
    };
  }, [progress]);
  const commit = (value: boolean) => {
    if (mounted.current) latest.current.onMinimizedChange(value);
  };
  const settle = (value: boolean, notify = false) => {
    destination.current = value;
    pendingNotify.current = notify;
    cancelAnimation(progress);
    const l = latest.current,
      end = value ? 1 : 0;
    progress.value = withTiming(
      end,
      {
        duration: l.reduce
          ? 140
          : Math.max(
              120,
              Math.abs(end - progress.value) * (l.slowMotion ? 3600 : 900),
            ),
        easing: Easing.inOut(Easing.cubic),
      },
      (done) => {
        if (done && notify) runOnJS(commit)(value);
      },
    );
  };
  useEffect(() => {
    dragging.current = false;
    settle(minimized);
  }, [minimized]);
  useEffect(() => {
    if (!dragging.current) settle(destination.current, pendingNotify.current);
  }, [slowMotion, reduce]);
  // New content/layout cancels stale gestures and uses the current controlled endpoint.
  useEffect(() => {
    dragging.current = false;
    destination.current = minimized;
    pendingNotify.current = false;
    cancelAnimation(progress);
    progress.value = minimized ? 1 : 0;
  }, [
    image,
    width,
    height,
    card.x,
    card.y,
    card.width,
    card.height,
    target.x,
    target.y,
  ]);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 1,
        onPanResponderGrant: () => {
          cancelAnimation(progress);
          dragging.current = true;
          start.current = progress.value;
        },
        onPanResponderMove: (_, g) => {
          progress.value = scrub(
            start.current,
            g.dy,
            latest.current.card.height,
          );
        },
        onPanResponderRelease: (_, g) => {
          dragging.current = false;
          const next =
            Math.abs(g.dy) < 4
              ? !destination.current
              : releaseTarget(progress.value, g.vy);
          settle(next, true);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          settle(latest.current.minimized);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [progress],
  );
  const vertices = useDerivedValue(() =>
    meshPoints(grid.uv, reduce ? 0 : progress.value, card, target),
  );
  const opacity = useDerivedValue(() => (reduce ? 1 - progress.value : 1));
  if (width <= 0 || height <= 0 || card.width <= 0 || card.height <= 0)
    return null;
  return (
    <View
      style={[{ width, height }, style]}
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: minimized ? "Minimized" : "Open" }}
      accessibilityActions={[
        {
          name: "activate",
          label: minimized ? "Restore card" : "Minimize card",
        },
      ]}
      onAccessibilityAction={() => settle(!destination.current, true)}
    >
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Group opacity={opacity}>
          <Vertices
            vertices={vertices}
            textures={textures}
            indices={grid.indices}
            mode="triangles"
            blendMode="srcOver"
          >
            <ImageShader image={image} tx="clamp" ty="clamp" />
          </Vertices>
        </Group>
      </Canvas>
    </View>
  );
}
