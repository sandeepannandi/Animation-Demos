import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import {
  Canvas, Circle, DashPathEffect, Fill, Line, LinearGradient, Path, RadialGradient, RoundedRect, Skia, vec,
} from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  STRING_COUNT, STR_DX, STR_H, STR_LENGTH, STR_NODES, STR_POSES, STR_SLOW, STR_W, STR_X0,
  createStrings, stepStringsFrame, stringPoseAlpha, stringY, stringsDragTo, stringsRelease,
  type StringsState,
} from "./stringMath";
import {
  STR_BACKGROUND, STR_COPPER, STR_COPPER_LIGHT, STR_PLAIN, STR_PLAIN_LIGHT, STR_SCENE, STR_SHADOW, STR_WIDTH, STR_WOUND,
  type StrFill, type StrPrim,
} from "./stringDesign";

export type PluckedStringsProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "touch" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

type Pointer = { x: number; y: number; down: number; seq: number };
type Sim = { value: StringsState };
type Frame = { value: number };

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

function gradientChild(f: StrFill) {
  if (typeof f === "string") return null;
  const colors = f.stops.map((s) => s[1]);
  const positions = f.stops.map((s) => s[0]);
  if ("lin" in f) {
    return <LinearGradient start={vec(f.lin[0], f.lin[1])} end={vec(f.lin[2], f.lin[3])} colors={colors} positions={positions} />;
  }
  return <RadialGradient c={vec(f.rad[0], f.rad[1])} r={f.rad[2]} colors={colors} positions={positions} />;
}

function ScenePrim({ p }: { p: StrPrim }) {
  if (p.k === "rect") {
    const solid = typeof p.fill === "string" ? p.fill : undefined;
    return (
      <RoundedRect x={p.x} y={p.y} width={p.w} height={p.h} r={p.r ?? 0} color={solid}>
        {gradientChild(p.fill)}
      </RoundedRect>
    );
  }
  if (p.k === "circle") {
    const solid = typeof p.fill === "string" ? p.fill : undefined;
    return (
      <Circle cx={p.x} cy={p.y} r={p.r} color={solid}>
        {gradientChild(p.fill)}
      </Circle>
    );
  }
  if (p.k === "ring") {
    return <Circle cx={p.x} cy={p.y} r={p.r} color={p.color} style="stroke" strokeWidth={p.w} />;
  }
  return <Line p1={vec(p.x1, p.y1)} p2={vec(p.x2, p.y2)} color={p.color} strokeWidth={p.w} />;
}

// One blur pose of one string as a smooth path, shifted by (dx, dy).
function poseStroke(s: StringsState, p: number, k: number, dx: number, dy: number) {
  'worklet';
  const path = Skia.Path.Make();
  if (p >= s.poseN) return path;
  const base = (p * STRING_COUNT + k) * STR_NODES;
  const y0 = stringY(k) + dy;
  path.moveTo(STR_X0 + dx, y0 + s.fy[base]);
  for (let i = 1; i < STR_NODES - 1; i++) {
    const x = STR_X0 + i * STR_DX + dx;
    const y = y0 + s.fy[base + i];
    const xn = STR_X0 + (i + 1) * STR_DX + dx;
    const yn = y0 + s.fy[base + i + 1];
    path.quadTo(x, y, (x + xn) / 2, (y + yn) / 2);
  }
  path.lineTo(STR_X0 + (STR_NODES - 1) * STR_DX + dx, y0 + s.fy[base + STR_NODES - 1]);
  return path;
}

type PoseProps = { sim: Sim; frame: Frame; k: number; p: number };

function PoseShadow({ sim, frame, k, p }: PoseProps) {
  const path = useDerivedValue(() => {
    frame.value;
    return poseStroke(sim.value, p, k, 1.5, 4);
  });
  const opacity = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    if (p >= s.poseN) return 0;
    return (s.poseN === 1 ? 1 : 1 - Math.pow(0.05, 1 / Math.ceil(s.poseN / 3))) * 0.55;
  });
  return <Path path={path} color={STR_SHADOW} style="stroke" strokeWidth={STR_WIDTH[k] * 1.5} strokeCap="round" strokeJoin="round" opacity={opacity} />;
}

function PoseCore({ sim, frame, k, p }: PoseProps) {
  const path = useDerivedValue(() => {
    frame.value;
    return poseStroke(sim.value, p, k, 0, 0);
  });
  const opacity = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    return p >= s.poseN ? 0 : stringPoseAlpha(s);
  });
  return <Path path={path} color={STR_WOUND[k] ? STR_COPPER : STR_PLAIN} style="stroke" strokeWidth={STR_WIDTH[k]} strokeCap="round" strokeJoin="round" opacity={opacity} />;
}

function PoseLight({ sim, frame, k, p }: PoseProps) {
  const path = useDerivedValue(() => {
    frame.value;
    return poseStroke(sim.value, p, k, 0, -STR_WIDTH[k] * 0.2);
  });
  const opacity = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    return p >= s.poseN ? 0 : stringPoseAlpha(s) * 0.9;
  });
  return <Path path={path} color={STR_WOUND[k] ? STR_COPPER_LIGHT : STR_PLAIN_LIGHT} style="stroke" strokeWidth={Math.max(0.7, STR_WIDTH[k] * 0.34)} strokeCap="round" strokeJoin="round" opacity={opacity} />;
}

// The envelope the string sweeps within the frame, lightly filled.
function StringBand({ sim, frame, k }: { sim: Sim; frame: Frame; k: number }) {
  const path = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    const path = Skia.Path.Make();
    if (s.blur[k] <= 0.8) return path;
    const lo = k * STR_NODES;
    const y0 = stringY(k);
    const w = STR_WIDTH[k];
    path.moveTo(STR_X0, y0 + s.hi[lo] - w / 2);
    for (let i = 1; i < STR_NODES; i++) path.lineTo(STR_X0 + i * STR_DX, y0 + s.hi[lo + i] - w / 2);
    for (let i = STR_NODES - 1; i >= 0; i--) path.lineTo(STR_X0 + i * STR_DX, y0 + s.lo[lo + i] + w / 2);
    path.close();
    return path;
  });
  const opacity = useDerivedValue(() => {
    frame.value;
    return Math.min(0.2, sim.value.blur[k] * 0.012);
  });
  return <Path path={path} color={STR_WOUND[k] ? STR_COPPER : STR_PLAIN} style="fill" opacity={opacity} />;
}

// Copper winding: only readable while a wound string is nearly still.
function StringWinding({ sim, frame, k }: { sim: Sim; frame: Frame; k: number }) {
  const path = useDerivedValue(() => {
    frame.value;
    return poseStroke(sim.value, 0, k, 0, 0);
  });
  const opacity = useDerivedValue(() => {
    frame.value;
    return Math.max(0, 1 - sim.value.blur[k] / 0.9) * 0.55;
  });
  return (
    <Path path={path} color="#3d1e08" style="stroke" strokeWidth={STR_WIDTH[k] * 0.95} opacity={opacity}>
      <DashPathEffect intervals={[0.7, 1.7]} />
    </Path>
  );
}

function FingerPad({ sim, frame }: { sim: Sim; frame: Frame }) {
  const cx = useDerivedValue(() => {
    frame.value;
    return STR_X0 + sim.value.grabBeta * STR_LENGTH;
  });
  const cy = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    return s.grabString >= 0 ? stringY(s.grabString) + s.grabD : -50;
  });
  return (
    <>
      <Circle cx={cx} cy={cy} r={15} color="rgba(255, 240, 225, 0.10)" />
      <Circle cx={cx} cy={cy} r={8} color="rgba(255, 240, 225, 0.14)" />
    </>
  );
}

const POSE_INDEX = Array.from({ length: STR_POSES }, (_, p) => p);
const STRING_INDEX = Array.from({ length: STRING_COUNT }, (_, k) => k);

export function PluckedStrings({
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Five copper guitar strings over a soundhole. Drag a string sideways and let go to pluck it, or swipe across to strum; they ring at real pitch and fade",
  style,
}: PluckedStringsProps) {
  const [systemReduce, setSystemReduce] = useState(false);
  const reduce = reducedMotion ?? systemReduce;
  const sim = useSharedValue<StringsState>(createStrings());
  const frame = useSharedValue(0);
  const pointer = useSharedValue<Pointer>({ x: 0, y: 0, down: 0, seq: 0 });
  const slowM = useSharedValue(false);
  const reduceM = useSharedValue(false);
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
    reduceM.value = reduce;
    if (reduce) {
      sim.value = createStrings(true);
      frame.value = frame.value + 1;
    } else if (sim.value.settled) {
      sim.value = createStrings();
    }
  }, [reduce, reduceM, sim, frame]);

  const pan = useMemo(() => {
    const send = (x: number, y: number, down: number) => {
      latest.current.seq += 1;
      pointer.value = { x, y, down, seq: latest.current.seq };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.reduce,
      onPanResponderGrant: (evt) => {
        send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1);
        latest.current.onFeedback?.("touch");
      },
      onPanResponderMove: (evt) => {
        send(evt.nativeEvent.locationX, evt.nativeEvent.locationY, 1);
      },
      onPanResponderRelease: () => {
        send(pointer.value.x, pointer.value.y, 0);
        latest.current.onFeedback?.("release");
      },
      onPanResponderTerminate: () => {
        send(pointer.value.x, pointer.value.y, 0);
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [pointer]);

  useFrameCallback((info) => {
    if (reduceM.value) return;
    const s = sim.value;
    const p = pointer.value;
    if (p.seq !== s.seq) {
      s.seq = p.seq;
      if (!p.down) stringsRelease(s);
    }
    if (p.down) stringsDragTo(s, p.x, p.y);
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepStringsFrame(s, dt * (slowM.value ? STR_SLOW : 1));
    frame.value = frame.value + 1;
  });

  return (
    <View
      style={[{ width: STR_W, height: STR_H, borderRadius: 18, overflow: "hidden", backgroundColor: STR_BACKGROUND }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
      {...pan.panHandlers}
    >
      {!reduce ? <CanvasKeepAlive /> : null}
      <Canvas pointerEvents="none" style={{ width: STR_W, height: STR_H }}>
        <Fill color={STR_BACKGROUND} />
        {STR_SCENE.map((p, i) => (
          <ScenePrim key={i} p={p} />
        ))}
        {STRING_INDEX.map((k) => (
          <React.Fragment key={k}>
            {[0, 3, 6, 9].map((p) => (
              <PoseShadow key={`s${p}`} sim={sim} frame={frame} k={k} p={p} />
            ))}
            <StringBand sim={sim} frame={frame} k={k} />
            {POSE_INDEX.map((p) => (
              <PoseCore key={`c${p}`} sim={sim} frame={frame} k={k} p={p} />
            ))}
            {POSE_INDEX.map((p) => (
              <PoseLight key={`l${p}`} sim={sim} frame={frame} k={k} p={p} />
            ))}
            {STR_WOUND[k] ? <StringWinding sim={sim} frame={frame} k={k} /> : null}
          </React.Fragment>
        ))}
        <FingerPad sim={sim} frame={frame} />
      </Canvas>
    </View>
  );
}
