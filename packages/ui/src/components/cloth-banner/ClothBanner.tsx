import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  PanResponder,
  View,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Circle,
  FilterMode,
  Group,
  ImageShader,
  MipmapMode,
  Skia,
  Vertices,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import {
  CLOTH_DEFAULTS,
  clothIndices,
  clothUV,
  computeMesh,
  createCloth,
  pickParticle,
  stepClothFixed,
  type ClothConfig,
  type ClothPointer,
  type ClothState,
} from "./clothMath";

export type ClothBannerProps = {
  /** The banner artwork, painted on both sides of the cloth (mirrored on the back). */
  image: SkImage;
  /** Banner size at rest, in layout points. The canvas is padded for the swing. */
  width?: number;
  height?: number;
  /** Cloth resolution. */
  cols?: number;
  rows?: number;
  /** Runs the cloth clock about four times slower. Ignored while Reduce Motion is on. */
  slowMotion?: boolean;
  reducedMotion?: boolean;
  /** Fired with 'grab' and 'release' as the cloth is tugged (hook haptics here). */
  onFeedback?: (event: "grab" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

const PAD_X = 48;
const PAD_TOP = 40;
const PAD_BOTTOM = 64;

// One-pixel-tall lookup strip: the pixel at x is black with alpha (1 - x / 255). The shading pass maps each vertex's
// brightness into this strip as a texture coordinate, so the GPU interpolates shade across the triangle and the strip
// turns it into a darkening overlay. (Per-vertex colors are not used: they do not combine with an image shader, and
// on Android they render black - the FoldedPass device-proven pattern.)
function makeShadeRamp() {
  const surface = Skia.Surface.MakeOffscreen(256, 1);
  if (!surface) throw new Error("Unable to prepare the shade ramp");
  const canvas = surface.getCanvas(),
    paint = Skia.Paint();
  canvas.clear(Skia.Color("transparent"));
  for (let i = 0; i < 256; i++) {
    paint.setColor(Skia.Color(`rgba(0,0,0,${(1 - i / 255).toFixed(4)})`));
    canvas.drawRect(Skia.XYWHRect(i, 0, 1, 1), paint);
  }
  surface.flush();
  const snapshot = surface.makeImageSnapshot(),
    copy = snapshot.makeNonTextureImage();
  snapshot.dispose();
  surface.dispose();
  paint.dispose();
  if (!copy) throw new Error("Unable to copy the shade ramp");
  return copy;
}

// Quiet-screen keep-alive (device-proven on Android new arch): Reanimated's UI loop dies a few frames after the UI
// goes quiet - pure Skia-canvas updates neither re-post it nor wake it, so canvas animations freeze while the user
// just watches. A 1px view re-rendered from JS state every rAF emits JS-driven Fabric commits that keep the render
// pipeline awake. Isolated in its own component so only this view re-renders. The banner sways whenever it is
// mounted, so the beat runs whenever motion is on.
function CanvasKeepAlive() {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setBeat((b) => b + 1);
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, transform: [{ translateX: beat % 2 }] }}
    />
  );
}

export function ClothBanner({
  image,
  width = 300,
  height = 200,
  cols = 25,
  rows = 17,
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Cloth banner",
  style,
}: ClothBannerProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;

  const canvasW = width + PAD_X * 2;
  const canvasH = height + PAD_TOP + PAD_BOTTOM;
  const cfg: ClothConfig = useMemo(
    () => ({
      cols,
      rows,
      spacingX: width / (cols - 1),
      spacingY: height / (rows - 1),
      originX: PAD_X,
      originY: PAD_TOP,
      perspective: 620,
      centerX: PAD_X + width / 2,
      centerY: PAD_TOP + height / 2,
    }),
    [width, height, cols, rows],
  );

  const opts = useMemo(() => CLOTH_DEFAULTS, []);
  const sim = useSharedValue<ClothState>(createCloth(cfg));
  // Frame clock: the sim mutates in place, so this primitive is the change
  // signal the mesh derived values subscribe to (the MosaicGallery pattern).
  const frame = useSharedValue(0);
  const pointer = useSharedValue<ClothPointer>({ x: 0, y: 0, active: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const ramp = useMemo(() => makeShadeRamp(), []);
  useEffect(() => () => ramp.dispose(), [ramp]);
  const latest = useRef({ reduce, onFeedback });
  latest.current = { reduce, onFeedback };

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
  useEffect(() => {
    slowM.value = slowMotion;
  }, [slowMotion, slowM]);
  useEffect(() => {
    reduceM.value = reduce;
    // Reduce Motion shows the banner flat: reset the cloth and stop stepping.
    if (reduce) sim.value = createCloth(cfg);
  }, [reduce, reduceM, sim, cfg]);
  // A size or grid change rebuilds the cloth from rest.
  useEffect(() => {
    sim.value = createCloth(cfg);
  }, [sim, cfg]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.reduce,
        onPanResponderGrant: (evt) => {
          pointer.value = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY, active: 1 };
          latest.current.onFeedback?.("grab");
        },
        onPanResponderMove: (evt) => {
          pointer.value = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY, active: 1 };
        },
        onPanResponderRelease: () => {
          pointer.value = { x: 0, y: 0, active: 0 };
          latest.current.onFeedback?.("release");
        },
        onPanResponderTerminate: () => {
          pointer.value = { x: 0, y: 0, active: 0 };
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [pointer],
  );

  useFrameCallback((info) => {
    const s = sim.value;
    if (reduceM.value) return;
    if (pointer.value.active && s.grabbed < 0) {
      s.grabbed = pickParticle(s, cfg, pointer.value.x, pointer.value.y, opts.grabRadius + 14);
      if (s.grabbed >= 0) s.grabZ = s.pos[s.grabbed * 3 + 2];
    }
    if (!pointer.value.active && s.grabbed >= 0) s.grabbed = -1;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepClothFixed(s, cfg, dt * (slowM.value ? 0.25 : 1), pointer.value, opts);
    frame.value = frame.value + 1;
  });

  const indices = useMemo(() => clothIndices(cfg), [cfg]);
  const uv = useMemo(() => clothUV(cfg, image.width(), image.height()), [cfg, image]);

  const mesh = useDerivedValue(() => {
    frame.value; // recompute on every stepped frame; the sim mutates in place
    const xy: { x: number; y: number }[] = [];
    const shade: number[] = [];
    computeMesh(sim.value, cfg, xy, shade, opts);
    return { xy, shade };
  });
  const vertices = useDerivedValue(() => mesh.value.xy);
  const shadeTextures = useDerivedValue(() =>
    mesh.value.shade.map((v) => ({ x: Math.max(0.5, Math.min(255.5, v * 255 + 0.5)), y: 0.5 })),
  );

  return (
    <View
      style={[{ width: canvasW, height: canvasH }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: canvasW, height: canvasH }}>
        <Vertices vertices={vertices} textures={uv} indices={indices} mode="triangles">
          <ImageShader image={image} tx="clamp" ty="clamp" sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }} />
        </Vertices>
        <Vertices vertices={vertices} textures={shadeTextures} indices={indices} mode="triangles">
          <ImageShader image={ramp} tx="clamp" ty="clamp" sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }} />
        </Vertices>
        <Group>
          <Circle cx={cfg.originX} cy={cfg.originY} r={7} color="#2c4a37" />
          <Circle cx={cfg.originX} cy={cfg.originY} r={3} color="#e9dfc8" />
          <Circle cx={cfg.originX + width} cy={cfg.originY} r={7} color="#2c4a37" />
          <Circle cx={cfg.originX + width} cy={cfg.originY} r={3} color="#e9dfc8" />
        </Group>
      </Canvas>
    </View>
  );
}
