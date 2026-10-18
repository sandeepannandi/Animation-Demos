import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  PanResponder,
  View,
  type ViewStyle,
} from "react-native";
import {
  AlphaType,
  Canvas,
  ColorType,
  FilterMode,
  Group,
  MipmapMode,
  Rect,
  Skia,
  TileMode,
  type SkImage,
  type SkPaint,
  type SkRuntimeEffect,
  type SkShader,
} from "@shopify/react-native-skia";
import {
  FOG_DEFAULTS,
  applyWipe,
  createFog,
  packFrame,
  stepFogFixed,
  type FogConfig,
  type FogState,
} from "./fogMath";

export type FoggedGlassProps = {
  /** The scene behind the glass, sharp. */
  image: SkImage;
  /** The same scene, blurred (the foggy read). */
  blurred: SkImage;
  /** Pane size in layout points. */
  width?: number;
  height?: number;
  /** Fog texture resolution. */
  cols?: number;
  rows?: number;
  /** Runs the condensation clock about four times slower. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
  reducedMotion?: boolean;
  /** Fired with 'wipe' and 'release' as the glass is wiped (hook haptics here). */
  onFeedback?: (event: "wipe" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

const SKSL = `
uniform shader sceneSharp;
uniform shader sceneBlur;
uniform shader fogTex;
uniform float2 dstOrigin;
uniform float2 dstSize;
uniform float2 texSize;
uniform float2 sceneSize;
uniform float2 blurSize;

half4 main(float2 xy) {
  float2 uv = (xy - dstOrigin) / dstSize;
  float2 tuv = uv * texSize;
  float4 f = fogTex.eval(tuv);
  float fog = clamp(f.r, 0.0, 1.0);
  float dome = f.g;
  half3 sharp = sceneSharp.eval(uv * sceneSize).rgb;
  half3 soft = sceneBlur.eval(uv * blurSize).rgb;
  half3 col = mix(sharp, soft, fog);
  col = mix(col, half3(0.93, 0.95, 0.97), fog * 0.55);
  col *= 1.0 - 0.08 * fog * uv.y;
  if (dome > 0.004) {
    float2 e = 1.0 / texSize;
    float gx = fogTex.eval(tuv + float2(e.x, 0.0)).g - fogTex.eval(tuv - float2(e.x, 0.0)).g;
    float gy = fogTex.eval(tuv + float2(0.0, e.y)).g - fogTex.eval(tuv - float2(0.0, e.y)).g;
    // Lens: the dome bends the view toward the bead centre and magnifies it.
    float2 off = clamp(float2(gx, gy) * 0.24 * dome, -0.05, 0.05);
    half3 bead = sceneSharp.eval(clamp(uv + off, 0.0, 1.0) * sceneSize).rgb;
    // Light from the upper left: bright rim there, contact shadow lower right.
    float lit = clamp((gx * 0.55 + gy * 0.83) * 2.8, -1.0, 1.0);
    float hi = max(lit, 0.0);
    float shadow = max(-lit, 0.0);
    // Small beads stay glassy; the strong shading grows in with size.
    float body = smoothstep(0.05, 0.45, dome);
    float spec = hi * hi * dome * 1.1;
    half3 bcol = bead * (1.04 + 0.26 * hi * body - 0.4 * shadow * body) + spec * body;
    col = mix(col, bcol, smoothstep(0.004, 0.08, dome));
  }
  return half4(col, 1.0);
}
`;

// Compiled once per app lifetime; null means SkSL unsupported -> static fallback.
let cachedEffect: SkRuntimeEffect | null | undefined;
function getEffect(): SkRuntimeEffect | null {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL);
  return cachedEffect;
}

export function FoggedGlass({
  image,
  blurred,
  width = 340,
  height = 460,
  cols = 96,
  rows = 128,
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Fogged glass window",
  style,
}: FoggedGlassProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;

  const cfg: FogConfig = useMemo(() => ({ cols, rows, width, height }), [cols, rows, width, height]);
  const opts = useMemo(() => FOG_DEFAULTS, []);
  const simRef = useRef<FogState | null>(null);
  if (!simRef.current) simRef.current = createFog(cfg, opts);
  const bytesRef = useRef<Uint8Array | null>(null);
  if (!bytesRef.current) bytesRef.current = new Uint8Array(cols * rows * 4);

  const effect = getEffect();
  const shaders = useMemo(() => {
    if (!effect) return null;
    const sampling = [TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None] as const;
    const sharp = image.makeShaderOptions(...sampling);
    const soft = blurred.makeShaderOptions(...sampling);
    return { sharp, soft };
  }, [effect, image, blurred]);
  useEffect(() => () => {
    shaders?.sharp.dispose();
    shaders?.soft.dispose();
  }, [shaders]);

  const [paint, setPaint] = useState<SkPaint | null>(null);
  const latest = useRef({ slowMotion, reduce, onFeedback });
  latest.current = { slowMotion, reduce, onFeedback };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setSystemReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // A size or grid change rebuilds the fog from a fully misted pane.
  useEffect(() => {
    simRef.current = createFog(cfg, opts);
    bytesRef.current = new Uint8Array(cfg.cols * cfg.rows * 4);
  }, [cfg, opts]);

  const pointer = useRef({ x: 0, y: 0, active: false });

  // JS-thread frame loop: steps the sim, packs the fog texture and publishes
  // a fresh runtime-shader paint. The per-frame Fabric commits keep the
  // render pipeline awake on a quiet Android screen, the same mechanism as
  // Light on Painting, so no separate keep-alive view is needed.
  useEffect(() => {
    if (!effect || !shaders) return;
    let alive = true;
    let last = 0;
    let prevImage: SkImage | null = null;
    let prevFogShader: SkShader | null = null;
    let prevPaint: SkPaint | null = null;
    const loop = (now: number) => {
      if (!alive) return;
      const sim = simRef.current!;
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (!latest.current.reduce) {
        stepFogFixed(sim, cfg, dt * (latest.current.slowMotion ? 0.25 : 1), opts);
      }
      const bytes = packFrame(sim, cfg, bytesRef.current!);
      const fogImage = Skia.Image.MakeImage(
        { width: cfg.cols, height: cfg.rows, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
        Skia.Data.fromBytes(bytes),
        cfg.cols * 4,
      );
      if (fogImage) {
        const fogShader = fogImage.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
        const next = Skia.Paint();
        next.setShader(
          effect.makeShaderWithChildren(
            [0, 0, cfg.width, cfg.height, cfg.cols, cfg.rows, image.width(), image.height(), blurred.width(), blurred.height()],
            [shaders.sharp, shaders.soft, fogShader],
          ),
        );
        setPaint(next);
        prevPaint?.dispose();
        prevFogShader?.dispose();
        prevImage?.dispose();
        prevPaint = next;
        prevFogShader = fogShader;
        prevImage = fogImage;
      }
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      prevPaint?.dispose();
      prevFogShader?.dispose();
      prevImage?.dispose();
    };
  }, [effect, shaders, cfg, opts, image, blurred]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.reduce,
        onPanResponderGrant: (evt) => {
          pointer.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY, active: true };
          const sim = simRef.current;
          if (sim) {
            sim.wasWiping = 0;
            applyWipe(sim, cfg, pointer.current.x, pointer.current.y, opts);
          }
          latest.current.onFeedback?.("wipe");
        },
        onPanResponderMove: (evt) => {
          pointer.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY, active: true };
          const sim = simRef.current;
          if (sim) applyWipe(sim, cfg, pointer.current.x, pointer.current.y, opts);
        },
        onPanResponderRelease: () => {
          pointer.current = { x: 0, y: 0, active: false };
          const sim = simRef.current;
          if (sim) sim.wasWiping = 0;
          latest.current.onFeedback?.("release");
        },
        onPanResponderTerminate: () => {
          pointer.current = { x: 0, y: 0, active: false };
          const sim = simRef.current;
          if (sim) sim.wasWiping = 0;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [cfg, opts],
  );

  return (
    <View
      style={[{ width, height, borderRadius: 18, overflow: "hidden", backgroundColor: "#131828" }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      <Canvas pointerEvents="none" style={{ width, height }}>
        <Group>
          {paint ? (
            <Rect x={0} y={0} width={width} height={height} paint={paint} />
          ) : (
            <Rect x={0} y={0} width={width} height={height} color="#dfe5ea" />
          )}
        </Group>
      </Canvas>
    </View>
  );
}
