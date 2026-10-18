import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Circle, Points, RoundedRect } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import {
  PENDULUM_DEFAULTS,
  bobPositions,
  createPendulum,
  restPendulum,
  stepPendulumFixed,
  trailIndex,
  type PendulumConfig,
  type PendulumPointer,
  type PendulumState,
} from "./pendulumMath";
import {
  BOB_RADIUS,
  ELBOW_TRAIL,
  PENDULUM_ARM,
  PENDULUM_BACKGROUND,
  PENDULUM_BOB,
  PENDULUM_H,
  PENDULUM_ORIGIN_X,
  PENDULUM_ORIGIN_Y,
  PENDULUM_PX_PER_M,
  PENDULUM_W,
  TIP_TRAIL,
  TRAIL_BUCKETS,
  TRAIL_LAYERS,
  trailStyle,
  type TrailSpec,
} from "./pendulumDesign";

export type ChaosPendulumProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "grab" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

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

type TrailProps = {
  sim: SharedValue<PendulumState>;
  frame: SharedValue<number>;
  tip: boolean;
  bucket: number;
  spec: TrailSpec;
  layers: number;
};

function TrailBucket({ sim, frame, tip, bucket, spec, layers }: TrailProps) {
  const length = PENDULUM_DEFAULTS.trailLength;
  const per = length / TRAIL_BUCKETS;
  const style = trailStyle(spec, bucket, TRAIL_BUCKETS);
  const points = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    const buf = tip ? s.trail2 : s.trail1;
    const out: { x: number; y: number }[] = [];
    for (let k = bucket * per; k <= (bucket + 1) * per; k++) {
      const i = trailIndex(s, length, k);
      if (i < 0) break;
      out.push({ x: buf[i * 2], y: buf[i * 2 + 1] });
    }
    if (out.length < 2) return [{ x: -20, y: -20 }, { x: -20, y: -20 }];
    return out;
  });
  const shown = TRAIL_LAYERS.slice(TRAIL_LAYERS.length - layers);
  return (
    <>
      {shown.map((layer) => (
        <Points
          key={layer.width}
          points={points}
          mode="polygon"
          color={style.color}
          opacity={Math.min(1, layer.alpha * style.alpha)}
          style="stroke"
          strokeWidth={layer.width}
          strokeCap="butt"
          strokeJoin="round"
        />
      ))}
    </>
  );
}

export function ChaosPendulum({
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Chaos pendulum",
  style,
}: ChaosPendulumProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const cfg: PendulumConfig = useMemo(
    () => ({ originX: PENDULUM_ORIGIN_X, originY: PENDULUM_ORIGIN_Y, pixelsPerMeter: PENDULUM_PX_PER_M }),
    [],
  );
  const opts = useMemo(() => PENDULUM_DEFAULTS, []);
  const sim = useSharedValue<PendulumState>(createPendulum(opts));
  const frame = useSharedValue(0);
  const pointer = useSharedValue<PendulumPointer>({ x: 0, y: 0, active: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
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
    const fresh = createPendulum(opts);
    if (reduce) restPendulum(fresh, 0.55, 0.85);
    sim.value = fresh;
    frame.value = frame.value + 1;
  }, [reduce, reduceM, sim, frame, opts]);

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
    if (reduceM.value) return;
    const s = sim.value;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepPendulumFixed(s, cfg, dt * (slowM.value ? 0.25 : 1), pointer.value, opts);
    frame.value = frame.value + 1;
  });

  const bobs = useDerivedValue(() => {
    frame.value;
    const out = [0, 0, 0, 0];
    bobPositions(sim.value, cfg, opts, out);
    return out;
  });
  const arm = useDerivedValue(() => [
    { x: cfg.originX, y: cfg.originY },
    { x: bobs.value[0], y: bobs.value[1] },
    { x: bobs.value[2], y: bobs.value[3] },
  ]);
  const x1 = useDerivedValue(() => bobs.value[0]);
  const y1 = useDerivedValue(() => bobs.value[1]);
  const x2 = useDerivedValue(() => bobs.value[2]);
  const y2 = useDerivedValue(() => bobs.value[3]);
  const buckets = useMemo(() => Array.from({ length: TRAIL_BUCKETS }, (_, i) => i), []);

  return (
    <View
      style={[{ width: PENDULUM_W, height: PENDULUM_H }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: PENDULUM_W, height: PENDULUM_H }}>
        <RoundedRect x={0} y={0} width={PENDULUM_W} height={PENDULUM_H} r={18} color={PENDULUM_BACKGROUND} />
        {!reduce
          ? buckets.map((b) => (
              <TrailBucket key={`e${b}`} sim={sim} frame={frame} tip={false} bucket={b} spec={ELBOW_TRAIL} layers={2} />
            ))
          : null}
        {!reduce
          ? buckets.map((b) => (
              <TrailBucket key={`t${b}`} sim={sim} frame={frame} tip bucket={b} spec={TIP_TRAIL} layers={3} />
            ))
          : null}
        <Points points={arm} mode="polygon" color={PENDULUM_ARM} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />
        <Circle cx={PENDULUM_ORIGIN_X} cy={PENDULUM_ORIGIN_Y} r={5} color={PENDULUM_ARM} />
        <Circle cx={x1} cy={y1} r={BOB_RADIUS + 7} color={ELBOW_TRAIL.head} opacity={0.12} />
        <Circle cx={x1} cy={y1} r={BOB_RADIUS + 3} color={ELBOW_TRAIL.head} opacity={0.25} />
        <Circle cx={x1} cy={y1} r={BOB_RADIUS} color={PENDULUM_BOB} />
        <Circle cx={x2} cy={y2} r={BOB_RADIUS + 7} color={TIP_TRAIL.head} opacity={0.14} />
        <Circle cx={x2} cy={y2} r={BOB_RADIUS + 3} color={TIP_TRAIL.head} opacity={0.3} />
        <Circle cx={x2} cy={y2} r={BOB_RADIUS} color={PENDULUM_BOB} />
      </Canvas>
    </View>
  );
}
