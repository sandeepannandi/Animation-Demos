import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, PanResponder, View, type ViewStyle } from "react-native";
import { Canvas, Fill, Path, Points, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";
import {
  STRING_COUNT, STR_DX, STR_H, STR_NODES, STR_W, STR_X0, STR_X1,
  createStrings, stringNodeGlow, stringY, stringsDragTo, stringsRelease, stepStringsFrame,
  type StringsState,
} from "./stringMath";
import { STR_BACKGROUND, STR_BOARD_EDGE, STR_DOT, STR_END_BAR, STR_PIN, STRING_SHADES } from "./stringDesign";

export type PluckedStringsProps = {
  slowMotion?: boolean;
  reducedMotion?: boolean;
  onFeedback?: (event: "touch" | "release") => void;
  label?: string;
  style?: ViewStyle;
};

type Pointer = { x: number; y: number; down: number; seq: number };

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

const BOARD = (() => {
  const p = Skia.Path.Make();
  p.addRRect(Skia.RRectXY(Skia.XYWHRect(8, 60, STR_W - 8, STR_H - 90), 14, 14));
  return p;
})();

const PINS = (() => {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k < STRING_COUNT; k++) {
    pts.push({ x: STR_X0 - 5, y: stringY(k) });
    pts.push({ x: STR_X1 + 5, y: stringY(k) });
  }
  return pts;
})();

type BucketProps = { sim: { value: StringsState }; frame: { value: number }; shade: number };

function StringBucket({ sim, frame, shade }: BucketProps) {
  const points = useDerivedValue(() => {
    frame.value;
    const s = sim.value;
    const out: { x: number; y: number }[] = [];
    for (let k = 0; k < s.n; k++) {
      const base = k * STR_NODES;
      const y0 = stringY(k);
      for (let i = 0; i < STR_NODES; i++) {
        const glow = stringNodeGlow(s, k, i);
        const bucket = Math.min(3, Math.floor((1 - glow) * 4));
        if (bucket === shade) out.push({ x: STR_X0 + i * STR_DX, y: y0 + s.u[base + i] });
      }
    }
    if (out.length === 0) return [{ x: -20, y: -20 }];
    return out;
  });
  return (
    <Points
      points={points}
      mode="points"
      color={STRING_SHADES[shade]}
      style="stroke"
      strokeWidth={STR_DOT}
      strokeCap="round"
    />
  );
}

export function PluckedStrings({
  slowMotion = false,
  reducedMotion,
  onFeedback,
  label = "Five copper strings pinned at both ends. Drag a string sideways and let go to pluck it; waves travel, reflect off the ends and fade",
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
      if (p.down) {
        stringsDragTo(s, p.x, p.y);
      } else {
        stringsRelease(s);
      }
      s.seq = p.seq;
    }
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16.7) / 1000;
    stepStringsFrame(s, dt * (slowM.value ? 0.25 : 1));
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
        <Path path={BOARD} color={STR_BOARD_EDGE} style="fill" />
        {/* fixed-end bars behind the pins */}
        <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(STR_X0 - 9, 74, 7, 232))} color={STR_END_BAR} style="fill" />
        <Path path={Skia.Path.Make().addRect(Skia.XYWHRect(STR_X1 + 2, 74, 7, 232))} color={STR_END_BAR} style="fill" />
        {[0, 1, 2, 3].map((shade) => (
          <StringBucket key={shade} sim={sim} frame={frame} shade={shade} />
        ))}
        <Points points={PINS} mode="points" color={STR_PIN} style="stroke" strokeWidth={5} strokeCap="round" />
      </Canvas>
    </View>
  );
}
