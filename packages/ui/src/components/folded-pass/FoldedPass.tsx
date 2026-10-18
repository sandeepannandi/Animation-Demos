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
  Group,
  ImageShader,
  Skia,
  Vertices,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import {
  PANELS,
  atlasUV,
  foldMesh,
  makeFoldGrid,
  releaseTarget,
  scrub,
  type FoldMesh,
  type Point,
} from "./foldMath";

export type FoldedPassProps = {
  /** Frozen paper: fronts in the left half, backs in the right half, three panels stacked top to bottom. */
  atlas: SkImage;
  /** Width of the pass and height of ONE panel, in layout points. The component is width x (3 * panelHeight). */
  width: number;
  panelHeight: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** The real, live content at rest, laid out at width x (3 * panelHeight). Hidden while the paper moves. */
  children?: React.ReactNode;
  slowMotion?: boolean;
  reducedMotion?: boolean;
  style?: ViewStyle;
};

const PAD = 18;

// One-pixel-tall lookup strip: the pixel at x is black with alpha (1 - x / 255). The shading pass maps each vertex's
// shade into this strip as a texture coordinate, so the GPU interpolates shade across the triangle and the strip turns
// it into a darkening overlay. (Per-vertex colors are not used: they do not combine with an image shader on web.)
function makeRamp() {
  const surface = Skia.Surface.MakeOffscreen(256, 1);
  if (!surface) throw new Error("Unable to prepare the shading ramp");
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
  if (!copy) throw new Error("Unable to copy the shading ramp");
  return copy;
}

function Panel({
  index,
  mesh,
  uv,
  indices,
  atlas,
  ramp,
}: {
  index: number;
  mesh: SharedValue<FoldMesh>;
  uv: Point[];
  indices: number[];
  atlas: SkImage;
  ramp: SkImage;
}) {
  const aw = atlas.width(),
    ah = atlas.height();
  const vertices = useDerivedValue(() => mesh.value.panels[index].pos);
  const textures = useDerivedValue(() => atlasUV(index, mesh.value.panels[index].front, uv, aw, ah));
  const shadeTextures = useDerivedValue(() =>
    mesh.value.panels[index].shade.map((s) => ({ x: Math.max(0.5, Math.min(255.5, s * 255 + 0.5)), y: 0.5 })),
  );
  return (
    <>
      <Vertices vertices={vertices} textures={textures} indices={indices} mode="triangles">
        <ImageShader image={atlas} tx="clamp" ty="clamp" />
      </Vertices>
      <Vertices vertices={vertices} textures={shadeTextures} indices={indices} mode="triangles">
        <ImageShader image={ramp} tx="clamp" ty="clamp" />
      </Vertices>
    </>
  );
}

export function FoldedPass({
  atlas,
  width,
  panelHeight,
  expanded,
  onExpandedChange,
  children,
  slowMotion = false,
  reducedMotion,
  style,
}: FoldedPassProps) {
  const total = panelHeight * PANELS;
  const progress = useSharedValue(expanded ? 1 : 0);
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = !!reducedMotion || systemReduce;
  const [moving, setMoving] = useState(false);
  const [open, setOpen] = useState(expanded);
  const grid = useMemo(() => makeFoldGrid(), []);
  const ramp = useMemo(() => makeRamp(), []);
  useEffect(() => () => ramp.dispose(), [ramp]);
  const mounted = useRef(true),
    dragging = useRef(false),
    movingRef = useRef(false),
    destination = useRef(expanded),
    revision = useRef(0),
    start = useRef(0);
  const latest = useRef({ slowMotion, reduce, onExpandedChange, panelHeight });
  latest.current = { slowMotion, reduce, onExpandedChange, panelHeight };

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted.current && setSystemReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduce);
    return () => {
      mounted.current = false;
      revision.current++;
      sub.remove();
      cancelAnimation(progress);
    };
  }, [progress]);

  const finish = (value: boolean, generation: number) => {
    if (!mounted.current || generation !== revision.current) return;
    movingRef.current = false;
    setOpen(value);
    setMoving(false);
  };
  const setMotion = (value: boolean) => {
    movingRef.current = value;
    setMoving(value);
  };
  // Spring toward an end. A slow-motion spring is the same spring stretched four times in time.
  const settle = (to: boolean, velocity = 0) => {
    const generation = ++revision.current;
    destination.current = to;
    cancelAnimation(progress);
    const end = to ? 1 : 0;
    if (latest.current.reduce) {
      progress.value = end;
      finish(to, generation);
      return;
    }
    const k = latest.current.slowMotion ? 4 : 1;
    setMotion(true);
    progress.value = withSpring(
      end,
      {
        damping: 17 / k,
        stiffness: 170 / (k * k),
        mass: 1,
        velocity: velocity / k,
        overshootClamping: false,
        energyThreshold: 1e-5,
      },
      (done) => {
        if (done) runOnJS(finish)(to, generation);
      },
    );
  };
  // Controlled prop: reverse from wherever the paper is.
  useEffect(() => {
    if (destination.current !== expanded) settle(expanded);
    else if (!movingRef.current) setOpen(expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);
  // Changing speed or Reduce Motion mid-flight restarts the spring toward the same end.
  useEffect(() => {
    if (movingRef.current && !dragging.current) settle(destination.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slowMotion, reduce]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // At rest the live children keep their own touches; a vertical drag takes over. Mid-motion, any touch grabs the paper.
        onStartShouldSetPanResponder: () => movingRef.current,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !latest.current.reduce && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
        onPanResponderGrant: () => {
          revision.current++;
          cancelAnimation(progress);
          dragging.current = true;
          start.current = progress.value;
          setMotion(true);
        },
        onPanResponderMove: (_, g) => {
          if (!dragging.current) return;
          progress.value = scrub(start.current, g.dy, latest.current.panelHeight * 2.4);
        },
        onPanResponderRelease: (_, g) => {
          if (!dragging.current) return;
          dragging.current = false;
          const next = Math.abs(g.dy) < 4 ? !destination.current : releaseTarget(progress.value, g.vy);
          // Hand the finger's speed to the spring so release feels continuous (u per second).
          const speed = (g.vy * 1000) / (latest.current.panelHeight * 2.4);
          settle(next, Math.abs(g.dy) < 4 ? 0 : speed);
          latest.current.onExpandedChange(next);
        },
        onPanResponderTerminate: () => {
          if (!dragging.current) return;
          dragging.current = false;
          settle(destination.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [progress],
  );

  const mesh = useDerivedValue(() => foldMesh(progress.value, width, panelHeight));
  if (width <= 0 || panelHeight <= 0) return null;
  const restHeight = open ? total : panelHeight;
  return (
    <View style={[{ width, height: total }, style]} {...responder.panHandlers}>
      <View
        style={{ width, height: restHeight, overflow: "hidden", opacity: moving ? 0 : 1 }}
        pointerEvents={moving ? "none" : "auto"}
        accessibilityElementsHidden={moving}
        importantForAccessibility={moving ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {!reduce ? (
        <Canvas
          pointerEvents="none"
          style={{ position: "absolute", left: -PAD, top: -PAD, width: width + PAD * 2, height: total + PAD * 2, opacity: moving ? 1 : 0 }}
        >
          <Group transform={[{ translateX: PAD }, { translateY: PAD }]}>
            <Panel index={2} mesh={mesh} uv={grid.uv} indices={grid.indices} atlas={atlas} ramp={ramp} />
            <Panel index={1} mesh={mesh} uv={grid.uv} indices={grid.indices} atlas={atlas} ramp={ramp} />
            <Panel index={0} mesh={mesh} uv={grid.uv} indices={grid.indices} atlas={atlas} ramp={ramp} />
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}
