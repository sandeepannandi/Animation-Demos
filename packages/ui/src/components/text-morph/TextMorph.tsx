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
  type SkFont,
} from "@shopify/react-native-skia";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  buildMorph,
  layoutGlyphs,
  makeConfig,
  pageColor,
  type PixelImage,
} from "./textMorphMath";

export type TextMorphProps = {
  /** The paragraph. Spaces are not drawn; every other character becomes one point of the picture. */
  text: string;
  /** RGBA pixels of the picture the letters become. See scene.ts for a procedural one. */
  image: PixelImage;
  /** Width in points. Height is 1.25 x width. */
  size: number;
  /** A loaded Skia font, for example from useFont(). The component sets its size. */
  font: SkFont | null;
  /** false shows the typeset page, true shows the picture. */
  morphed: boolean;
  /** Called with the end state a tap or a drag release asks for. */
  onMorphedChange?: (morphed: boolean) => void;
  reducedMotion?: boolean;
  /** Read by screen readers once the picture is shown. */
  label?: string;
  style?: ViewStyle;
};

const INK = [0.13, 0.12, 0.11];

export function TextMorph({
  text,
  image,
  size,
  font,
  morphed,
  onMorphedChange,
  reducedMotion,
  label = "Picture made of letters",
  style,
}: TextMorphProps) {
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
  const cfg = useMemo(() => makeConfig(size), [size]);
  const data = useMemo(() => {
    if (!font) return null;
    font.setSize(cfg.fontSize);
    // One advance per character: no kerning, no shaping. Latin text only.
    return buildMorph(text, image, cfg, (ch) => font.getTextWidth(ch));
  }, [font, text, image, cfg]);

  const progress = useSharedValue(morphed ? 1 : 0);
  const dragStart = useRef(0);
  const live = useRef({ morphed, cb: onMorphedChange, reduced });
  live.current = { morphed, cb: onMorphedChange, reduced };

  const settle = (to: number) => {
    progress.value = withTiming(to, {
      duration: reduced ? 200 : 2200,
      easing: Easing.inOut(Easing.cubic),
    });
  };

  useEffect(() => {
    settle(morphed ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morphed, reduced]);

  const picture = useDerivedValue(() => {
    const rect = Skia.XYWHRect(0, 0, cfg.width, cfg.height);
    if (!data || !font) return createPicture(() => {}, rect);
    const p = progress.value;
    const out: number[] = new Array(data.count * 7);
    layoutGlyphs(p, data, INK, out);
    const page = [0, 0, 0];
    pageColor(p, page);
    return createPicture((canvas) => {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Float32Array.of(page[0], page[1], page[2], 1));
      canvas.drawRect(rect, paint);
      for (let i = 0; i < data.count; i += 1) {
        const o = i * 7;
        const s = out[o + 3];
        font.setSize(s);
        paint.setColor(Float32Array.of(out[o + 4], out[o + 5], out[o + 6], 1));
        const w = (data.gw[i] * s) / data.fontSize;
        canvas.save();
        canvas.translate(out[o], out[o + 1]);
        canvas.rotate((out[o + 2] * 180) / Math.PI, 0, 0);
        canvas.drawText(data.chars[i], -w / 2, s * 0.34, paint, font);
        canvas.restore();
      }
    }, rect);
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = progress.value;
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) < 6) return;
          progress.value = Math.max(
            0,
            Math.min(1, dragStart.current + g.dx / (size * 0.7)),
          );
        },
        onPanResponderRelease: (_, g) => {
          const dragged = Math.abs(g.dx) >= 6 || Math.abs(g.dy) >= 6;
          const { morphed: m, cb } = live.current;
          const to = dragged
            ? progress.value + g.vx * 0.25 > 0.5
              ? 1
              : 0
            : m
              ? 0
              : 1;
          settle(to);
          cb?.(to === 1);
        },
        onPanResponderTerminate: () => settle(live.current.morphed ? 1 : 0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress, size],
  );

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={morphed ? label : "Paragraph of text"}
      accessibilityHint="Double tap to turn the letters into a picture, or back"
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={() => onMorphedChange?.(!morphed)}
      style={[
        {
          width: cfg.width,
          height: cfg.height,
          borderRadius: 18,
          overflow: "hidden",
        },
        style,
      ]}
      {...responder.panHandlers}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
