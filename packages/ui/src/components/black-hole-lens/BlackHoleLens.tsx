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
  HOLE_DEFAULTS,
  holeTarget,
  iscoRadius,
  makeDiskNoise,
  shadowRadius,
  springStep,
  type HoleConfig,
} from "./holeMath";
import { HOLE_H, HOLE_W, HALO_BOTTOM, HALO_TOP, RING_STRENGTH, SPACE_BACKGROUND } from "./holeDesign";

export type BlackHoleLensProps = {
  background: SkImage;
  width?: number;
  height?: number;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "grab" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

const SKSL = `
uniform shader src;
uniform shader diskTex;
uniform float2 center;
uniform float2 size;
uniform float2 texSize;
uniform float einstein;
uniform float shadowR;
uniform float diskIn;
uniform float diskOut;
uniform float inclCos;
uniform float spin;
uniform float time;
uniform float sectors;
uniform float rings;
uniform float haloTopH;
uniform float haloTopA;
uniform float haloBottomH;
uniform float haloBottomA;
uniform float ringStrength;

half3 diskEmission(float rr, float ang, float atten) {
  float beta = sqrt(diskIn / (6.0 * rr));
  float gam = inversesqrt(1.0 - beta * beta);
  float sinI = sqrt(1.0 - inclCos * inclCos);
  float cosView = -cos(ang) * sinI;
  float dop = 1.0 / (gam * (1.0 - beta * cosView));
  float gred = sqrt(max(0.0, 1.0 - diskIn / (3.0 * rr)));
  float beam = clamp(pow(dop * gred, 3.0), 0.04, 6.0);
  float x = diskIn / rr;
  float temp = pow(max(0.0, x * x * x * (1.0 - sqrt(x))), 0.25) / 0.4879;
  float phase = spin * time * pow(diskIn / rr, 1.5);
  float u = fract((ang + phase) / 6.2831853 + 1.0);
  float v = clamp((rr - diskIn) / (diskOut - diskIn), 0.0, 1.0);
  float n = diskTex.eval(float2(u * sectors, v * rings)).r;
  float n2 = diskTex.eval(float2(fract(u * 2.0 + 0.35) * sectors, v * rings)).r;
  float tex = 0.5 + 0.85 * (n * 0.7 + n2 * 0.3);
  half3 tint = temp > 0.55
    ? mix(half3(1.0, 0.85, 0.62), half3(0.82, 0.88, 1.0), half((temp - 0.55) / 0.45))
    : mix(half3(1.0, 0.42, 0.22), half3(1.0, 0.85, 0.62), half(temp / 0.55));
  return tint * half(beam * tex * (0.2 + 0.9 * temp) * atten);
}

half4 main(float2 p) {
  float2 d = p - center;
  float r = length(d);
  float2 dir = r > 0.0001 ? d / r : float2(1.0, 0.0);
  half3 col = half3(0.0);
  if (r >= shadowR) {
    float sr = r - einstein * einstein / max(r, 0.0001);
    float2 sp = clamp(center + dir * sr, float2(0.0), size - 1.0);
    col = src.eval(sp * (texSize / size)).rgb;
  }
  float qy = d.y / inclCos;
  float rr = length(float2(d.x, qy));
  float ang = atan(qy, d.x);
  if (r > shadowR && d.y < 0.0) {
    float t = (r - shadowR) / haloTopH;
    if (t < 1.0) col += diskEmission(diskIn + t * (diskOut - diskIn), -ang, haloTopA) * (1.0 - t * t);
  }
  if (r > shadowR && d.y > 0.0) {
    float t = (r - shadowR) / haloBottomH;
    if (t < 1.0) col += diskEmission(diskIn + t * (diskOut - diskIn), -ang, haloBottomA) * (1.0 - t * t);
  }
  col += half3(0.75, 0.85, 1.0) * half(exp(-abs(r - shadowR) / 2.1) * ringStrength);
  if (rr >= diskIn && rr <= diskOut && (d.y > 0.0 || r >= shadowR)) {
    float edge = smoothstep(diskIn, diskIn + 3.0, rr) * (1.0 - smoothstep(diskOut - 12.0, diskOut, rr));
    col = mix(col, diskEmission(rr, ang, 1.0), half(edge * 0.96));
  }
  return half4(col, 1.0);
}
`;

let cachedEffect: SkRuntimeEffect | null | undefined;
function getEffect(): SkRuntimeEffect | null {
  if (cachedEffect === undefined) cachedEffect = Skia.RuntimeEffect.Make(SKSL);
  return cachedEffect;
}

function makeNoiseShader(): SkShader | null {
  const rings = HOLE_DEFAULTS.noiseRings;
  const sectors = HOLE_DEFAULTS.noiseSectors;
  const noise = makeDiskNoise(rings, sectors, HOLE_DEFAULTS.seed);
  const bytes = new Uint8Array(rings * sectors * 4);
  for (let i = 0; i < rings * sectors; i++) {
    const v = Math.round(Math.max(0, Math.min(1, noise[i])) * 255);
    bytes[i * 4] = v;
    bytes[i * 4 + 1] = v;
    bytes[i * 4 + 2] = v;
    bytes[i * 4 + 3] = 255;
  }
  const image = Skia.Image.MakeImage(
    { width: sectors, height: rings, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Opaque },
    Skia.Data.fromBytes(bytes),
    sectors * 4,
  );
  if (!image) return null;
  const shader = image.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
  image.dispose();
  return shader;
}

export function BlackHoleLens({
  background,
  width = HOLE_W,
  height = HOLE_H,
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Black hole lens",
  style,
}: BlackHoleLensProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const cfg: HoleConfig = useMemo(
    () => ({
      width,
      height,
      rs: HOLE_DEFAULTS.rs,
      einstein: HOLE_DEFAULTS.einstein,
      diskOut: HOLE_DEFAULTS.diskOut,
      inclCos: HOLE_DEFAULTS.inclCos,
      spin: HOLE_DEFAULTS.spin,
    }),
    [width, height],
  );

  const effect = getEffect();
  const bgShader = useMemo(
    () => background.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None),
    [background],
  );
  const noiseShader = useMemo(() => makeNoiseShader(), []);
  useEffect(
    () => () => {
      bgShader.dispose();
      noiseShader?.dispose();
    },
    [bgShader, noiseShader],
  );

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

  const sim = useRef({
    cx: width / 2,
    cy: height / 2,
    vx: 0,
    vy: 0,
    tx: width / 2,
    ty: height / 2,
    time: 0,
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const t = holeTarget(evt.nativeEvent.locationX, evt.nativeEvent.locationY, cfg, HOLE_DEFAULTS);
          sim.current.tx = t.x;
          sim.current.ty = t.y;
          latest.current.onFeedback?.("grab");
        },
        onPanResponderMove: (evt) => {
          const t = holeTarget(evt.nativeEvent.locationX, evt.nativeEvent.locationY, cfg, HOLE_DEFAULTS);
          sim.current.tx = t.x;
          sim.current.ty = t.y;
        },
        onPanResponderRelease: () => {
          latest.current.onFeedback?.("release");
        },
        onPanResponderTerminate: () => {},
      }),
    [cfg],
  );

  useEffect(() => {
    if (!effect || !noiseShader) return;
    let alive = true;
    let last = 0;
    let prevPaint: SkPaint | null = null;
    let prevShader: SkShader | null = null;
    const loop = (now: number) => {
      if (!alive) return;
      const s = sim.current;
      const dt = last ? Math.min(48, now - last) / 1000 : 1 / 60;
      last = now;
      if (latest.current.reduce) {
        s.cx = s.tx;
        s.cy = s.ty;
        s.vx = 0;
        s.vy = 0;
      } else {
        const a = springStep(s.cx, s.vx, s.tx, dt);
        const b = springStep(s.cy, s.vy, s.ty, dt);
        s.cx = a.pos;
        s.vx = a.vel;
        s.cy = b.pos;
        s.vy = b.vel;
        s.time += dt * (latest.current.slowMotion ? 0.25 : 1);
      }
      const diskIn = iscoRadius(cfg.rs);
      const shader = effect.makeShaderWithChildren(
        [
          s.cx,
          s.cy,
          cfg.width,
          cfg.height,
          background.width(),
          background.height(),
          cfg.einstein,
          shadowRadius(cfg.rs),
          diskIn,
          cfg.diskOut,
          cfg.inclCos,
          cfg.spin,
          s.time,
          HOLE_DEFAULTS.noiseSectors,
          HOLE_DEFAULTS.noiseRings,
          HALO_TOP.height,
          HALO_TOP.atten,
          HALO_BOTTOM.height,
          HALO_BOTTOM.atten,
          RING_STRENGTH,
        ],
        [bgShader, noiseShader],
      );
      const next = Skia.Paint();
      next.setShader(shader);
      setPaint(next);
      prevPaint?.dispose();
      prevShader?.dispose();
      prevPaint = next;
      prevShader = shader;
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      prevPaint?.dispose();
      prevShader?.dispose();
    };
  }, [effect, bgShader, noiseShader, cfg, background]);

  return (
    <View
      style={[{ width, height, borderRadius: 18, overflow: "hidden", backgroundColor: SPACE_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      <Canvas pointerEvents="none" style={{ width, height }}>
        {paint ? (
          <Rect x={0} y={0} width={width} height={height} paint={paint} />
        ) : (
          <Rect x={0} y={0} width={width} height={height} color={SPACE_BACKGROUND} />
        )}
      </Canvas>
    </View>
  );
}
