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
  ClipOp,
  ColorType,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Rect,
  Skia,
  TileMode,
  vec,
  type SkCanvas,
  type SkImage,
  type SkPaint,
  type SkRuntimeEffect,
  type SkShader,
} from "@shopify/react-native-skia";
import {
  HOLE_DEFAULTS,
  PLANET_DEFAULTS,
  clamp,
  holeTarget,
  iscoRadius,
  makeDiskNoise,
  makePlanet,
  planetStep,
  shadowRadius,
  springStep,
  type HoleConfig,
  type PlanetSim,
} from "./holeMath";
import { HOLE_H, HOLE_W, HALO_BOTTOM, HALO_TOP, PLANET_PALETTE, RING_STRENGTH, SPACE_BACKGROUND } from "./holeDesign";

export type BlackHoleLensProps = {
  background: SkImage;
  width?: number;
  height?: number;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  planet?: boolean;
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
uniform float feed;

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
  return tint * half(beam * tex * (0.2 + 0.9 * temp) * atten) * half(1.0 + 1.4 * feed);
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

function drawPlanetSkia(canvas: SkCanvas, sim: PlanetSim, hx: number, hy: number, scale: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const px = sim.x * scale;
  const py = sim.y * scale;
  const ang = (Math.atan2(hy - sim.y, hx - sim.x) * 180) / Math.PI;
  if (sim.bodyScale > 0.001) {
    const r = PLANET_DEFAULTS.radius * scale * sim.bodyScale;
    const sx = 1 + sim.stretch * sim.bodyScale;
    const sy = 1 / (1 + sim.stretch * 0.7 * sim.bodyScale);
    const [lr, lg, lb] = PLANET_PALETTE.light;
    const [mr, mg, mb] = PLANET_PALETTE.mid;
    const [dr, dg, db] = PLANET_PALETTE.dark;
    const [br, bg, bb] = PLANET_PALETTE.band;
    const [gr, gg, gb] = PLANET_PALETTE.glow;
    canvas.save();
    canvas.translate(px, py);
    canvas.rotate(ang, 0, 0);
    canvas.scale(sx, sy);
    paint.setShader(
      Skia.Shader.MakeRadialGradient(
        vec(-r * 0.35, -r * 0.35),
        r * 1.6,
        [Skia.Color(`rgb(${lr},${lg},${lb})`), Skia.Color(`rgb(${mr},${mg},${mb})`), Skia.Color(`rgb(${dr},${dg},${db})`)],
        [0, 0.55, 1],
        TileMode.Clamp,
      ),
    );
    canvas.drawCircle(0, 0, r, paint);
    paint.setShader(null);
    canvas.save();
    const clip = Skia.Path.Make();
    clip.addCircle(0, 0, r);
    canvas.clipPath(clip, ClipOp.Intersect, true);
    paint.setColor(Skia.Color(`rgba(${br},${bg},${bb},0.55)`));
    canvas.drawOval(Skia.XYWHRect(-r * 1.2, -r * 0.44, r * 2.4, r * 0.32), paint);
    canvas.drawOval(Skia.XYWHRect(-r * 1.2, r * 0.04, r * 2.4, r * 0.4), paint);
    canvas.restore();
    if (r > 1.4) {
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(1.2);
      paint.setColor(Skia.Color(`rgba(${gr},${gg},${gb},0.4)`));
      canvas.drawCircle(0, 0, r - 0.6, paint);
      paint.setStyle(PaintStyle.Fill);
    }
    canvas.restore();
  }
  const [lr, lg, lb] = PLANET_PALETTE.light;
  const [mr, mg, mb] = PLANET_PALETTE.mid;
  for (const d of sim.debris) {
    const fade = clamp(1 - d.age / PLANET_DEFAULTS.debrisLife, 0, 1);
    if (fade <= 0) continue;
    const rr = Math.round(mr + (lr - mr) * d.tone);
    const gg = Math.round(mg + (lg - mg) * d.tone);
    const bb = Math.round(mb + (lb - mb) * d.tone);
    paint.setColor(Skia.Color(`rgba(${rr},${gg},${bb},${(fade * 0.95).toFixed(3)})`));
    canvas.drawCircle(d.x * scale, d.y * scale, Math.max(0.5, d.size * scale), paint);
  }
  paint.dispose();
}

export function BlackHoleLens({
  background,
  width = HOLE_W,
  height = HOLE_H,
  slowMotion = false,
  reducedMotion,
  planet = false,
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
  const latest = useRef({ slowMotion, reduce, planet, onFeedback });
  latest.current = { slowMotion, reduce, planet, onFeedback };
  const planetSim = useRef<PlanetSim | null>(null);
  const scene = useRef<{ img: SkImage | null; shader: SkShader | null }>({ img: null, shader: null });
  const sceneSig = useRef("");
  const sceneDirty = useRef(false);

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
      let feed = 0;
      let srcShader = bgShader;
      if (latest.current.planet) {
        if (!planetSim.current) {
          planetSim.current = makePlanet(PLANET_DEFAULTS, HOLE_DEFAULTS.seed ^ 61);
          sceneDirty.current = true;
        }
        const ps = planetSim.current;
        planetStep(ps, s.cx, s.cy, dt, HOLE_DEFAULTS, PLANET_DEFAULTS);
        feed = ps.feed;
        const sig = `${ps.state}|${ps.bodyScale.toFixed(3)}|${ps.stretch.toFixed(3)}|${ps.debris.length}`;
        if (ps.debris.length > 0 || sig !== sceneSig.current) sceneDirty.current = true;
        sceneSig.current = sig;
        if (sceneDirty.current) {
          sceneDirty.current = false;
          const scale = background.width() / cfg.width;
          const surface = Skia.Surface.MakeOffscreen(background.width(), background.height());
          if (surface) {
            const c = surface.getCanvas();
            c.drawImage(background, 0, 0);
            drawPlanetSkia(c, ps, s.cx, s.cy, scale);
            surface.flush();
            const snap = surface.makeImageSnapshot();
            const copy = snap.makeNonTextureImage();
            snap.dispose();
            surface.dispose();
            if (copy) {
              const sh = copy.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
              scene.current.shader?.dispose();
              scene.current.img?.dispose();
              scene.current = { img: copy, shader: sh };
            }
          }
        }
        srcShader = scene.current.shader ?? bgShader;
      } else if (planetSim.current) {
        planetSim.current = null;
        sceneSig.current = "";
        scene.current.shader?.dispose();
        scene.current.img?.dispose();
        scene.current = { img: null, shader: null };
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
          feed,
        ],
        [srcShader, noiseShader],
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
      planetSim.current = null;
      sceneSig.current = "";
      scene.current.shader?.dispose();
      scene.current.img?.dispose();
      scene.current = { img: null, shader: null };
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
