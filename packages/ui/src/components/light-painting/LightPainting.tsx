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
  FilterMode,
  Image as SkImageElement,
  MipmapMode,
  Path,
  RadialGradient,
  Rect,
  Skia,
  TileMode,
  vec,
  type SkImage,
  type SkPaint,
  type SkRuntimeEffect,
  type SkShader,
} from "@shopify/react-native-skia";
import {
  createRope,
  stepRopeFixed,
  bulbPosition,
  shadeBuffer,
  type Rope,
  type Vec,
} from "./lightMath";
import { PAINTINGS, rasterize, type RasterizedPainting } from "./paintings";
import { LIGHT_TEX_SIZE, SKSL_SRC } from "./shaders";

const FALLBACK_SHADE = 160; // CPU fallback buffer resolution
const FRAME = 56; // wooden frame inset, in scene pixels at size=1 scale
const BULB_Z = 1.1;
const INTENSITY = 1.1;
const AMBIENT = 0.12;
const SHADOW_FLOOR = 0.2;
// Rope coordinates are 0..1 scene units; the web adapter's default gravity
// (1400 px/s^2 over a 600px-tall scene) maps to 1400/600 in unit space.
const GRAVITY = 1400 / 600;

// Compiled once per app lifetime; null means SkSL unsupported -> CPU fallback.
let cachedEffect: SkRuntimeEffect | null | undefined;
function getEffect(): SkRuntimeEffect | null {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL_SRC);
  return cachedEffect;
}

interface PaintingTextures {
  albedo: SkImage;
  depth: SkImage;
  albedoShader: SkShader;
  depthShader: SkShader;
}

function makeTextures(r: RasterizedPainting): PaintingTextures | null {
  const size = r.size;
  const depthBytes = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, Math.round(r.depth[i] * 255)));
    const a = i * 4;
    depthBytes[a] = v;
    depthBytes[a + 1] = v;
    depthBytes[a + 2] = v;
    depthBytes[a + 3] = 255;
  }
  const albedo = Skia.Image.MakeImage(
    { width: size, height: size, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
    Skia.Data.fromBytes(new Uint8Array(r.albedo.buffer, r.albedo.byteOffset, r.albedo.byteLength)),
    size * 4,
  );
  const depth = Skia.Image.MakeImage(
    { width: size, height: size, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Premul },
    Skia.Data.fromBytes(depthBytes),
    size * 4,
  );
  if (!albedo || !depth) return null;
  const opts = [TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None] as const;
  return {
    albedo,
    depth,
    albedoShader: albedo.makeShaderOptions(...opts),
    depthShader: depth.makeShaderOptions(...opts),
  };
}

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
 * Shading runs in a SkSL runtime shader (albedo + depth textures, per-pixel
 * lambert/falloff/penumbra - the same maths shadeBuffer() implements for
 * the Node tests and the CPU fallback below). If the runtime effect cannot
 * compile, shading falls back to the JS thread at ~30fps into a 160px
 * buffer upscaled by Skia. Not device-tested; no frame-rate claim.
 */
export function LightPainting({ size = 320, style }: LightPaintingProps) {
  const effect = getEffect();
  // GPU path: 256px albedo + depth textures per painting, built once.
  const textures = useMemo<PaintingTextures[] | null>(() => {
    if (!effect) return null;
    const out: PaintingTextures[] = [];
    for (const p of PAINTINGS) {
      const t = makeTextures(rasterize(p, LIGHT_TEX_SIZE));
      if (!t) return null;
      out.push(t);
    }
    return out;
  }, [effect]);
  // CPU fallback path: low-res composite buffers, only when no shader.
  const rasters = useMemo(
    () => (textures ? [] : PAINTINGS.map((p) => rasterize(p, FALLBACK_SHADE))),
    [textures],
  );
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
    const out = new Uint8ClampedArray(FALLBACK_SHADE * FALLBACK_SHADE * 4);
    const loop = (now: number) => {
      if (!alive) return;
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const rope = ropeRef.current!;
      if (!reducedRef.current) stepRopeFixed(rope, dt, { dragTarget: dragRef.current, elasticity: 0.08, gravity: GRAVITY });
      const bulb = bulbPosition(rope);
      const cord =
        rope.nodes.map((n, i) => `${i === 0 ? "M" : "L"} ${n.x * size} ${n.y * size}`).join(" ") +
        ` L ${bulb.x * size} ${bulb.y * size}`;
      if (textures) {
        // GPU shades per pixel; JS only publishes the bulb and cord.
        if (tick++ % 2 === 0) {
          setFrame((f) => ({ image: f.image, bulb, cord, painting: f.painting }));
        }
      } else if (tick++ % 2 === 0) {
        // ~30fps CPU fallback shading
        const r = rasters[frame.painting % rasters.length];
        shadeBuffer({
          size: FALLBACK_SHADE,
          albedo: r.albedo,
          depth: r.depth,
          bulb: { x: bulb.x * FALLBACK_SHADE, y: bulb.y * FALLBACK_SHADE },
          bulbZ: BULB_Z,
          intensity: INTENSITY,
          ambient: AMBIENT,
          out,
        });
        const data = Skia.Data.fromBytes(new Uint8Array(out.buffer, out.byteOffset, out.byteLength));
        const image = Skia.Image.MakeImage(
          { width: FALLBACK_SHADE, height: FALLBACK_SHADE, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Premul },
          data,
          FALLBACK_SHADE * 4,
        );
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
  }, [rasters, textures, size, frame.painting]);

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
          if (Math.abs(dx) > size * 0.18 && (Date.now() - swipe.t < 600 || Math.abs(dx) > size * 0.45)) {
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

  // GPU path: per-frame runtime-shader paint over the painting rect.
  let paint: SkPaint | null = null;
  const tex = textures ? textures[frame.painting % textures.length] : null;
  if (effect && tex) {
    paint = Skia.Paint();
    paint.setShader(
      effect.makeShaderWithChildren(
        [fx, fx, fs, fs, LIGHT_TEX_SIZE, frame.bulb.x, frame.bulb.y, BULB_Z, INTENSITY, AMBIENT, SHADOW_FLOOR],
        [tex.albedoShader, tex.depthShader],
      ),
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} {...responder.panHandlers}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size} height={size} color="#0a0c10" />
        {paint ? (
          <Rect x={fx} y={fx} width={fs} height={fs} paint={paint} />
        ) : frame.image ? (
          <SkImageElement image={frame.image} x={fx} y={fx} width={fs} height={fs} fit="fill" />
        ) : null}
      </Canvas>
      <Canvas style={StyleSheet.absoluteFill}>
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
