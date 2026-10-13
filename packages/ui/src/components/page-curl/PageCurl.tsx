import React, {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
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
  curlGeometry,
  dragProgress,
  shouldTurn,
  targetPage,
  SKSL,
} from "./curlMath";

export type CurlPage = { image: SkImage; backImage?: SkImage; label?: string };
export type PageCurlProps = {
  pages: readonly CurlPage[];
  width: number;
  height: number;
  initialPage?: number;
  reducedMotion?: boolean;
  onPageChange?: (index: number) => void;
  style?: ViewStyle;
  label?: string;
};
// Capture deliberately, after layout/fonts/images are ready, not during a gesture.
// The caller owns returned images and must dispose them after the pager unmounts.
export async function snapshotPage(
  ref: React.RefObject<View | null>,
): Promise<SkImage> {
  if (!ref.current) throw new Error("Page view is not mounted");
  const image = await makeImageFromView(ref);
  if (!image) throw new Error("Page snapshot failed");
  return image;
}
const effect = (() => {
  const e = Skia.RuntimeEffect.Make(SKSL);
  if (!e) throw new Error("Page Curl shader failed to compile");
  return e;
})();
export type PageCurlHandle = { next: () => void; previous: () => void };
export const PageCurl = forwardRef<PageCurlHandle, PageCurlProps>(
  function PageCurl(
    {
      pages,
      width,
      height,
      initialPage = 0,
      reducedMotion,
      onPageChange,
      style,
      label = "Page reader",
    },
    ref,
  ) {
    const [index, setIndex] = useState(() =>
      targetPage(initialPage, 0, pages.length),
    );
    const [direction, setDirection] = useState(1),
      [systemReduce, setSystemReduce] = useState(false);
    const progress = useSharedValue(0),
      tilt = useSharedValue(0),
      originY = useSharedValue(height);
    const busy = useRef(false),
      dragDir = useRef(1),
      mounted = useRef(true);
    const latest = useRef({
      index,
      pages,
      width,
      height,
      reducedMotion,
      systemReduce,
      onPageChange,
    });
    latest.current = {
      index,
      pages,
      width,
      height,
      reducedMotion,
      systemReduce,
      onPageChange,
    };
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
    // A page collection or size change cancels an in-flight turn rather than committing stale content.
    useEffect(() => {
      cancelAnimation(progress);
      progress.value = 0;
      busy.current = false;
      setIndex((i) => targetPage(i, 0, pages.length));
    }, [pages, width, height, progress]);
    const complete = (commit: boolean, dir: number) => {
      if (!mounted.current) return;
      const l = latest.current;
      if (commit) {
        const next = targetPage(l.index, dir, l.pages.length);
        setIndex(next);
        l.onPageChange?.(next);
        AccessibilityInfo.announceForAccessibility?.(
          `Page ${next + 1} of ${l.pages.length}`,
        );
      }
      if (!commit) {
        progress.value = 0;
        busy.current = false;
      }
    };
    useLayoutEffect(() => {
      progress.value = 0;
      busy.current = false;
    }, [index, progress]);
    const settle = (commit: boolean) => {
      busy.current = true;
      const dir = dragDir.current,
        l = latest.current;
      if (l.reducedMotion ?? l.systemReduce) {
        complete(commit, dir);
        return;
      }
      progress.value = withTiming(
        commit ? 1 : 0,
        { duration: 420, easing: Easing.out(Easing.cubic) },
        (done) => {
          if (done) runOnJS(complete)(commit, dir);
        },
      );
    };
    const turn = (dir: number) => {
      const l = latest.current;
      if (busy.current || targetPage(l.index, dir, l.pages.length) === l.index)
        return;
      dragDir.current = dir;
      setDirection(dir);
      tilt.value = 0;
      originY.value = l.height;
      settle(true);
    };
    useImperativeHandle(ref, () => ({
      next: () => turn(1),
      previous: () => turn(-1),
    }));
    const responder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: (e) => {
            const l = latest.current,
              x = e.nativeEvent.locationX;
            return (
              e.nativeEvent.touches.length === 1 &&
              !busy.current &&
              targetPage(l.index, x > l.width / 2 ? 1 : -1, l.pages.length) !==
                l.index &&
              (x < l.width * 0.25 || x > l.width * 0.75)
            );
          },
          onPanResponderGrant: (e) => {
            const l = latest.current,
              x = e.nativeEvent.locationX;
            const dir = x > l.width / 2 ? 1 : -1;
            dragDir.current = dir;
            setDirection(dir);
            tilt.value = 0;
            originY.value = e.nativeEvent.locationY;
            busy.current = true;
          },
          onPanResponderMove: (_, g) => {
            const l = latest.current,
              dir = dragDir.current;
            if (targetPage(l.index, dir, l.pages.length) === l.index) return;
            progress.value = dragProgress(g.dx, l.width, dir);
            tilt.value =
              (l.reducedMotion ?? l.systemReduce)
                ? 0
                : Math.max(
                    -0.55,
                    Math.min(
                      0.55,
                      (g.dy / Math.max(40, Math.abs(g.dx))) * dir * 0.5,
                    ),
                  );
          },
          onPanResponderRelease: (_, g) => {
            const l = latest.current,
              dir = dragDir.current;
            settle(
              targetPage(l.index, dir, l.pages.length) !== l.index &&
                shouldTurn(progress.value, g.vx, dir),
            );
          },
          onPanResponderTerminate: () => settle(false),
          onPanResponderTerminationRequest: () => false,
          // Handlers read latest props; shared values retain identity.
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }),
      [progress, tilt, originY],
    );
    const reduce = reducedMotion ?? systemReduce;
    const uniforms = useDerivedValue(() => ({
      size: [width, height],
      ...curlGeometry(progress.value, tilt.value, originY.value, width, height),
      progress: reduce ? 0 : progress.value,
      direction,
    }));
    if (!pages.length || width <= 0 || height <= 0) return null;
    const current = pages[index],
      next = pages[targetPage(index, direction, pages.length)];
    if (!current || !next) return null;
    const rect = { x: 0, y: 0, width, height };
    return (
      <View
        style={[{ width, height, overflow: "hidden", borderRadius: 4 }, style]}
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 1,
          max: pages.length,
          now: index + 1,
          text: current.label || `Page ${index + 1}`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Next page" },
          { name: "decrement", label: "Previous page" },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "increment") turn(1);
          else if (e.nativeEvent.actionName === "decrement") turn(-1);
        }}
      >
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={effect} uniforms={uniforms}>
              <ImageShader
                image={current.image}
                fit="fill"
                rect={rect}
                tx="clamp"
                ty="clamp"
              />
              <ImageShader
                image={next.image}
                fit="fill"
                rect={rect}
                tx="clamp"
                ty="clamp"
              />
              <ImageShader
                image={current.backImage ?? current.image}
                fit="fill"
                rect={rect}
                tx="clamp"
                ty="clamp"
              />
            </Shader>
          </Fill>
        </Canvas>
      </View>
    );
  },
);
