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
  Circle,
  ColorType,
  AlphaType,
  Image as SkImageElement,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  createRope,
  stepRopeFixed,
  bulbPosition,
  shadeBuffer,
  type Rope,
  type Vec,
} from "./lightMath";
import { PAINTINGS, rasterize } from "./paintings";

const SHADE = 160; // shading buffer resolution
const FRAME = 56; // wooden frame inset, in scene pixels at size=1 scale

export interface LightPaintingProps {
  size?: number;
  style?: ViewStyle;
}

interface Frame {
  image: SkImage | null;
  bulb: Vec;
  cord: string;
  painting: number;
}

/**
 * A bulb on a cord in front of a painting. Drag the bulb and the painting
 * relights from its position; raised shapes throw shadows through an
 * authored depth map. Swipe across the painting for the next one.
 *
 * Shading runs on the JS thread at ~30fps into a 160px buffer and is
 * upscaled by Skia - it reuses the exact maths the web adapter and the
 * Node tests exercise. Not device-tested; no frame-rate claim.
 */
export function LightPainting({ size = 320, style }: LightPaintingProps) {
  const rasters = useMemo(() => PAINTINGS.map((p) => rasterize(p, SHADE)), []);
  const ropeRef = useRef<Rope | null>(null);
  if (!ropeRef.current) {
    ropeRef.current = createRope({
      anchor: { x: 0.5, y: 0.01 },
      segments: 8,
      length: 0.5,
    });
  }
  const dragRef = useRef<Vec | null>(null);
  const swipeRef = useRef<{ x: number; t: number } | null>(null);
  const reducedRef = useRef(false);
  const [frame, setFrame] = useState<Frame>({
    image: null,
    bulb: { x: 0.5, y: 0.33 },
    cord: "",
    painting: 0,
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedRef.current = v;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    let last = 0;
    let tick = 0;
    const out = new Uint8ClampedArray(SHADE * SHADE * 4);
    const loop = (now: number) => {
      if (!alive) return;
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const rope = ropeRef.current!;
      if (!reducedRef.current) stepRopeFixed(rope, dt, { dragTarget: dragRef.current, elasticity: 0.08 });
      // ~30fps shading: shade every other rAF tick
      if (tick++ % 2 === 0) {
        const bulb = bulbPosition(rope);
        const r = rasters[frame.painting % rasters.length];
        shadeBuffer({
          size: SHADE,
          albedo: r.albedo,
          depth: r.depth,
          bulb: { x: bulb.x * SHADE, y: bulb.y * SHADE },
          bulbZ: 1.1,
          intensity: 1.1,
          ambient: 0.12,
          out,
        });
        const data = Skia.Data.fromBytes(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
        const image = Skia.Image.MakeImage(
          { width: SHADE, height: SHADE, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Premul },
          data,
          SHADE * 4,
        );
        const cord =
          rope.nodes.map((n, i) => `${i === 0 ? "M" : "L"} ${n.x * size} ${n.y * size}`).join(" ") +
          ` L ${bulb.x * size} ${bulb.y * size}`;
        setFrame((f) => {
          f.image?.dispose?.();
          return { image, bulb, cord, painting: f.painting };
        });
      }
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [rasters, size, frame.painting]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const bulb = bulbPosition(ropeRef.current!);
          const bx = bulb.x * size;
          const by = bulb.y * size;
          if (Math.hypot(locationX - bx, locationY - by) < size * 0.22) {
            dragRef.current = { x: locationX / size, y: locationY / size };
          } else {
            swipeRef.current = { x: locationX, t: Date.now() };
          }
        },
        onPanResponderMove: (e) => {
          if (dragRef.current) {
            dragRef.current = {
              x: e.nativeEvent.locationX / size,
              y: e.nativeEvent.locationY / size,
            };
          }
        },
        onPanResponderRelease: (e) => {
          if (dragRef.current) {
            dragRef.current = null;
            return;
          }
          const swipe = swipeRef.current;
          swipeRef.current = null;
          if (!swipe) return;
          const dx = e.nativeEvent.locationX - swipe.x;
          if (Math.abs(dx) > size * 0.18 && Date.now() - swipe.t < 600) {
            setFrame((f) => ({
              ...f,
              painting:
                dx < 0
                  ? (f.painting + 1) % PAINTINGS.length
                  : (f.painting - 1 + PAINTINGS.length) % PAINTINGS.length,
            }));
          }
        },
        onPanResponderTerminate: () => {
          dragRef.current = null;
          swipeRef.current = null;
        },
      }),
    [size],
  );

  const fx = (FRAME / 640) * size;
  const fs = size - fx * 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} {...responder.panHandlers}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size} height={size} color="#0a0c10" />
        {frame.image ? (
          <SkImageElement image={frame.image} x={fx} y={fx} width={fs} height={fs} fit="fill" />
        ) : null}
        <Rect x={fx - 3} y={fx - 3} width={fs + 6} height={fs + 6} style="stroke" strokeWidth={5} color="#3d2c1c" />
        {frame.cord ? <Path path={frame.cord} style="stroke" strokeWidth={1.6} color="#2a2f3a" /> : null}
        <Circle cx={frame.bulb.x * size} cy={frame.bulb.y * size} r={size * 0.18} opacity={0.5}>
          <RadialGradient
            c={vec(frame.bulb.x * size, frame.bulb.y * size)}
            r={size * 0.18}
            colors={["#ffe9b866", "#ffe9b800"]}
          />
        </Circle>
        <Circle cx={frame.bulb.x * size} cy={frame.bulb.y * size} r={size * 0.035} color="#ffe9b8" />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
