import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Picture,
  Skia,
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
  buildData,
  layoutTiles,
  makeConfig,
  paperAlpha,
  tileColor,
  type Modules,
} from "./orbitMath";

export type OrbitQRProps = {
  /** QR matrix, true for a dark module. Create it with any QR encoder. */
  modules: Modules;
  /** Edge length in points. The code keeps a 4 module quiet zone inside it. */
  size: number;
  /** false shows the rotating sphere, true shows the scannable code. */
  showCode: boolean;
  /** Called when a morph reaches its end state. */
  onSettled?: (showCode: boolean) => void;
  reducedMotion?: boolean;
  /** Read by screen readers, for example the URL the code opens. */
  label?: string;
  style?: ViewStyle;
};

const SPIN = 0.00042;

export function OrbitQR({
  modules,
  size,
  showCode,
  onSettled,
  reducedMotion,
  label = "QR code",
  style,
}: OrbitQRProps) {
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
  const data = useMemo(() => buildData(modules), [modules]);
  const cfg = useMemo(
    () => makeConfig(size, modules.length, data.count, reduced),
    [size, modules.length, data.count, reduced],
  );

  const progress = useSharedValue(showCode ? 1 : 0);
  const yaw = useSharedValue(0.6);
  const pitch = useSharedValue(-0.28);
  const spin = useSharedValue(SPIN);
  const dragging = useSharedValue(false);
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    progress.value = withTiming(
      showCode ? 1 : 0,
      { duration: reduced ? 220 : 1700, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished && settled.current)
          globalThis.requestAnimationFrame?.(() => settled.current?.(showCode));
      },
    );
  }, [showCode, reduced, progress]);

  useFrameCallback((frame) => {
    if (dragging.value || reduced) return;
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 48);
    const base = SPIN * (1 - progress.value);
    yaw.value += spin.value * dt;
    spin.value += (base - spin.value) * (1 - Math.exp(-dt / 420));
  });

  const picture = useDerivedValue(() => {
    const p = progress.value;
    const out: number[] = new Array(data.count * 5);
    const order: number[] = [];
    layoutTiles(p, yaw.value, pitch.value, data, cfg, out, order);
    const rgb = [0, 0, 0];
    return createPicture(
      (canvas) => {
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        const paper = paperAlpha(p);
        if (paper > 0) {
          paint.setColor(Float32Array.of(0.965, 0.973, 0.945, paper));
          canvas.drawRect(Skia.XYWHRect(0, 0, cfg.canvas, cfg.canvas), paint);
        }
        for (let k = 0; k < order.length; k += 1) {
          const i = order[k];
          const x = out[i * 5];
          const y = out[i * 5 + 1];
          const side = out[i * 5 + 2];
          const e = out[i * 5 + 3];
          tileColor(e, out[i * 5 + 4], rgb);
          paint.setColor(Float32Array.of(rgb[0], rgb[1], rgb[2], 1));
          const r = side * 0.5 * (1 - e);
          canvas.drawRRect(
            Skia.RRectXY(
              Skia.XYWHRect(x - side / 2, y - side / 2, side, side),
              r,
              r,
            ),
            paint,
          );
        }
      },
      Skia.XYWHRect(0, 0, cfg.canvas, cfg.canvas),
    );
  });

  const start = useRef({ yaw: 0, pitch: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => progress.value < 0.2,
        onMoveShouldSetPanResponder: () => progress.value < 0.2,
        onPanResponderGrant: () => {
          dragging.value = true;
          spin.value = 0;
          start.current = { yaw: yaw.value, pitch: pitch.value };
        },
        onPanResponderMove: (_, g) => {
          yaw.value = start.current.yaw + g.dx * 0.011;
          pitch.value = Math.max(
            -1.1,
            Math.min(1.1, start.current.pitch + g.dy * 0.011),
          );
        },
        onPanResponderRelease: (_, g) => {
          spin.value = g.vx * 0.011;
          dragging.value = false;
        },
        onPanResponderTerminate: () => {
          dragging.value = false;
        },
      }),
    [dragging, pitch, progress, spin, yaw],
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        showCode ? label : "Rotating sphere of tiles that becomes a QR code"
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
