import React, { useEffect, useMemo, useRef, useState } from "react";
import { transitionMs } from "./timing";
import {
  AccessibilityInfo,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  BlendMode,
  Canvas,
  Picture,
  Skia,
  VertexMode,
  createPicture,
} from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  CREAM,
  ISO_YAW,
  SEAM,
  buildScene,
  flatSquares,
  layoutScene,
  makeConfig,
  type Modules,
} from "./blossomMath";

export type BlossomQRProps = {
  /** QR matrix, true for a dark module. Create it with any QR encoder. */
  modules: Modules;
  /** Edge length in points. The code keeps a 4 module quiet zone inside it. */
  size: number;
  /** false shows the isometric blossom tree, true shows the scannable code. */
  showCode: boolean;
  /** Called when a morph reaches its end state. */
  onSettled?: (showCode: boolean) => void;
  reducedMotion?: boolean;
  /** Stretch the transition 4x so it is easy to watch. Optional demo aid. */
  slowMotion?: boolean;
  /** Read by screen readers, for example the URL the code opens. */
  label?: string;
  style?: ViewStyle;
};

const SPREAD = 0.34;

export function BlossomQR({
  modules,
  size,
  showCode,
  onSettled,
  reducedMotion,
  slowMotion,
  label = "QR code",
  style,
}: BlossomQRProps) {
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setSystemReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduced,
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const reduced = reducedMotion ?? systemReduced;
  const scene = useMemo(() => buildScene(modules), [modules]);
  const cfg = useMemo(
    () => makeConfig(size, modules.length),
    [size, modules.length],
  );

  const progress = useSharedValue(showCode ? 1 : 0);
  const yaw = useSharedValue(ISO_YAW);
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    progress.value = withTiming(
      showCode ? 1 : 0,
      { duration: transitionMs(reduced, slowMotion), easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished && settled.current)
          globalThis.requestAnimationFrame?.(() => settled.current?.(showCode));
      },
    );
  }, [showCode, reduced, slowMotion, progress]);

  const picture = useDerivedValue(() => {
    const p = progress.value;
    const maxVerts = scene.size * scene.size * 30;
    const pos: number[] = new Array(maxVerts * 2);
    const rgb: number[] = new Array(maxVerts * 3);
    const shadow = [0, 0, 0, 0];
    const count = layoutScene(p, yaw.value, scene, cfg, SPREAD, pos, rgb, shadow);
    const points = new Array(count);
    const colors = new Array(count);
    for (let i = 0; i < count; i += 1) {
      points[i] = { x: pos[i * 2], y: pos[i * 2 + 1] };
      colors[i] = Float32Array.of(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 1);
    }
    return createPicture(
      (canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setColor(Float32Array.of(CREAM[0], CREAM[1], CREAM[2], 1));
        canvas.drawRect(Skia.XYWHRect(0, 0, cfg.canvas, cfg.canvas), paint);
        if (shadow[3] > 0.01) {
          paint.setColor(Float32Array.of(0.25, 0.12, 0.1, shadow[3]));
          paint.setMaskFilter(
            Skia.MaskFilter.MakeBlur(0, shadow[2] * 0.22, true),
          );
          canvas.drawOval(
            Skia.XYWHRect(
              shadow[0] - shadow[2],
              shadow[1] - shadow[2] * 0.5,
              shadow[2] * 2,
              shadow[2],
            ),
            paint,
          );
          paint.setMaskFilter(null);
        }
        if (p >= 1) {
          const rectCount = flatSquares(scene, cfg, pos, rgb);
          const side = cfg.cell + SEAM;
          for (let i = 0; i < rectCount; i += 1) {
            paint.setColor(
              Float32Array.of(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 1),
            );
            canvas.drawRect(
              Skia.XYWHRect(pos[i * 2], pos[i * 2 + 1], side, side),
              paint,
            );
          }
        } else if (count > 0) {
          const verts = Skia.MakeVertices(
            VertexMode.Triangles,
            points,
            undefined,
            colors,
          );
          paint.setColor(Float32Array.of(1, 1, 1, 1));
          canvas.drawVertices(verts, BlendMode.Dst, paint);
        }
      },
      Skia.XYWHRect(0, 0, cfg.canvas, cfg.canvas),
    );
  });

  const start = useRef(ISO_YAW);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => progress.value < 0.2,
        onMoveShouldSetPanResponder: () => progress.value < 0.2,
        onPanResponderGrant: () => {
          start.current = yaw.value;
        },
        onPanResponderMove: (_, g) => {
          yaw.value = start.current + g.dx * 0.012;
        },
      }),
    [progress, yaw],
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        showCode ? label : "Isometric blossom tree that becomes a QR code"
      }
      style={[{ width: size, height: size }, style]}
      {...responder.panHandlers}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
