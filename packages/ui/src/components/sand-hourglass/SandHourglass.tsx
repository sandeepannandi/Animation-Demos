import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Fill, Path, Points, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  GRAIN_COUNT, HOUR_BOT, HOUR_BOT_HALF, HOUR_CX, HOUR_TOP, HOUR_TOP_HALF,
  SAND_DEFAULTS, createSand, hourGlassOutline, sandDragTo, sandFlip, sandReleaseDrag, stepSandFrame, type SandState,
} from "./sandMath";
import { HOUR_BACKGROUND, HOUR_GLASS, HOUR_GLASS_SOFT, HOUR_H, HOUR_PLATE, HOUR_PLATE_EDGE, HOUR_W, SAND_SHADES, SAND_STROKES } from "./sandDesign";

export type SandHourglassProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  /** Ask the component to turn over; pass a changing counter to retrigger. */
  flipSignal?: number;
  onFeedback?: (event: "touch" | "release" | "flip") => void;
  label?: string;
  style?: ViewStyle;
};

type Pointer = { x: number; y: number; down: number; seq: number; vy: number };

// Glass silhouette: the exact outline the physics uses, drawn as one path.
function glassPath() {
  const pts = hourGlassOutline();
  const p = Skia.Path.Make();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.close();
  return p;
}
const GLASS = glassPath();

// Android stops presenting a canvas whose only change is internal on an idle
// screen. A 1 px layout change every frame keeps it drawing.
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

type BucketProps = { sim: { value: SandState }; frame: { value: number }; shade: number; big: number };

function GrainBucket({ sim, frame, shade, big }: BucketProps) {
  const points = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < s.n; i++) {
      if (s.shade[i] === shade && s.big[i] === big) out.push({ x: s.x[i], y: s.y[i] });
    }
    if (out.length === 0) return [{ x: -20, y: -20 }];
    return out;
  });
  return (
    <Points
      points={points}
      mode="points"
      color={SAND_SHADES[shade]}
      style="stroke"
      strokeWidth={SAND_STROKES[big]}
      strokeCap="round"
    />
  );
}

export function SandHourglass({
  slowMotion = false,
  reducedMotion,
  flipSignal = 0,
  onFeedback,
  label = "A glass hourglass filled with sand. Drag to tilt gravity, fling or ask to flip it over",
  style,
}: SandHourglassProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const opts = useMemo(() => SAND_DEFAULTS, []);
  const sim = useSharedValue<SandState>(createSand(SAND_DEFAULTS, GRAIN_COUNT));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<Pointer>({ x: 0, y: 0, down: 0, seq: 0, vy: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
  const flipM = useSharedValue(0);
  const latest = useRef({ reduce, onFeedback, seq: 0 });
  latest.current.reduce = reduce;
  latest.current.onFeedback = onFeedback;

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
    if (flipSignal !== 0) flipM.value = flipSignal;
  }, [flipSignal, flipM]);
  useEffect(() => {
    reduceM.value = reduce;  // eslint-disable-next-line react-hooks/exhaustive-deps
    if (reduce) {
      // Still picture: spawn the sand already settled in the lower bulb.
      sim.value = createSand(opts, GRAIN_COUNT, 20261020, true);
      frame.value = frame.value + 1;
    } else if (sim.value.settled) {
      sim.value = createSand(opts, GRAIN_COUNT);
    }
  }, [reduce, reduceM, sim, frame, opts]);

  const pan = useMemo(() => {
    const send = (x: number, y: number, down: number, vy: number) => {
      latest.current.seq += 1;
      pointer.value = { x, y, down, seq: latest.current.seq, vy };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.reduce,
      onPanResponderGrant: (evt) => {
        send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1, 0);
        latest.current.onFeedback?.("touch");
      },
      onPanResponderMove: (evt, gesture) => {
        send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1, gesture.vy);
      },
      onPanResponderRelease: (evt, gesture) => {
        send(pointer.value.x, pointer.value.y, 0, gesture.vy);
        latest.current.onFeedback?.("release");
      },
      onPanResponderTerminate: () => {
        send(pointer.value.x, pointer.value.y, 0, 0);
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [pointer]);

  useFrameCallback((info) => {
    if (reduceM.value) return;
    const s = sim.value;
    const p = pointer.value;
    if (flipM.value !== 0) {
      flipM.value = 0;
      sandFlip(s);
    }
    if (p.seq !== s.seq) {
      if (p.down) {
        sandDragTo(s, p.x, p.y);
      } else {
        sandReleaseDrag(s);
        // A fast vertical fling turns the hourglass over.
        if (Math.abs(p.vy) > 1.1) sandFlip(s);
      }
      s.seq = p.seq;
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepSandFrame(s, dt * (slowM.value ? 0.25 : 1), opts);
    frame.value = frame.value + 1;
  });

  return (
    <View
      style={[{ width: HOUR_W, height: HOUR_H, borderRadius: 18, overflow: "hidden", backgroundColor: HOUR_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: HOUR_W, height: HOUR_H }}>
        <Fill color={HOUR_BACKGROUND} />
        {/* top and bottom plates */}
        <Path path={GLASS} color={HOUR_GLASS_SOFT} style="fill" />
        {[0, 1, 2, 3].map((shade) =>
          [0, 1].map((big) => (
            <GrainBucket key={`${shade}-${big}`} sim={sim} frame={frame} shade={shade} big={big} />
          )),
        )}
        <Path path={GLASS} color={HOUR_GLASS} style="stroke" strokeWidth={3.5} strokeJoin="round" />
      </Canvas>
      {/* plates drawn as native views so they sit above the glass edges */}
      <View pointerEvents="none" style={{ position: "absolute", left: HOUR_CX - HOUR_TOP_HALF - 10, top: HOUR_TOP - 12, width: (HOUR_TOP_HALF + 10) * 2, height: 12, borderRadius: 6, backgroundColor: HOUR_PLATE, borderBottomWidth: 2, borderBottomColor: HOUR_PLATE_EDGE }} />
      <View pointerEvents="none" style={{ position: "absolute", left: HOUR_CX - HOUR_BOT_HALF - 10, top: HOUR_BOT, width: (HOUR_BOT_HALF + 10) * 2, height: 12, borderRadius: 6, backgroundColor: HOUR_PLATE, borderTopWidth: 2, borderTopColor: HOUR_PLATE_EDGE }} />
    </View>
  );
}
